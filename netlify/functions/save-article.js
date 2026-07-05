import { createClient } from '@supabase/supabase-js';
import { injectAnchors } from './_anchors.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const ALLOWED_CATEGORIES = ['소설 너머', '영상 너머', '인물 너머', '소식 너머', '공지'];
const ALLOWED_STATUS = ['draft', 'published', 'hidden'];

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
  try {
    body = await req.json();
  } catch (e) {
    return json({ status: 'error', detail: 'bad body' });
  }

  const token = body.token;
  if (!token) return json({ status: 'error', detail: 'no token' });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData || !userData.user) {
    return json({ status: 'error', detail: 'invalid session' });
  }
  if (userData.user.email !== process.env.ADMIN_EMAIL) {
    return json({ status: 'forbidden', detail: 'not admin' });
  }

  const a = body.article || {};
  const title = (a.title || '').trim();
  const bodyHtml = injectAnchors(a.body || '');
  const slug = (a.slug || '').trim();

  if (!title) return json({ status: 'error', detail: 'title required' });
  if (!bodyHtml) return json({ status: 'error', detail: 'body required' });
  if (!slug) return json({ status: 'error', detail: 'slug required' });

  const status = ALLOWED_STATUS.includes(a.status) ? a.status : 'draft';

  // 주제 카드 결정
  // - work_id 주어지면: 기존 주제 카드에 글 추가
  // - newWork 주어지면: 새 주제 카드 생성 후 그 id 사용
  // - 둘 다 없으면: 단독 글 (work_id = null), category는 글에서 받음
  let workId = a.work_id || null;
  let category = null;

  if (!workId && a.newWork) {
    // 새 주제 카드 만들기
    const nw = a.newWork;
    const nwWeek = parseInt(nw.week, 10);
    const nwCategory = nw.category;
    const nwTitle = (nw.title || '').trim();
    const nwSlug = (nw.slug || '').trim();

    if (!Number.isInteger(nwWeek)) return json({ status: 'error', detail: 'week required' });
    if (!ALLOWED_CATEGORIES.includes(nwCategory)) return json({ status: 'error', detail: 'bad work category' });
    if (!nwTitle) return json({ status: 'error', detail: 'work title required' });
    if (!nwSlug) return json({ status: 'error', detail: 'work slug required' });

    const wins = await supabase.from('works').insert({
      week: nwWeek,
      category: nwCategory,
      title: nwTitle,
      slug: nwSlug,
      hover_images: Array.isArray(nw.hover_images) ? nw.hover_images : [],
    }).select('id, category').maybeSingle();

    if (wins.error) {
      return json({ status: 'error', detail: 'work create failed: ' + wins.error.message });
    }
    workId = wins.data.id;
    category = wins.data.category;
  } else if (workId) {
    // 기존 주제 카드 → 그 카드의 category 가져옴
    const wsel = await supabase.from('works').select('category').eq('id', workId).maybeSingle();
    if (wsel.error || !wsel.data) {
      return json({ status: 'error', detail: 'work not found' });
    }
    category = wsel.data.category;
  } else {
    // 단독 글 → 글에서 받은 category 사용
    category = a.category;
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return json({ status: 'error', detail: 'bad category' });
    }
  }

  const row = {
    title,
    body: bodyHtml,
    subtitle: a.subtitle || null,
    slug,
    category,
    work_id: workId,
    tags: Array.isArray(a.tags) ? a.tags : [],
    cover_image: a.cover_image || null,
    cover_alt: a.cover_alt || null,
    status,
    pinned: !!a.pinned,
    letter_body: a.letter_body || null,
    meta_desc: a.meta_desc || null,
    og_image: a.og_image || null,
    updated_at: new Date().toISOString(),
  };
  if (status === 'published') {
    row.published_at = new Date().toISOString();
  }

  let result;
  if (a.id) {
    result = await supabase.from('articles').update(row).eq('id', a.id).select('id, slug').maybeSingle();
  } else {
    result = await supabase.from('articles').insert(row).select('id, slug').maybeSingle();
  }

  if (result.error) {
    return json({ status: 'error', detail: result.error.message });
  }

  return json({ status: 'ok', id: result.data ? result.data.id : null, slug: result.data ? result.data.slug : slug, work_id: workId });
};
