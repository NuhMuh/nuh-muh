import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);
const resend = new Resend(process.env.RESEND_BROADCAST_KEY);

const FROM = 'Nuh-Muh <desk@nuh-muh.com>';

// Resend 초당 2요청 제한 → 호출 사이 간격
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

  // 1. Audience 찾기 (하나뿐이라 첫 번째 사용)
  const { data: audData, error: audErr } = await resend.audiences.list();
  if (audErr || !audData || !audData.data || audData.data.length === 0) {
    return new Response(JSON.stringify({ status: 'error', detail: 'no audience: ' + (audErr ? audErr.message : 'empty') }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  const audienceId = audData.data[0].id;

  // 2. 수신자 결정
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
      .in('status', ['keyholder', 'initiate']);
    if (memErr) {
      return new Response(JSON.stringify({ status: 'error', detail: memErr.message }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    recipients = members.map(m => m.email);
  }

  // 3. Audience에 연락처 추가 (초당 2요청 제한 → 600ms 간격, 이미 있으면 무시)
  for (const email of recipients) {
    try {
      await resend.contacts.create({
        audienceId,
        email,
        unsubscribed: false,
      });
    } catch (e) {
      // 이미 존재 등 → 무시하고 계속
    }
    await sleep(600);
  }

  // 호출 간격 확보
  await sleep(600);

  // 4. Broadcast 생성 + 발송
  const { data: created, error: createErr } = await resend.broadcasts.create({
    audienceId,
    from: FROM,
    subject,
    html,
  });
  if (createErr || !created) {
    return new Response(JSON.stringify({ status: 'error', detail: 'create failed: ' + (createErr ? createErr.message : '?') }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  await sleep(600);

  const { error: sendErr } = await resend.broadcasts.send(created.id);
  if (sendErr) {
    return new Response(JSON.stringify({ status: 'error', detail: 'send failed: ' + sendErr.message }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ status: 'ok', mode, count: recipients.length, broadcastId: created.id }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
