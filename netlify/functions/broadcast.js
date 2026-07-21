import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { makeUnsubToken } from './_unsub.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);
const resend = new Resend(process.env.RESEND_BROADCAST_KEY);

const FROM = 'Nuh-Muh <desk@nuh-muh.com>';

// Resend 초당 2요청 제한 → 호출 사이 간격
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 수신거부 푸터 — 수신자별 우리 토큰 링크. (임시 문구, 앨리 확정안으로 후속 교체)
// ※ 단일 원천 원칙: 수신거부 링크는 우리 /unsubscribe(토큰) — Resend 내장 변수 폐기.
function footer(unsubUrl) {
  return `
<hr style="margin-top:40px;border:none;border-top:1px solid #d8ceb2;">
<p style="font-size:12px;color:#8a8368;text-align:center;margin-top:16px;font-family:serif;word-break:keep-all;">
너머가 보낸 편지입니다.<br>
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

  let mode, subject, html;
  try {
    const body = await req.json();
    mode = body.mode;
    subject = body.subject;
    html = body.html;
  } catch (e) {
    return new Response(JSON.stringify({ status: 'error', detail: 'bad body' }), {
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
    recipients = [t];
  } else {
    const { data: members, error: memErr } = await supabase
      .from('members')
      .select('email')
      .in('status', ['keyholder', 'initiate'])
      .eq('mail_opt_out', false);
    if (memErr) {
      return new Response(JSON.stringify({ status: 'error', detail: memErr.message }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    recipients = members.map(m => m.email);
  }

  // ── Resend Audience/Contacts 동기화 (존치, 마틴 지시) ──
  // 벤더 측 보조 명부 유지용. 발송 판단과는 무관(발송은 위 우리 DB 기준). 실패해도 발송을 막지 않음.
  try {
    const { data: audData } = await resend.audiences.list();
    if (audData && audData.data && audData.data.length > 0) {
      const audienceId = audData.data[0].id;
      for (const email of recipients) {
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
  for (const email of recipients) {
    const unsubUrl = 'https://nuh-muh.com/unsubscribe?token=' + encodeURIComponent(makeUnsubToken(email));
    const fullHtml = html + footer(unsubUrl);
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
