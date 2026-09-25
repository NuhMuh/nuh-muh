// 담기 — 노트에 적고 가방에 넣는 창구.
//
// ★브라우저는 RLS로 keeps를 읽지도 쓰지도 못한다. 모든 접근이 여기를 거친다.
//   "인증과 허가의 관문은 서버"(§3-7).
//
// ★공개 여부를 keeps에 두지 않는다. 공개는 스위치가 아니라 자리다 —
//   room_items.face가 'bottom'이면 가방 안이고 남에게 안 보인다.
//   플래그를 두면 "가방에 있는데 공개"인 어긋남이 만들어진다(마틴 확정 2026-09-08).
//
// ★담기 한 번에 두 줄이 생긴다: keeps 한 줄 + room_items 한 줄.
//   뒤엣것이 실패하면 앞엣것을 지워 되돌린다 — 어디에도 없는 담기가 남으면
//   사용자는 담았다고 여기는데 가방이 비어 유령이 된다(마틴 판정).

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const json = (obj) => new Response(JSON.stringify(obj), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});

// 토큰 → 회원. keyholder만 담을 수 있다.
async function whoIs(token) {
  if (!token) return { ok: false, reason: 'no token' };
  const { data: u, error: uErr } = await supabase.auth.getUser(token);
  if (uErr || !u || !u.user) return { ok: false, reason: 'invalid session' };
  const { data: m } = await supabase
    .from('members').select('id, nickname, status').eq('email', u.user.email).maybeSingle();
  if (!m) return { ok: false, reason: 'no member' };
  if (m.status !== 'keyholder') return { ok: false, reason: 'not keyholder' };
  return { ok: true, member: m };
}

// 방을 얻는다. 없으면 만든다 — room.js와 같은 방식.
async function ensureRoom(memberId) {
  const { data: got } = await supabase
    .from('rooms').select('id').eq('member_id', memberId).maybeSingle();
  if (got) return { room: got };
  const { data: made, error } = await supabase
    .from('rooms').insert({ member_id: memberId }).select('id').maybeSingle();
  if (error) return { error: error.message };
  return { room: made };
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try { body = await req.json(); }
  catch (e) { return json({ status: 'error', detail: 'bad body' }); }

  const who = await whoIs(body.token);
  if (!who.ok) return json({ status: 'error', detail: who.reason });
  const me = who.member;

  const action = body.action || 'keep';

  // ── 처음 순간 표시 ──
  // ★localStorage가 아니라 서버에 남긴다. 기기가 바뀌어도 유지되어야 한다.
  if (action === 'first') {
    const moment = String(body.moment || '').slice(0, 40);
    if (!moment) return json({ status: 'error', detail: 'no moment' });
    const { data: had } = await supabase
      .from('room_first').select('id')
      .eq('member_id', me.id).eq('moment', moment).maybeSingle();
    if (had) return json({ status: 'ok', already: true });
    await supabase.from('room_first').insert({ member_id: me.id, moment: moment });
    return json({ status: 'ok', already: false });
  }

  // ── 어느 순간들을 이미 겪었나 (안내를 띄울지 판단하는 재료) ──
  if (action === 'moments') {
    const { data: rows } = await supabase
      .from('room_first').select('moment').eq('member_id', me.id);
    return json({ status: 'ok', moments: (rows || []).map((r) => r.moment) });
  }

  // ── 빼기 ──
  if (action === 'unkeep') {
    const keepId = body.keep_id;
    if (!keepId) return json({ status: 'error', detail: 'no keep' });
    const { data: row } = await supabase
      .from('keeps').select('id, member_id').eq('id', keepId).maybeSingle();
    if (!row || row.member_id !== me.id) {
      return json({ status: 'forbidden', detail: 'not yours' });
    }
    await supabase.from('room_items')
      .delete().eq('kind', 'keep').eq('target_id', keepId);
    const { error } = await supabase.from('keeps').delete().eq('id', keepId);
    if (error) return json({ status: 'error', detail: error.message });
    return json({ status: 'ok' });
  }

  // ── 담기 ──
  if (action === 'keep') {
    const articleId = Number(body.article_id);
    const snapshot = String(body.snapshot_text || '').trim();
    if (!articleId || !snapshot) return json({ status: 'error', detail: 'bad input' });

    // ★넘기 번호는 브라우저 말을 믿지 않고 서버가 글에서 읽는다.
    const { data: art } = await supabase
      .from('articles').select('id, work_id, status').eq('id', articleId).maybeSingle();
    if (!art) return json({ status: 'error', detail: 'no article' });

    const anchor = body.anchor_id ? String(body.anchor_id).slice(0, 16) : null;
    const hasOffset = anchor && body.start_offset != null && body.end_offset != null;
    const s = hasOffset ? Number(body.start_offset) : null;
    const e = hasOffset ? Number(body.end_offset) : null;
    if (hasOffset && !(Number.isInteger(s) && Number.isInteger(e) && e > s)) {
      return json({ status: 'error', detail: 'bad range' });
    }

    const r = await ensureRoom(me.id);
    if (r.error) return json({ status: 'error', detail: r.error });

    const { data: made, error: kErr } = await supabase.from('keeps').insert({
      member_id: me.id, article_id: art.id, work_id: art.work_id,
      anchor_id: anchor, start_offset: s, end_offset: e,
      snapshot_text: snapshot.slice(0, 4000),
    }).select('id').maybeSingle();

    if (kErr) {
      // 23505 = unique 위반. 이미 담은 것이다 — 오류가 아니라 상태다.
      if (kErr.code === '23505') return json({ status: 'already' });
      return json({ status: 'error', detail: kErr.message });
    }

    // ★가방에 넣는다. 담은 것은 아직 손 안 댄 것이므로 face는 언제나 bottom이다.
    const { error: iErr } = await supabase.from('room_items').insert({
      room_id: r.room.id, face: 'bottom', kind: 'keep', target_id: made.id,
    });

    if (iErr) {
      // ★되돌린다. 여기서 멈추면 노트엔 있는데 가방엔 없는 유령이 남는다.
      await supabase.from('keeps').delete().eq('id', made.id);
      return json({ status: 'error', detail: 'room insert failed' });
    }

    return json({ status: 'ok', keep_id: made.id });
  }

  return json({ status: 'error', detail: 'unknown action' });
};
