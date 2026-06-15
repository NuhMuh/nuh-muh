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


  const { data, error: dbError } = await supabase
    .from('members')
    .insert({ email: email })
    .select();


  if (dbError) {
    if (dbError.code === '23505') {
      return new Response(JSON.stringify({ status: 'already' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'DB error', detail: dbError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await resend.emails.send({
      from: 'Nuh-Muh <desk@nuh-muh.com>',
      to: email,
      subject: '당신은 벽을 지나쳤습니다',
      text: 'Nuh-Muh에 오신 것을 환영합니다.\n\n이 편지는 당신이 문을 지나쳤다는 표식입니다.\n곧, 책상 위에서 고른 이야기들이 당신에게 도착할 것입니다.\n\n— Nuh-Muh',
    });
  } catch (err) {
    console.log('email error:', err.message);
  }

  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
