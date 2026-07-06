import { createClient } from '@supabase/supabase-js';
import { getRolesByToken, hasRole } from './_roles.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const json = (obj) => new Response(JSON.stringify(obj), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try { body = await req.json(); } catch (e) { return json({ status: 'error', detail: 'bad body' }); }

  // 역할 확인 — operator만 발행소 조회 허용
  const roleInfo = await getRolesByToken(supabase, body.token);
  if (!roleInfo.ok) {
    return json({ status: 'error', detail: roleInfo.reason || 'auth failed' });
  }
  if (!hasRole(roleInfo.roles, 'operator')) {
    return json({ status: 'forbidden', detail: 'operator role required' });
  }

  const action = body.action || 'list';

  if (action === 'list') {
    // 전체 상태(초안·숨김 포함) 목록 — 서버라 RLS 우회
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, status, created_at')
      .order('created_at', { ascending: false });
    if (error) return json({ status: 'error', detail: error.message });
    return json({ status: 'ok', articles: data || [] });
  }

  if (action === 'get') {
    const id = body.id;
    if (!id) return json({ status: 'error', detail: 'id required' });
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return json({ status: 'error', detail: error.message });
    if (!data) return json({ status: 'error', detail: 'not found' });
    return json({ status: 'ok', article: data });
  }

  return json({ status: 'error', detail: 'unknown action' });
};
