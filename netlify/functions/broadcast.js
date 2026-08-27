import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { makeUnsubToken } from './_unsub.mjs';
import { NICK_SLOT, nickBlock } from './_letter.mjs';
import { getRolesByToken, hasRole } from './_roles.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);
const resend = new Resend(process.env.RESEND_BROADCAST_KEY);

const FROM = 'Nuh-Muh <desk@nuh-muh.com>';

// Resend 초당 2요청 제한 → 호출 사이 간격
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 수신거부 푸터 — 수신자별 우리 토큰 링크. 문면은 앨리 확정안(2026-08-26).
// ★이 푸터는 브로드캐스트 공통이며 알림 편지 전용이 아니다. 다른 종류의 단체 메일이
//   생기면 "이 편지는 새 글이 나올 때 갑니다"가 맞지 않게 된다 — 그때 분기할 것.
// ※신고 창구는 넣지 않는다 — 이 편지를 받는 사람은 이미 환영 편지를 받았다.
// ※ 단일 원천 원칙: 수신거부 링크는 우리 /unsubscribe(토큰) — Resend 내장 변수 폐기.
function footer(unsubUrl) {
  return `
<hr style="margin-top:40px;border:none;border-top:1px solid #d8ceb2;">
<p style="font-size:12px;color:#8a8368;text-align:center;margin-top:16px;font-family:serif;word-break:keep-all;">
이 편지는 새 글이 나올 때 갑니다.<br>
거미를 그만 보내달라 하시려면, <a href="${unsubUrl}" style="color:#8a8368;">여기에 말해두십시오.</a>
</p>
`;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  let mode, subject, html, token;
  try {
    const body = await req.json();
    mode = body.mode;
    subject = body.subject;
    html = body.html;
    token = body.token;
  } catch (e) {
    return new Response(JSON.stringify({ status: 'error', detail: 'bad body' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── operator 인증 (2026-08-26 누락 보수) ──
  // ★이 함수는 인증 없이 노출돼 있었다. 경로만 알면 누구든 desk@nuh-muh.com 발신으로
  //   명부 전원에게 임의 HTML을 보낼 수 있었다. 직접 피해보다 도메인 평판 훼손이
  //   실질 위험이다 — 스팸으로 찍히면 이후 모든 편지가 영향을 받고 회복이 어렵다.
  //   호출부가 0건이라 경로가 노출되지 않았을 뿐이며, 발행소에 버튼이 붙는 순간
  //   그 조건이 사라진다. 그래서 버튼보다 인증이 먼저다.
  // ※ 방식은 sign-upload.js와 동일하다(getRolesByToken + hasRole('operator')).
  //   save-article.js의 ADMIN_EMAIL 문자열 비교가 아니라 이쪽을 따른 이유:
  //   ①3-2에서 role 기반으로 통일하기로 돼 있어 ADMIN_EMAIL은 정리 대상이고,
  //   ②broadcast는 sign-upload와 성격이 같다 — 글 소유권이 아니라 실행 권한 관문이다.
  //   인증 지점이 여럿으로 갈리면 다음에 한쪽만 고치는 사고가 난다.
  const roleInfo = await getRolesByToken(supabase, token);
  if (!roleInfo.ok) {
    return new Response(JSON.stringify({ status: 'error', detail: roleInfo.reason || 'auth failed' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!hasRole(roleInfo.roles, 'operator')) {
    return new Response(JSON.stringify({ status: 'forbidden', detail: 'operator role required' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!subject || !html) {
    return new Response(JSON.stringify({ status: 'error', detail: 'subject/html required' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (mode !== 'test' && mode !== 'live') {
    return new Response(JSON.stringify({ status: 'error', detail: 'mode must be test or live' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── 수신자 결정 ──
  // ★발송 대상의 진실은 우리 DB(members + mail_opt_out). Resend Audience는 보조 명부일 뿐 발송 판단 근거 아님.
  // opt_out=true(수신거부)는 여기서 제외됨. 단 이 broadcast는 "넘기 알림"(브로드캐스트)이므로 opt_out 존중.
  // (환영 편지 같은 트랜잭션성 메일은 subscribe.js에서 opt_out 무시하고 항상 발송 — 별개 경로.)
  let recipients = [];
  if (mode === 'test') {
    const t = process.env.TEST_EMAIL;
    if (!t) {
      return new Response(JSON.stringify({ status: 'error', detail: 'TEST_EMAIL not set' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    // 시험 발송도 실제 편지를 그대로 미리 보는 것이므로 닉네임을 조회해 호명을 살린다.
    // 없으면 호명 줄이 빠진다 — 시험 전용 문구를 만들지 않는다.
    const { data: tm } = await supabase
      .from('members').select('nickname').eq('email', t).maybeSingle();
    recipients = [{ email: t, nickname: (tm && tm.nickname) || null }];
  } else {
    const { data: members, error: memErr } = await supabase
      .from('members')
      .select('email, nickname')
      .in('status', ['keyholder', 'initiate'])
      .eq('mail_opt_out', false);
    if (memErr) {
      return new Response(JSON.stringify({ status: 'error', detail: memErr.message }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    recipients = members.map(m => ({ email: m.email, nickname: m.nickname || null }));
  }

  // ── Resend Audience/Contacts 동기화 (존치, 마틴 지시) ──
  // 벤더 측 보조 명부 유지용. 발송 판단과는 무관(발송은 위 우리 DB 기준). 실패해도 발송을 막지 않음.
  try {
    const { data: audData } = await resend.audiences.list();
    if (audData && audData.data && audData.data.length > 0) {
      const audienceId = audData.data[0].id;
      for (const r of recipients) {
        const email = r.email;
        try {
          await resend.contacts.create({ audienceId, email, unsubscribed: false });
        } catch (e) { /* 이미 존재 등 무시 */ }
        await sleep(600);
      }
    }
  } catch (e) { /* Audience 동기화 실패는 발송을 막지 않음 */ }

  // ── 개별 발송 루프 ──
  // 각 수신자에게 그 사람 토큰 링크(본문 푸터) + List-Unsubscribe 헤더(우리 링크).
  // ★한 명 실패가 전체를 멈추지 않음 — 실패는 기록하고 다음으로 (발송 실패 인지 원칙).
  let sent = 0;
  const failed = [];
  for (const r of recipients) {
    const email = r.email;
    const unsubUrl = 'https://nuh-muh.com/unsubscribe?token=' + encodeURIComponent(makeUnsubToken(email));
    // ★호명은 수신자별로 갈린다 — 줄 전체를 넣거나 뺀다(이름 자리만 비우면 잔재가 남는다).
    //   판단 기준은 신분이 아니라 닉네임 유무다. 가입하면 다음 편지부터 자동으로 붙는다.
    //   호출하는 쪽이 자리표시자를 남기지 않았다면 치환은 아무 일도 하지 않는다(무해).
    const fullHtml = html.split(NICK_SLOT).join(nickBlock(r.nickname)) + footer(unsubUrl);
    try {
      const { error: sendErr } = await resend.emails.send({
        from: FROM,
        to: email,
        subject,
        html: fullHtml,
        headers: {
          // List-Unsubscribe: 스팸 억제 이점은 살리되 목적지는 우리 링크(단일 원천).
          'List-Unsubscribe': '<' + unsubUrl + '>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      if (sendErr) {
        failed.push(email);
        console.log('[broadcast] send fail:', email, sendErr.message);
        try { await supabase.from('mail_failures').insert({ email, kind: 'broadcast', error: sendErr.message }); } catch (e) {}
      } else {
        sent++;
      }
    } catch (err) {
      failed.push(email);
      console.log('[broadcast] send exception:', email, err.message);
      try { await supabase.from('mail_failures').insert({ email, kind: 'broadcast', error: err.message }); } catch (e) {}
    }
    await sleep(600); // 초당 2요청 제한
  }

  return new Response(JSON.stringify({
    status: 'ok', mode,
    total: recipients.length, sent, failedCount: failed.length,
    failed: failed,  // 실패 주소 목록 (운영자 인지용)
  }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
