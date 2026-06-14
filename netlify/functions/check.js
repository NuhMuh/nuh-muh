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

  let email;
  try {
    const body = await req.json();
    email = body.email;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ state: 'invalid' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: member, error } = await supabase
    .from('members')
    .select('status')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ state: 'error', detail: error.message }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 판정: 없으면 new, 있으면 그 status (initiate/keyholder)
  let state;
  if (!member) state = 'new';
  else state = member.status; // 'initiate' 또는 'keyholder'

  return new Response(JSON.stringify({ state: state }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
