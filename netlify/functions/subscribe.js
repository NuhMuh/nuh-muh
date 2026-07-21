import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// ── 환영 편지 HTML 조판 (이미지 확정안 기준) ──
// 메일 호환: 인라인 스타일 + 테이블. 웹폰트 금지(기기 기본 세리프 스택). word-break: keep-all.
// 엠블럼: 붉은 줄표 아래 여백만 둠(placeholder 박스 없음). 이미지 도착 시 <img> 한 줄 끼울 자리에 주석 표시.
function buildWelcomeHtml(unsubUrl) {
  const serif = "'Apple SD Gothic Neo', 'Noto Serif KR', 'Nanum Myeongjo', 'Batang', serif";
  const ink = '#1c2340';
  const inkFaint = '#8a8368';
  const paper = '#f4eedd';
  const beige = '#ece4cf';
  const p = (text) =>
    '<p style="margin:0 0 22px;font-family:' + serif + ';font-size:16px;line-height:1.85;color:' + ink + ';word-break:keep-all;">' + text + '</p>';

  return [
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background:' + beige + ';">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + beige + ';padding:32px 16px;">',
    '<tr><td align="center">',
    // 본문 종이 영역 — 밝은 종이색 + 가는 단선 테두리(직각)
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:' + paper + ';border:1px solid #b8ab86;">',
    '<tr><td style="padding:52px 44px;">',
    p('당신의 첫 번째 흔적이 너머 어딘가에 새겨졌습니다.'),
    p('이야기와 사람을 잇는 길. 우리는 그 길을 발견하고, 걷고 걸어 잘 닦아놓지요.'),
    p('여러 가지 판이 너머에서 열립니다. 다채로운 사람들이 모여 함께 또는 혼자 이야기를 만들고, 그것을 다른 사람들과 주고받지요.'),
    p("앞으로 'Nuh-Muh'가 당신에게 꾸준히 편지를 보낼 것입니다. 아는 얼굴이 또 생겨서 좋군요."),
    // 주소 + 밑줄 링크
    '<p style="margin:0 0 22px;font-family:' + serif + ';font-size:16px;line-height:1.85;color:' + ink + ';word-break:keep-all;">주소는 언제나 편지에 남겨놓겠습니다. <a href="https://nuh-muh.com" style="color:' + ink + ';text-decoration:underline;">nuh-muh.com</a></p>',
    // 추신 — 살짝 흐린 색
    '<p style="margin:0 0 8px;font-family:' + serif + ';font-size:15px;line-height:1.8;color:' + inkFaint + ';word-break:keep-all;">추신. 거미 배달부가 있는 그곳을 자세히 둘러보다 보면, 단골들이 어디를 넘나드는지 알 수 있을 겁니다.</p>',
    // 붉은 줄표 (#96341C — 메일 내 유일한 붉은색). 왼쪽 정렬 짧은 선.
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;"><tr><td style="width:44px;border-top:2px solid #96341C;font-size:0;line-height:0;">&nbsp;</td></tr></table>',
    // 엠블럼 자리 — 여백만(placeholder 박스 없음). 이미지 도착 시 아래 주석 자리에 <img ... alt="너머"> 삽입.
    '<div style="height:64px;">&nbsp;</div>',
    // <!-- EMBLEM: <img src="https://nuh-muh.com/images/emblem.png" width="56" alt="너머" style="display:block;"> -->
    // 최하단 수평선 + 수신거부 문구 ('여기에 말해두십시오'가 링크)
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr><td style="border-top:1px solid #d8ceb2;font-size:0;line-height:0;">&nbsp;</td></tr></table>',
    '<p style="margin:16px 0 0;font-family:' + serif + ';font-size:13px;line-height:1.7;color:' + inkFaint + ';word-break:keep-all;">거미를 그만 보내달라 하시려면, <a href="' + unsubUrl + '" style="color:' + inkFaint + ';text-decoration:underline;">여기에 말해두십시오.</a></p>',
    '</td></tr></table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('');
}

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let email;
  try {
    const body = await req.json();
    email = body.email;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }


  const { data, error: dbError } = await supabase
    .from('members')
    .insert({ email: email })
    .select();


  if (dbError) {
    if (dbError.code === '23505') {
      return new Response(JSON.stringify({ status: 'already' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'DB error', detail: dbError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 수신거부 링크 URL — 3번(수신거부 서버 함수)에서 토큰 생성 로직 완성 후 실제 값 채움.
  // 현재는 자리만. 환영 편지는 트랜잭션성(가입 직접 응답)이라 opt_out 무시하고 항상 발송하지만,
  // 편지 하단 수신거부 링크는 이후 넘기 알림 거부용으로 동일하게 제공한다.
  const unsubUrl = 'https://nuh-muh.com/unsubscribe'; // TODO(3번): ?token=... 붙이기

  const welcomeHtml = buildWelcomeHtml(unsubUrl);
  const welcomeText = [
    '당신의 첫 번째 흔적이 너머 어딘가에 새겨졌습니다.',
    '',
    '이야기와 사람을 잇는 길. 우리는 그 길을 발견하고, 걷고 걸어 잘 닦아놓지요.',
    '',
    '여러 가지 판이 너머에서 열립니다. 다채로운 사람들이 모여 함께 또는 혼자 이야기를 만들고, 그것을 다른 사람들과 주고받지요.',
    '',
    "앞으로 'Nuh-Muh'가 당신에게 꾸준히 편지를 보낼 것입니다. 아는 얼굴이 또 생겨서 좋군요.",
    '',
    '주소는 언제나 편지에 남겨놓겠습니다. nuh-muh.com',
    '',
    '추신. 거미 배달부가 있는 그곳을 자세히 둘러보다 보면, 단골들이 어디를 넘나드는지 알 수 있을 겁니다.',
    '',
    '— Nuh-Muh',
    '',
    '거미를 그만 보내달라 하시려면: ' + unsubUrl,
  ].join('\n');

  try {
    await resend.emails.send({
      from: 'Nuh-Muh <desk@nuh-muh.com>',
      to: email,
      subject: '너머에서, 당신께.',
      html: welcomeHtml,
      text: welcomeText,
    });
  } catch (err) {
    console.log('email error:', err.message);
  }

  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
