import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  let email, password, nickname;
  try {
    const body = await req.json();
    email = body.email;
    password = body.password;
    nickname = body.nickname;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 입력 검증
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ status: 'invalid_email' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!password || password.length < 8) {   // /room 비밀번호 변경(8자)과 통일
    return new Response(JSON.stringify({ status: 'weak_password' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  // 닉네임 정규화: 양끝 공백 제거 + 소문자 변환
  nickname = (nickname || '').trim().toLowerCase();
  if (!nickname) {
    return new Response(JSON.stringify({ status: 'no_nickname' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  // 형식: 영문소문자/숫자/한글/-/_ 만, 2~20자
  if (!/^[a-z0-9가-힣_-]{2,20}$/.test(nickname)) {
    return new Response(JSON.stringify({ status: 'bad_nickname' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  // 중복 검사
  const { data: nickDup } = await supabase
    .from('members')
    .select('id')
    .eq('nickname', nickname)
    .maybeSingle();
  if (nickDup) {
    return new Response(JSON.stringify({ status: 'nickname_taken' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. members에서 이메일 확인
  const { data: member, error: findError } = await supabase
    .from('members')
    .select('id, status')
    .eq('email', email)
    .maybeSingle();

  if (findError) {
    return new Response(JSON.stringify({ status: 'error', detail: findError.message }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 거미를 안 거친 사람 → 거부
  if (!member) {
    return new Response(JSON.stringify({ status: 'not_initiate' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 이미 keyholder → 거부
  if (member.status === 'keyholder') {
    return new Response(JSON.stringify({ status: 'already_keyholder' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // ★★⑦과 ⑧은 서로 다른 데이터를 본다 — 절대 다시 합치지 말 것.
  //   ⑦(위) = members.status 를 본다 → 진짜 정식 회원(already_keyholder)
  //   ⑧(아래) = Auth 계정 존재를 본다 → members는 pending인데 Auth에만 계정이 있는 상태
  //   즉 "이 주소로 이미 누군가 봉인을 정했다"이며, 그 사람은 keyholder가 아니다.
  //   과거 이 둘이 한 코드(already_keyholder)로 수렴해 "이미 열쇠를 가지셨습니다"라는
  //   사실과 다른 안내가 나갔다. 그것이 이 분리의 이유다.
  //
  // 판정은 createUser 호출 '전에' Auth를 조회해서 한다(사전 조회).
  // 실패 메시지 문자열 매칭은 Supabase가 문구를 바꾸면 에러 없이 조용히 다른 분기로
  // 빠지므로 쓰지 않는다. confirm.js가 이미 listUsers를 쓰는 선례가 있다.
  try {
    const { data: authList } = await supabase.auth.admin.listUsers();
    const exists = authList && authList.users
      ? authList.users.find(u => u.email === email)
      : null;
    if (exists) {
      return new Response(JSON.stringify({ status: 'account_exists' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (e) { /* 조회 실패는 아래 생성 단계의 이중 방어에 맡긴다 */ }

  // 2. Auth 계정 생성 (email_confirm:false 필수 — 안 적으면 자동 확인 처리됨)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: false,
    user_metadata: { nickname: nickname },
  });

  if (authError) {
    // 이중 방어: 사전 조회와 생성 사이의 경합(그 찰나에 계정이 생긴 경우).
    // 여기서도 같은 코드로 수렴시킨다.
    if (authError.message && authError.message.toLowerCase().includes('already')) {
      return new Response(JSON.stringify({ status: 'account_exists' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ status: 'error', detail: authError.message }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. members를 keyholder로 전환 + 닉네임 채움
  const { error: updateError } = await supabase
    .from('members')
    .update({ status: 'pending', nickname: nickname })
    .eq('id', member.id);

  if (updateError) {
    return new Response(JSON.stringify({ status: 'error', detail: updateError.message }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. 확인 메일 발송 (Supabase가 Resend SMTP 통해)
  const { error: mailError } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: { emailRedirectTo: 'https://nuh-muh.com/welcome' },
  });
  if (mailError) {
    // 실패를 조용히 흘리지 않는다 — mail_failures에 기록(운영자 인지용).
    // ★원칙: 사용자에게 나가는 모든 발송의 실패는 mail_failures에 남는다.
    //   새 발송 유형이 생기면 kind를 추가하고 실패 기록을 붙이는 것이 기본값이며,
    //   안 붙이는 경우에만 이유를 남긴다. (마틴 판결)
    // 이 실패는 사용자가 keyholder가 되지 못한 채 멈추는 가장 치명적인 경우다.
    try {
      await supabase.from('mail_failures').insert({
        email: email, kind: 'confirm', error: mailError.message,
      });
    } catch (logErr) {
      console.log('mail_failures insert error:', logErr.message);
    }
    return new Response(JSON.stringify({ status: 'ok_no_mail', detail: mailError.message }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
