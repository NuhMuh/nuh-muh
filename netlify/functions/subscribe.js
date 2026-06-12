import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async (req) => {
  // POST만 허용
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

  // 이메일 형식 최소 검증
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await resend.emails.send({
      from: '너머 편집실 <desk@nuh-muh.com>',
      to: email,
      subject: '당신은 벽을 지나쳤습니다',
      text: '너머에 오신 것을 환영합니다.\n\n이 편지는 당신이 문을 지나쳤다는 표식입니다.\n곧, 책상 위에서 고른 이야기들이 당신에게 도착할 것입니다.\n\n— 너머 편집실',
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Send failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
