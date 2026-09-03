// 내 방 — 조회·저장. 발행소가 send-letter를 부르듯 방 화면이 이 함수를 부른다.
//
// ★브라우저는 RLS로 room_* 테이블을 읽지도 쓰지도 못한다(서버 전용).
//   모든 접근이 여기를 거친다 — "인증과 허가의 관문은 서버"(§3-7).
//
// ★방은 없으면 만든다. 회원이 처음 들어온 순간이 방이 생기는 순간이다.
//   가입 시점에 미리 만들지 않는 이유: 만들어두고 안 들어오는 방이 쌓인다.

import { createClient } from '@supabase/supabase-js';

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
      items: items || [],
      door: door || [],
      trace: trace,
      firstTime: r.created,
    });
  }

  // ── 문패 ──
  if (action === 'nameplate') {
    const text = (body.text || '').trim().slice(0, 60);
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

    const { error } = await supabase.from('room_items')
      .update({ face: face, slot: body.slot || null, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) return json({ status: 'error', detail: error.message });

    // 짐 가방 출입 기록 — room_items가 '지금 어디', room_stash가 '언제 들고 났나'.
    if (item.face !== 'bottom' && face === 'bottom') {
      await supabase.from('room_stash').insert({
        room_id: room.id, item_id: itemId, kind: item.kind, target_id: item.target_id,
      });
    } else if (item.face === 'bottom' && face !== 'bottom') {
      const { data: open } = await supabase.from('room_stash')
        .select('id').eq('item_id', itemId).is('left_at', null)
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
      face: face, slot: body.slot || null, action: 'moved',
    });

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
