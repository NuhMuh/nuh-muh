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
    return new Response(JSON.stringify({ status: 'error' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!email) {
    return new Response(JSON.stringify({ status: 'error' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // auth에서 이 이메일이 실제로 확인됐는지(email_confirmed_at) 검증 후 승격
  // — 아무나 confirm 호출로 승격 못 하게, auth 확인 상태를 신뢰의 근거로 삼음
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    return new Response(JSON.stringify({ status: 'error', detail: listErr.message }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = list.users.find(u => u.email === email);
  if (!user || !user.email_confirmed_at) {
    // 아직 확인 안 됨 → 승격 거부
    return new Response(JSON.stringify({ status: 'not_confirmed' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 확인됨 → members를 keyholder로 승격
  // 닉네임도 함께 받는다 — /welcome 성공 화면의 호명에 쓴다.
  // 원천은 DB(세션 metadata가 아니라). update().select()로 갱신 후 값을 그대로 받아
  // 추가 조회를 만들지 않는다.
  const { data: updated, error: updateErr } = await supabase
    .from('members')
    .update({ status: 'keyholder' })
    .eq('email', email)
    .select('nickname')
    .maybeSingle();

  if (updateErr) {
    return new Response(JSON.stringify({ status: 'error', detail: updateErr.message }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    status: 'ok',
    nickname: updated && updated.nickname ? updated.nickname : null,
  }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
