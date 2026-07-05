import { createClient } from '@supabase/supabase-js';
import { injectAnchors } from './_anchors.mjs';

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

  // 관리자 자물쇠 (save-article과 동일)
  let body;
  try { body = await req.json(); } catch (e) { return json({ status: 'error', detail: 'bad body' }); }
  const token = body.token;
  if (!token) return json({ status: 'error', detail: 'no token' });
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData || !userData.user) return json({ status: 'error', detail: 'invalid session' });
  if (userData.user.email !== process.env.ADMIN_EMAIL) return json({ status: 'forbidden', detail: 'not admin' });

  // dryRun: true면 저장 안 하고 미리보기만
  const dryRun = !!body.dryRun;

  // 모든 아티클 읽기
  const { data: articles, error: readErr } = await supabase
    .from('articles')
    .select('id, slug, body');
  if (readErr) return json({ status: 'error', detail: 'read failed: ' + readErr.message });

  const report = { total: articles.length, changed: 0, unchanged: 0, errors: [], details: [] };

  for (const art of articles) {
    const before = art.body || '';
    const after = injectAnchors(before);
    const changed = before !== after;

    // 앵커 개수 세기 (확인용)
    const anchorCount = (after.match(/data-anchor=/g) || []).length;

    if (changed) {
      report.changed++;
      if (!dryRun) {
        const { error: upErr } = await supabase
          .from('articles')
          .update({ body: after })
          .eq('id', art.id);
        if (upErr) report.errors.push({ id: art.id, slug: art.slug, error: upErr.message });
      }
    } else {
      report.unchanged++;
    }
    report.details.push({ id: art.id, slug: art.slug, changed, anchors: anchorCount });
  }

  return json({ status: 'ok', dryRun, report });
};
