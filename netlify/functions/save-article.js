import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const ALLOWED_CATEGORIES = ['소설 너머', '영상 너머', '인물 너머', '뉴스 너머'];
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
  const email = userData.user.email;
  if (email !== process.env.ADMIN_EMAIL) {
    return json({ status: 'forbidden', detail: 'not admin' });
  }

  const a = body.article || {};
  const title = (a.title || '').trim();
  const bodyHtml = a.body || '';
  const slug = (a.slug || '').trim();
  const category = a.category;

  if (!title) return json({ status: 'error', detail: 'title required' });
  if (!bodyHtml) return json({ status: 'error', detail: 'body required' });
  if (!slug) return json({ status: 'error', detail: 'slug required' });
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return json({ status: 'error', detail: 'bad category' });
  }
  const status = ALLOWED_STATUS.includes(a.status) ? a.status : 'draft';

  const row = {
    title,
    body: bodyHtml,
    subtitle: a.subtitle || null,
    slug,
    category,
    tags: Array.isArray(a.tags) ? a.tags : [],
    work: a.work || null,
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

  return json({ status: 'ok', id: result.data ? result.data.id : null, slug: result.data ? result.data.slug : slug });
};
