// 내 방 — 조회·저장. 발행소가 send-letter를 부르듯 방 화면이 이 함수를 부른다.
//
// ★브라우저는 RLS로 room_* 테이블을 읽지도 쓰지도 못한다(서버 전용).
//   모든 접근이 여기를 거친다 — "인증과 허가의 관문은 서버"(§3-7).
//
// ★방은 없으면 만든다. 회원이 처음 들어온 순간이 방이 생기는 순간이다.
//   가입 시점에 미리 만들지 않는 이유: 만들어두고 안 들어오는 방이 쌓인다.

import { createClient } from '@supabase/supabase-js';
import { parse } from 'node-html-parser';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const json = (obj) => new Response(JSON.stringify(obj), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});

const FACES = ['front', 'right', 'back', 'left', 'bottom'];

// 토큰 → 회원. keyholder만 방을 갖는다.
async function whoIs(token) {
  if (!token) return { ok: false, reason: 'no token' };
  const { data: u, error: uErr } = await supabase.auth.getUser(token);
  if (uErr || !u || !u.user) return { ok: false, reason: 'invalid session' };
  const { data: m } = await supabase
    .from('members').select('id, nickname, status').eq('email', u.user.email).maybeSingle();
  if (!m) return { ok: false, reason: 'no member' };
  return { ok: true, member: m };
}

// 방을 얻는다. 없으면 만든다.
async function ensureRoom(memberId) {
  const { data: got } = await supabase
    .from('rooms').select('*').eq('member_id', memberId).maybeSingle();
  if (got) return { room: got, created: false };

  const { data: made, error } = await supabase
    .from('rooms').insert({ member_id: memberId }).select().maybeSingle();
  if (error) return { error: error.message };
  return { room: made, created: true };
}

// ★자리 옮기기 — 지금 자리(room_items)와 가방 출입(room_stash)·이력(room_history)을 함께 적는다.
//   move와 액자(걸기·내리기)가 이 한 길을 쓴다 — 기록 방식이 둘로 갈라지지 않게.
//   payload를 undefined로 넘기면 건드리지 않는다(move는 딸린 값을 모른다).
async function place(room, item, face, slot, payload) {
  const patch = { face: face, slot: (slot == null ? null : slot), updated_at: new Date().toISOString() };
  if (payload !== undefined) patch.payload = payload;
  const { error } = await supabase.from('room_items').update(patch).eq('id', item.id);
  if (error) return { error: error.message };

  // 짐 가방 출입 기록 — room_items가 '지금 어디', room_stash가 '언제 들고 났나'.
  if (item.face !== 'bottom' && face === 'bottom') {
    await supabase.from('room_stash').insert({
      room_id: room.id, item_id: item.id, kind: item.kind, target_id: item.target_id,
    });
  } else if (item.face === 'bottom' && face !== 'bottom') {
    const { data: open } = await supabase.from('room_stash')
      .select('id').eq('item_id', item.id).is('left_at', null)
      .order('id', { ascending: false }).limit(1).maybeSingle();
    if (open) {
      await supabase.from('room_stash')
        .update({ left_at: new Date().toISOString() }).eq('id', open.id);
    }
  }

  // 이력 — 지금 상태와 따로 둔다. 사용자에게 보이지 않는다.
  // ※누르고 취소한 것은 적지 않는다 — 그것은 로그가 아니라 감시다(마틴).
  await supabase.from('room_history').insert({
    room_id: room.id, item_kind: item.kind, target_id: item.target_id,
    face: face, slot: (slot == null ? null : slot), action: 'moved',
  });
  return { ok: true };
}

