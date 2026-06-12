import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let email;
  try {
    const body = await req.json();
    email = body.email;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. DB에 먼저 줄 추가 시도
  const { error: dbError } = await supabase
    .from('members')
    .insert({ email: email });

  if (dbError) {
    // 중복(unique 위반)이면 코드 23505 — "이미 다녀가셨습니다"
    if (dbError.code === '23505') {
      return new Response(JSON.stringify({ status: 'already' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // 그 외 DB 오류 → 진짜 실패
    return new Response(JSON.stringify({ error: 'DB error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. 저장 성공 → 환영 메일 발송
  try {
    await resend.emails.send({
      from: 'Nuh-Muh <desk@nuh-muh.com>',
      to: email,
      subject: '당신은 벽을 지나쳤습니다',
      text: 'Nuh-Muh에 오신 것을 환영합니다.\n\n이 편지는 당신이 문을 지나쳤다는 표식입니다.\n곧, 책상 위에서 고른 이야기들이 당신에게 도착할 것입니다.\n\n— Nuh-Muh',
    });
  } catch (err) {
    // 메일은 실패해도 가입(DB)은 됐으므로 성공으로 처리
    // (메일 재발송은 추후 과제)
  }

  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
