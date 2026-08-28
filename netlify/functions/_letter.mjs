// 넘기 알림 편지 조판 (앨리 확정안 · 2026-08-26).
//
// [구조]
//   [닉네임]에게,        ← 수신자별. broadcast.js가 루프 안에서 치환한다.
//   (인사 — 3문장 순환)
//   ── 붉은 줄표
//   [카테고리] · [N번째 넘기]
//   [제목]                ← 편지에서 가장 큰 글자
//   (한마디 또는 폴백)
//   [ 보러 간다 ]
//   ── 붉은 줄표
//   [엠블럼]
//   ← 본문은 여기서 끝. 이하 broadcast.js의 footer가 자동으로 붙는다.
//
// [설계 원칙 — 앨리] 이 편지는 앞의 둘과 달리 반복해서 받는다. 매번 같은 인사를
//   반복하면 두 번째부터 소음이 된다. 말을 최소로 하고 자리를 정확히 만든다.
//   편지가 스스로 말하려 들면 안 되며, 글로 데려가는 통로여야 한다.
//   호명으로 열고 서명으로 닫는다 — 완전한 서간 형식이며 앞의 두 편지에는 없던 구조다.
//
// ★수평선을 본문에 넣지 않는다. broadcast.js의 footer가 자체 수평선을 포함하므로
//   여기서 또 넣으면 선이 두 줄로 나온다. 엠블럼과 아래 여백으로 끝낸다(A-1과 같은 구조).
//
// ★브랜드 색의 원본은 src/styles/global.css이며 아래 값들은 그 복제본이다.
//   메일 HTML은 CSS 변수를 쓸 수 없어(클라이언트 미지원) 인라인 값이 불가피하다.
//   global.css의 색이 바뀌면 여기도 함께 고칠 것. (붉은색 원칙: #8b3a2e 하나뿐)

// ★서체 스택 (2026-08-26 교체) — 세 편지가 같은 스택을 쓴다.
//   iOS에서는 이 스택이 먹히지 않는다. 실측 확인 사실이며 추정이 아니다:
//   2026-08-26 A/B 비교 발송에서 명조 우선 스택과 애플 고딕 우선 스택이
//   아이폰 메일 앱에서 동일하게 보였다. iOS에 Noto Serif KR·Nanum Myeongjo·
//   AppleMyungjo·Batang이 모두 없고, serif 키워드도 한글에서는 고딕으로 떨어진다.
//   바꾸려면 웹폰트 임베드가 필요하나 배제된 방식이다(마틴 확정) — 현재 구조에서 해결 불가.
//   macOS·안드로이드·윈도우에서는 명조가 잡힌다.
const serif = "'Noto Serif KR', 'Nanum Myeongjo', 'AppleMyungjo', 'Batang', serif";

const ink = '#1c2340';        // = --ink
const mark = '#8b3a2e';       // = --mark (붉은색 — 이 편지에서는 줄표 둘에만 쓴다)
const inkSoft = '#6b6048';    // = --ink-soft
const paper = '#f4eedd';      // = --paper-letter
const beige = '#ece4cf';      // = --paper
const edge = '#b8ab86';       // = --edge

// 호명 줄이 들어갈 자리. broadcast.js가 수신자별로 치환한다.
// ★이름만 바꾸는 것이 아니라 줄 전체를 넣거나 뺀다 — 닉네임이 없을 때 이름 자리만
//   비우면 "에게," 같은 잔재가 남는다(/welcome 이름 호명 폴백과 같은 원칙, 통합본 §5-20).
export const NICK_SLOT = '{{NICKNAME_BLOCK}}';

// 푸터가 들어갈 자리. broadcast.js가 여기에 수신자별 푸터를 끼운다.
// ★카드 '안'에 두는 것이 요점이다. 자리표시자가 없으면 broadcast가 완성본 뒤에 붙이는데,
//   그러면 종이 카드 바깥에 푸터가 놓여 편지와 분리돼 보인다(운영자가 결함으로 읽었다).
//   환영 편지는 푸터가 카드 안에 있으므로, 세 편지가 같은 집에서 온 것으로 보이려면 이쪽이 맞다.
// ※자리표시자가 없는 호출은 기존대로 동작한다 — 앞으로 생길 다른 브로드캐스트는 영향받지 않는다.
export const FOOTER_SLOT = '{{FOOTER_BLOCK}}';

// 인사 — 3문장 무작위 순환. [운영자 확정] 문장을 변경하지 말 것.
// ※엽서 카드의 pickSentence(PostcardSignup.astro)와 달리 '직전 인덱스 기억'과 guard가 없다.
//   서버 함수는 호출마다 메모리가 초기화되므로 직전을 기억할 수 없기 때문이다.
//   엽서와 다르게 짜인 것은 결함이 아니라 실행 환경의 차이다.
//   셋 중 하나라 연속으로 같은 문장이 나와도 크게 어색하지 않다는 판단(마틴).
const GREETINGS = [
  '새 글이 나왔습니다.',
  '오늘도 한 편 넘깁니다.',
  '거미가 다녀갑니다.',
];

