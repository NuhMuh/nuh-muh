import { createClient } from '@supabase/supabase-js';
import { verifyAnchors } from './_anchors.mjs';

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
  // 앵커 주입은 클라이언트(anchor-client.js)에서 완료되어 도착함. 서버는 주입하지 않고 검증만.
  const bodyHtml = a.body || '';
  const slug = (a.slug || '').trim();

  if (!title) return json({ status: 'error', detail: 'title required' });
  if (!bodyHtml) return json({ status: 'error', detail: 'body required' });

  // 서버 최종 방어선 검증 (마틴 3규칙: 우회 저장 차단)
  // 주입은 클라이언트가 완료. 서버는 "주입 미경유 저장"을 막는다.
  const anchorCheck = verifyAnchors(bodyHtml);
  if (!anchorCheck.ok) {
    return json({
      status: 'error',
      detail: '앵커 검증 실패(' + (anchorCheck.reason || '') + '): ' + (anchorCheck.detail || '본문 구조를 확인하세요.'),
    });
  }
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
    // 수정 이력 보존 (요구3): 덮어쓰기 직전 기존 body를 article_revisions에 남긴다.
    // 원본 보존이 목적이므로 — 이력 저장이 실패하면 본 저장(덮어쓰기)도 중단한다.
    // 백업 없이 덮어쓰면 그 순간의 원본이 영구 소실되기 때문. (수정된 나)
    const prev = await supabase.from('articles').select('body').eq('id', a.id).maybeSingle();
    if (prev.error) {
      return json({ status: 'error', detail: '기존 글을 읽지 못해 저장을 중단했습니다: ' + prev.error.message });
    }
    // 기존 글에 body가 있으면 반드시 이력에 남긴 뒤에만 덮어쓴다.
    if (prev.data && prev.data.body != null) {
      const rev = await supabase.from('article_revisions').insert({
        article_id: a.id,
        body: prev.data.body,
      });
      if (rev.error) {
        // 이력 실패 → 덮어쓰기 중단 (원본 보존 우선). 실패를 명확히 알린다.
        return json({
          status: 'error',
          detail: '이력 백업 실패로 저장을 중단했습니다 (원본 보존). 다시 시도하거나 관리자에게 문의하세요. 원인: ' + rev.error.message,
        });
      }
    }
    result = await supabase.from('articles').update(row).eq('id', a.id).select('id, slug').maybeSingle();
  } else {
    // 신규 글: 요청자의 member_id를 author_id로 연결 (마틴: 빈 값 방지)
    // 현재 요청자는 항상 운영자. critic별 연결·권한 분화는 3-2 몫.
    const authorEmail = userData.user.email;
    const memberLookup = await supabase.from('members').select('id').eq('email', authorEmail).maybeSingle();
    if (memberLookup.data && memberLookup.data.id) {
      row.author_id = memberLookup.data.id;
    }
    result = await supabase.from('articles').insert(row).select('id, slug').maybeSingle();
  }

  if (result.error) {
    return json({ status: 'error', detail: result.error.message });
  }

  return json({ status: 'ok', id: result.data ? result.data.id : null, slug: result.data ? result.data.slug : slug, work_id: workId });
};