// ── 액자 — 본문에서 문장과 이미지를 꺼낸다 (내 방 2차-② ⑥) ──
// ★쪼개는 규칙은 이 한 곳뿐이다. 엽서 창에 보여줄 문장과 걸 때 검사하는 문장이 같은 함수에서
//   나와야 "고른 것이 진짜 그 글의 문장인가"가 성립한다.
// ★마침표·물음표·느낌표·말줄임표(와 바로 뒤의 닫는 따옴표·괄호) 다음 빈칸에서 끊는다.
//   끝맺음 부호가 없는 문단은 통째로 한 문장이다.
function sentencesOf(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  return t.split(/(?<=[.?!…][”’"'」』)\]]*)\s+/).map((x) => x.trim()).filter(Boolean);
}

// 본문 → 문단별 문장 목록 + 이미지. 표지 칸은 비어 있고 쓰인 적이 없어 본문에서 꺼낸다(09-22 조사).
// 문단은 문단 표시(data-anchor)가 붙은 칸이다. 빈 문단은 빠진다. 캡션(figcaption)은 문단이 아니다.
function readArticle(bodyHtml) {
  const root = parse(bodyHtml || '');
  const blocks = [];
  root.querySelectorAll('[data-anchor]').forEach((el) => {
    // 문단 안에 문단이 들어 있으면 바깥 것만 센다 — 같은 문장이 두 번 나오지 않게.
    if (el.parentNode && el.parentNode.closest && el.parentNode.closest('[data-anchor]')) return;
    const ss = sentencesOf(el.text);
    if (ss.length) blocks.push(ss);
  });
  const images = root.querySelectorAll('img')
    .map((im) => ({ src: im.getAttribute('src') || '', alt: im.getAttribute('alt') || '' }))
    .filter((im) => /^(https:\/\/|\/)/.test(im.src));
  return { blocks: blocks, images: images };
}

// ★고른 문장이 진짜 그 글의 문장인지 서버가 본다. 안 보면 화면을 거치지 않고 아무 글이나
//   벽에 걸 수 있다 — 「내 방 설계」 §5-2 "액자에는 글을 붙일 수 없다"가 뚫린다(문패와 같은 까닭).
//   개수는 최대 5, 길이 제한은 없다(운영자 09-24). 안 골랐으면 빈 목록 — 화면이 제목을 띄운다.
function checkLines(lines, blocks) {
  if (lines == null) return { value: [] };
  if (!Array.isArray(lines)) return { error: 'bad lines' };
  if (lines.length > 5) return { error: 'too many lines' };
  const all = new Set([].concat(...blocks));
  const out = [];
  for (const l of lines) {
    const t = String(l);
    if (!all.has(t)) return { error: 'not in article' };
    if (out.includes(t)) return { error: 'duplicate line' };
    out.push(t);
  }
  return { value: out };
}

// 액자에 쓸 물건 — 내 방의 담기 한 줄이고, 내 담기이고, 통째 담기여야 한다.
// 통째 담기는 문단 표시(anchor_id)가 빈 것이다(「스택과 기술 함정」 부록 D-11).
// needArticle이 거짓이면 글을 안 읽는다 — 글이 나중에 내려가도 액자는 내릴 수 있어야 한다.
async function frameItem(roomId, memberId, itemId, needArticle) {
  if (!itemId) return { error: 'no item' };
  const { data: item } = await supabase.from('room_items').select('*').eq('id', itemId).maybeSingle();
  if (!item || item.room_id !== roomId || item.kind !== 'keep') return { error: 'not your frame item' };
  const { data: keep } = await supabase.from('keeps')
    .select('id, member_id, anchor_id, article_id').eq('id', item.target_id).maybeSingle();
  if (!keep || keep.member_id !== memberId) return { error: 'not your keep' };
  if (keep.anchor_id != null) return { error: 'not a whole keep' };
  if (!needArticle) return { item: item, keep: keep, article: null };
  const { data: article } = await supabase.from('articles')
    .select('id, title, slug, body, status').eq('id', keep.article_id).maybeSingle();
  if (!article || article.status !== 'published') return { error: 'article not available' };
  return { item: item, keep: keep, article: article };
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try { body = await req.json(); } catch (e) { return json({ status: 'error', detail: 'bad body' }); }

  const who = await whoIs(body.token);
  if (!who.ok) return json({ status: 'error', detail: who.reason });
  const me = who.member;

  const r = await ensureRoom(me.id);
  if (r.error) return json({ status: 'error', detail: r.error });
  const room = r.room;

  const action = body.action || 'get';

  // ── 방 전체를 읽는다 ──
  if (action === 'get') {
    const { data: items } = await supabase
      .from('room_items').select('*').eq('room_id', room.id)
      .order('face').order('position');

    // ★담긴 것 — room_items는 번호만 갖고 있으므로 문장을 따로 읽어 붙인다.
    //   공개 여부를 묻지 않는다. face가 곧 자리다 — bottom이면 가방, 그 밖이면 벽에 걸린 것이다.
    const keepIds = (items || []).filter((i) => i.kind === 'keep').map((i) => i.target_id);
    let keepMap = {};
    if (keepIds.length) {
      const { data: krows } = await supabase
        .from('keeps')
        .select('id, article_id, anchor_id, snapshot_text, created_at, articles(title, slug)')
        .in('id', keepIds);
      (krows || []).forEach((r) => {
        keepMap[r.id] = {
          id: r.id, text: r.snapshot_text, anchor: r.anchor_id, article: r.article_id,
          title: r.articles ? r.articles.title : null,
          slug: r.articles ? r.articles.slug : null,
          at: r.created_at,
        };
      });
    }

    // ★걸린 액자에 돌릴 이미지 — 본문에서 꺼낸다(readArticle). 가방 안의 것은 안 읽는다.
    const hungArticles = [...new Set((items || [])
      .filter((i) => i.kind === 'keep' && i.face !== 'bottom' && keepMap[i.target_id])
      .map((i) => keepMap[i.target_id].article))];
    const imagesOf = {};
    if (hungArticles.length) {
      const { data: arows } = await supabase.from('articles').select('id, body').in('id', hungArticles);
      (arows || []).forEach((a) => { imagesOf[a.id] = readArticle(a.body).images; });
    }

    // 문 앞에 쌓인 것 — 1차에는 첫 편지뿐이다.
    const { data: door } = await supabase
      .from('room_door').select('*').eq('room_id', room.id)
      .order('created_at', { ascending: false });

    // 발자취 — ★따로 쌓지 않고 모아 보여준다(마틴 판정).
    //   지금 사용자 행위 중 기록되는 것은 글쓰기뿐이다.
    //   담기·판 참여가 생기면 여기에 더한다 — 저장이 아니라 조회를 늘리는 것이다.
    const trace = await gatherTrace(me.id);

    return json({
      status: 'ok',
      room: room,
      nickname: me.nickname || null,
      items: (items || []).map((i) =>
        (i.kind === 'keep' && keepMap[i.target_id])
          ? Object.assign({}, i, { keep: keepMap[i.target_id],
              images: (i.face !== 'bottom') ? (imagesOf[keepMap[i.target_id].article] || []) : undefined })
          : i),
      door: door || [],
      trace: trace,
      firstTime: r.created,
    });
  }

  // ── 문패 ──
  if (action === 'nameplate') {
    // ★60자를 넘으면 자르지 않고 거절한다(내 방 2차-② ⑤). 전에는 말없이 60자로 잘라
    //   저장하고 "걸어두었소"를 돌려줬다 — 쓴 사람은 뒤가 잘린 줄 모른다.
    //   글자 수는 화면 입력칸(maxlength="60")과 같은 셈법이다. 화면으로는 61자를 보낼 수 없으므로
    //   이 거절은 화면을 거치지 않고 들어오는 값만 막는다.
    const text = (body.text || '').trim();
    if (text.length > 60) return json({ status: 'error', detail: 'nameplate too long' });
    const { error } = await supabase
      .from('rooms')
      .update({ nameplate: text || null, nameplate_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', room.id);
    if (error) return json({ status: 'error', detail: error.message });
    return json({ status: 'ok', nameplate: text });
  }

  // ── 마지막으로 보던 면 ──
  if (action === 'face') {
    const face = body.face;
    if (!FACES.includes(face)) return json({ status: 'error', detail: 'bad face' });
    await supabase.from('rooms')
      .update({ last_face: face, updated_at: new Date().toISOString() }).eq('id', room.id);
    return json({ status: 'ok', face: face });
  }

  // ── 물건을 다른 자리로 옮긴다 ──
  // ★공개 여부는 참/거짓이 아니라 위치다. face='bottom'이면 짐 가방 안이고 남에게 안 보인다.
  //   따로 플래그를 두지 않으므로 "가방에 있는데 공개"인 어긋남이 구조적으로 불가능하다.
  if (action === 'move') {
    const itemId = body.item_id;
    const face = body.face;
    if (!itemId || !FACES.includes(face)) return json({ status: 'error', detail: 'bad move' });

    const { data: item } = await supabase
      .from('room_items').select('*').eq('id', itemId).maybeSingle();
    if (!item || item.room_id !== room.id) {
      return json({ status: 'forbidden', detail: 'not your item' });
    }

    // 기록 방식은 place() 한 곳에 있다 — 액자 걸기·내리기와 같은 길이다.
    const done = await place(room, item, face, body.slot || null, undefined);
    if (done.error) return json({ status: 'error', detail: done.error });
    return json({ status: 'ok' });
  }

  // ── 액자 (내 방 2차-② ⑥) ──
  // ★걸기·내리기는 "옮기기"다 — 담기 한 줄(room_items)을 가방(bottom)과 첫째 벽(front) 사이로 옮긴다.
  //   담기 하나는 자리 하나이므로 같은 담기를 액자 둘에 걸 수 없고, 걸린 것은 가방에 없다(마틴 판정 09-25).
  //   고른 문장은 그 줄의 payload에 글자 그대로 둔다 — 담기가 아니므로 지도·발자취·담긴 수에 안 남는다.
  //   글자 그대로인 까닭: 회원 글에는 문단 표시가 없다 — 작품 글이 들어와도 고르기를 다시 안 만든다.
  if (action === 'frame-source' || action === 'hang' || action === 'reframe' || action === 'unhang') {
    const got = await frameItem(room.id, me.id, body.item_id, action !== 'unhang');
    if (got.error) return json({ status: 'error', detail: got.error });
    const item = got.item, article = got.article;

    // 엽서 창에 펼칠 것 — 문단별 문장, 이미지, 이미 고른 문장(문장 바꾸기일 때).
    if (action === 'frame-source') {
      const a = readArticle(article.body);
      return json({ status: 'ok', title: article.title, slug: article.slug,
        blocks: a.blocks, images: a.images, lines: (item.payload && item.payload.lines) || [] });
    }

    if (action === 'hang') {
      if (item.face !== 'bottom') return json({ status: 'error', detail: 'not in bag' });
      const slot = Number(body.slot);
      if (![1, 2, 3].includes(slot)) return json({ status: 'error', detail: 'bad slot' });
      const lines = checkLines(body.lines, readArticle(article.body).blocks);
      if (lines.error) return json({ status: 'error', detail: lines.error });
      // 그 자리에 이미 걸린 것 — "글 바꾸기"로 그것을 가리켰을 때만 먼저 내린다. 아니면 거절한다.
      const { data: there } = await supabase.from('room_items').select('*')
        .eq('room_id', room.id).eq('face', 'front').eq('slot', slot);
      for (const t of (there || [])) {
        if (String(t.id) !== String(body.replace_item_id)) return json({ status: 'error', detail: 'slot taken' });
      }
      for (const t of (there || [])) {
        const down = await place(room, t, 'bottom', null, null);
        if (down.error) return json({ status: 'error', detail: down.error });
      }
      const up = await place(room, item, 'front', slot, { lines: lines.value });
      if (up.error) return json({ status: 'error', detail: up.error });
      return json({ status: 'ok' });
    }

    if (action === 'reframe') {
      if (item.face !== 'front') return json({ status: 'error', detail: 'not hung' });
      const lines = checkLines(body.lines, readArticle(article.body).blocks);
      if (lines.error) return json({ status: 'error', detail: lines.error });
      // 문장 바꾸기는 자리를 옮기는 것이 아니므로 이력에 안 적는다(§2-2 고쳐도 기록되지 않는다).
      const { error } = await supabase.from('room_items')
        .update({ payload: { lines: lines.value }, updated_at: new Date().toISOString() }).eq('id', item.id);
      if (error) return json({ status: 'error', detail: error.message });
      return json({ status: 'ok' });
    }

    // unhang — 내리면 가방으로 돌아가고 고른 문장은 사라진다(액자에 딸린 표시일 뿐 물건이 아니다).
    if (item.face !== 'front') return json({ status: 'error', detail: 'not hung' });
    const done = await place(room, item, 'bottom', null, null);
    if (done.error) return json({ status: 'error', detail: done.error });
    return json({ status: 'ok' });
  }

  return json({ status: 'error', detail: 'unknown action' });
};

// 발자취 — 넘기 단위로 모은다.
// articles.work_id → works.week 조인은 send-letter에서 쓴 것과 같은 경로다.
async function gatherTrace(memberId) {
  const { data: arts } = await supabase
    .from('articles')
    .select('id, title, slug, created_at, work_id, works(week)')
    .eq('author_id', memberId)
    .order('created_at', { ascending: false });

  const byWeek = {};
  (arts || []).forEach((a) => {
    // 넘기가 없는 글(단독글)은 '기타'로 묶는다.
    const w = (a.works && a.works.week != null) ? a.works.week : null;
    const key = (w == null) ? 'solo' : String(w);
    if (!byWeek[key]) byWeek[key] = { week: w, entries: [] };
    byWeek[key].entries.push({
      kind: 'article', title: a.title, slug: a.slug, at: a.created_at,
    });
  });

  // 넘기 번호 큰 것부터. 단독글은 맨 뒤.
  return Object.values(byWeek).sort((x, y) => {
    if (x.week == null) return 1;
    if (y.week == null) return -1;
    return y.week - x.week;
  });
}