// 한마디를 비웠을 때 대신 들어가는 문구. [앨리 확정]
// ★폴백은 어떤 글에 붙어도 참이어야 하므로 글에 대해 말할 수 없다. 글이 놓인 자리에
//   대해서만 말한다 — 평가하지 않고, 권하지 않고, 기대를 심지 않는다.
//   이 편지가 미래 예언 원칙에서 가장 미끄러지기 쉬운 자리이며, 폴백은 그 미끄러짐이
//   자동으로 반복될 수 있는 유일한 문장이라 가장 엄격하게 잡았다.
const FALLBACK = '여기 두었습니다.';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 문장 단위 줄바꿈 — 운영자 요청 사항(통합본 §5-4).
// 실제 해당하는 자리는 한마디 하나뿐이다(인사·폴백·푸터는 이미 한 문장이거나 나뉘어 있다).
function splitSentences(text) {
  return esc(text)
    .split(/(?<=[.!?。])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join('<br>');
}

/**
 * 호명 줄 HTML. broadcast.js가 수신자별로 이 결과를 NICK_SLOT에 끼운다.
 * 닉네임이 없으면 빈 문자열 — 줄 자체가 사라지고 인사가 편지의 첫 줄이 된다.
 * 판단 기준은 신분이 아니라 닉네임 유무다(마틴 판정) — status로 갈래를 나누지 않는다.
 */
export function nickBlock(nickname) {
  const n = (nickname || '').trim();
  if (!n) return '';
  return '<p style="margin:0 0 10px;font-family:' + serif
    + ';font-size:16px;line-height:1.85;color:' + ink
    + ';word-break:keep-all;">' + esc(n) + '에게,</p>';
}

/**
 * 넘기 알림 편지.
 * @param {object} a - { title, slug, category, week, letter_body }
 * @returns {{ subject: string, html: string }}
 */
export function buildLetter(a) {
  const title = esc(a.title || '');
  const url = 'https://nuh-muh.com/' + encodeURIComponent(a.slug || '');
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  const said = (a.letter_body || '').trim();
  const body = said ? splitSentences(said) : esc(FALLBACK);

  // 카테고리 · N번째 넘기 — ★"주차"·"week"는 독자 화면에 절대 노출하지 않는다.
  const meta = [
    a.category ? esc(a.category) : null,
    (a.week != null && a.week !== '') ? (esc(String(a.week)) + '번째 넘기') : null,
  ].filter(Boolean).join(' · ');

  const rule = '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0;">'
    + '<tr><td style="width:44px;border-top:2px solid ' + mark
    + ';font-size:0;line-height:0;">&nbsp;</td></tr></table>';

  const html = [
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background:' + beige + ';">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:'
      + beige + ';padding:32px 16px;">',
    '<tr><td align="center">',
    // 본문 종이 영역 — 밝은 종이색 + 가는 단선 테두리(직각). 폭 600px [확정치]
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:'
      + paper + ';border:1px solid ' + edge + ';">',
    '<tr><td style="padding:52px 44px;">',

    // ① 호명 — 수신자별 치환 자리
    NICK_SLOT,

    // ② 인사
    '<p style="margin:0;font-family:' + serif + ';font-size:16px;line-height:1.85;color:'
      + ink + ';word-break:keep-all;">' + esc(greeting) + '</p>',

    rule,

    // ③ 글 정보 — 카테고리·넘기는 작게 한 줄, 제목은 크게
    meta ? '<p style="margin:0 0 10px;font-family:' + serif + ';font-size:13px;line-height:1.7;color:'
      + inkSoft + ';word-break:keep-all;">' + meta + '</p>' : '',
    '<p style="margin:0 0 18px;font-family:' + serif
      + ';font-size:24px;font-weight:700;line-height:1.45;color:' + ink
      + ';word-break:keep-all;">' + title + '</p>',

    // ④ 한마디 또는 폴백
    '<p style="margin:0 0 26px;font-family:' + serif + ';font-size:16px;line-height:1.85;color:'
      + ink + ';word-break:keep-all;">' + body + '</p>',

    // ⑤ 버튼 — 확인 메일 버튼과 같은 계보(남색 채움 + 자간 조판).
    //   편지는 합쇼체이나 버튼은 받는 사람의 동작이므로 평서형 종결을 잇는다.
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;">',
    '<tr><td style="background:' + ink + ';">',
    '<a href="' + url + '" style="display:block;padding:15px 34px;font-family:' + serif
      + ';font-size:14px;letter-spacing:0.22em;color:' + paper
      + ';text-decoration:none;">보러 간다</a>',
    '</td></tr></table>',

    rule,

    // ⑥ 낙관 — 엠블럼. [확정치] 줄표 아래 28px / 엠블럼 56px / 아래 24px.
    // ★alt "너머 드림."은 대체 설명이 아니라 이미지 차단 환경에서 실제 출력되는 문자열이다.
    //   차단되면 낙관 자리에 이 맺음말이 남아 편지가 오히려 온전해진다.
    //   "여기 두었습니다 → (버튼) → 너머 드림."으로 호응한다 — 두고 갔다는 말과 서명이
    //   맞물려, 누가 두고 갔는지가 서명으로 밝혀진다. alt를 설명문으로 바꾸지 말 것.
    // width는 픽셀로 명시(CSS만으로는 아웃룩이 무시), 높이 미지정으로 비율 유지.
    '<div style="height:28px;">&nbsp;</div>',
    '<img src="https://nuh-muh.com/images/emblem.png" width="56" alt="너머 드림." style="display:block;border:0;">',
    '<div style="height:24px;">&nbsp;</div>',

    // ★수평선을 넣지 않는다 — footer가 자체 수평선을 긋는다. 여기서 또 넣으면 두 줄이 된다.
    //   본문은 엠블럼과 위 여백으로 끝나고, 그 아래를 푸터가 받는다.
    FOOTER_SLOT,
    '</td></tr></table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('');

  return { subject: title, html };
}
