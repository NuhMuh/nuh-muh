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
  if (!password || password.length < 6) {
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

  // 2. Auth 계정 생성 (서버에선 admin.createUser, email_confirm:true로 확인 처리)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: false,
    user_metadata: { nickname: nickname },
  });

  if (authError) {
    // 이미 auth에 있는 이메일이면
    if (authError.message && authError.message.toLowerCase().includes('already')) {
      return new Response(JSON.stringify({ status: 'already_keyholder' }), {
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
