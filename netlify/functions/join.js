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
  if (!nickname || !nickname.trim()) {
    return new Response(JSON.stringify({ status: 'no_nickname' }), {
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
    user_metadata: { nickname: nickname.trim() },
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
    .update({ status: 'pending', nickname: nickname.trim() })
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
  });
  if (mailError) {
    return new Response(JSON.stringify({ status: 'ok_no_mail', detail: mailError.message }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
