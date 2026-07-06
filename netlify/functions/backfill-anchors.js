import { createClient } from '@supabase/supabase-js';
import { injectAnchors, verifyAnchors } from './_anchors.mjs';

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

    // 검증 (마틴 지시: 어긋난 주입은 저장 금지)
    const check = verifyAnchors(after);
    if (!check.ok) {
      report.errors.push({
        id: art.id, slug: art.slug,
        error: '검증 실패: 블록 ' + check.blocks + ' / 앵커 ' + check.anchors,
      });
      report.details.push({ id: art.id, slug: art.slug, changed: false, anchors: check.anchors, verifyFailed: true });
      continue; // 이 글은 건너뜀 (저장 안 함)
    }

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
    report.details.push({ id: art.id, slug: art.slug, changed, anchors: check.anchors });
  }

  return json({ status: 'ok', dryRun, report });
};
