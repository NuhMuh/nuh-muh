// 넘기 알림 발송 — 발행소가 부르는 자리.
//
// [왜 별도 함수인가] broadcast.js는 완성된 HTML을 받아 발송만 한다. 편지를 만들려면
//   글을 조회하고 조판을 입혀야 하는데, 그것을 브라우저에서 하면 조판이 클라이언트로
//   흩어져 앨리 확정안 교체가 어려워진다. 그래서 발행소는 "글 id + 모드"만 보내고
//   편지 만드는 책임은 서버(_letter.mjs) 한 곳에 모은다.
//
// ★발행 ≠ 알림. 이 함수는 글을 발행하지 않는다. 이미 저장된 글을 대상으로 편지만 보낸다.
//   그래서 이미 발행된 지난 글에도 발송할 수 있다(소급 발송).

import { createClient } from '@supabase/supabase-js';
import { getRolesByToken, hasRole } from './_roles.mjs';
import { buildLetter } from './_letter.mjs';

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

  // 역할 확인 — operator만 발송 허용 (sign-upload·list-articles와 같은 문법)
  const roleInfo = await getRolesByToken(supabase, body.token);
  if (!roleInfo.ok) {
    return json({ status: 'error', detail: roleInfo.reason || 'auth failed' });
  }
  if (!hasRole(roleInfo.roles, 'operator')) {
    return json({ status: 'forbidden', detail: 'operator role required' });
  }

  const id = body.id;
  const mode = body.mode;
  const force = !!body.force;

  if (!id) return json({ status: 'error', detail: 'id required' });
  if (mode !== 'test' && mode !== 'live') {
    return json({ status: 'error', detail: 'mode must be test or live' });
  }

  // ── 글 조회 ──
  // 넘기 번호는 articles에 없다. work_id → works.week를 타야 한다(save-article.js 선례).
  const { data: art, error: artErr } = await supabase
    .from('articles')
    .select('id, title, slug, category, work_id, letter_body, letter_sent')
    .eq('id', id)
    .maybeSingle();
  if (artErr) return json({ status: 'error', detail: artErr.message });
  if (!art) return json({ status: 'error', detail: 'article not found' });

  // ── 중복 방지 — 경고 후 재발송 허용(완전 잠금 배제) ──
  // ★판단은 서버가 한다. 브라우저가 "이미 보냈나"를 판단하면 우회할 수 있다.
  //   화면은 묻기만 하고, 운영자가 확인하면 force로 다시 부른다.
  //   완전 잠금을 배제한 이유: 발송 실패·오타 재발송 시 DB 직접 조작을 강요하게 된다.
  if (mode === 'live' && art.letter_sent && !force) {
    return json({
      status: 'already_sent',
      detail: '이미 발송한 글입니다.',
      title: art.title,
    });
  }

  // ── 넘기 번호 ──
  let week = null;
  if (art.work_id) {
    const { data: w } = await supabase
      .from('works').select('week').eq('id', art.work_id).maybeSingle();
    if (w && w.week != null) week = w.week;
  }

  // ── 편지 생성 ──
  // 조판은 _letter.mjs의 몫이다. 앨리 확정안이 바뀌면 그 파일만 교체한다.
  const letter = buildLetter({
    title: art.title,
    slug: art.slug,
    category: art.category,
    week: week,
    letter_body: art.letter_body,
  });

  // ── 발송 ──
  // broadcast.js를 그대로 재사용한다. 수신자 조회·opt_out 필터·실패 격리·기록·
  // 수신거부 토큰·List-Unsubscribe 헤더가 전부 그 안에 있다.
  // ※함수 간 HTTP 호출인 것은 broadcast의 발송 로직을 건드리지 않기 위한 선택이다.
  const base = new URL(req.url).origin;
  let result;
  try {
    const res = await fetch(base + '/.netlify/functions/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: mode,
        token: body.token,       // broadcast도 operator 인증을 요구한다
        subject: letter.subject,
        html: letter.html,
      }),
    });
    result = await res.json();
  } catch (e) {
    return json({ status: 'error', detail: '발송 호출 실패: ' + e.message });
  }

  if (result.status !== 'ok') {
    return json({ status: 'error', detail: result.detail || '발송 실패', broadcast: result });
  }

  // ── 발송 이력 ──
  // ★live일 때만 기록한다(마틴 판정). 시험 발송은 운영자에게만 가는 것이며
  //   수신자에게 도달한 사건이 아니다. 이것을 기록하면 정작 실제 발송 때
  //   "이미 보냈다" 경고가 떠서 경고가 무의미해진다.
  // boolean + 마지막 시각으로 충분하다 — 중복 경고의 목적은 실수로 두 번 보내는 것을
  //   막는 것이지 기록을 남기는 것이 아니다. 횟수·이력 보존이 필요해지면 별도 테이블로.
  let recorded = false;
  if (mode === 'live') {
    const { error: upErr } = await supabase
      .from('articles')
      .update({ letter_sent: true, letter_sent_at: new Date().toISOString() })
      .eq('id', id);
    if (upErr) {
      // 발송은 이미 끝났다. 기록 실패로 발송을 되돌릴 수 없으므로 성공으로 반환하되 알린다.
      return json({
        status: 'ok', mode, sent: result.sent, total: result.total,
        failedCount: result.failedCount, recorded: false,
        warn: '발송은 됐으나 이력 기록에 실패했습니다: ' + upErr.message,
      });
    }
    recorded = true;
  }

  return json({
    status: 'ok', mode,
    total: result.total, sent: result.sent,
    failedCount: result.failedCount, failed: result.failed,
    recorded: recorded,
  });
};
