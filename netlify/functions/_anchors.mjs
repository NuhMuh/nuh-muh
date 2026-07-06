// 앵커 주입 — 외부 파서 의존성 없음 (정규식 기반).
// 너머 본문은 정형화된 단순 블록 구조(문단·소제목·인용·목록, 중첩 없음)라
// 정규식으로 안전. 주입 후 카운트 검증으로 예상 밖 구조를 감지(조용한 실패 금지).

// 앵커를 부여할 블록 요소 (이미지 제외)
const ANCHOR_TAGS = ['p', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li'];

// 여는 태그 매칭: <p>, <p class="x">, <p ...> 등. 닫는 태그(</p>)는 제외.
// 태그명 뒤에 공백이나 > 가 오는 경우만 (ppp 같은 오매칭 방지)
const TAG_OPEN_RE = new RegExp(
  '<(' + ANCHOR_TAGS.join('|') + ')(\\s[^>]*)?>',
  'gi'
);

// 순서 무관 랜덤 ID (8자 base36). 순서번호 절대 금지.
function makeId(existing) {
  let id;
  do {
    id = Math.random().toString(36).slice(2, 10);
    if (id.length < 8) id = (id + '00000000').slice(0, 8);
  } while (existing.has(id));
  existing.add(id);
  return id;
}

// 대상 블록 여는 태그의 개수를 셈 (검증용)
export function countBlocks(html) {
  if (!html || typeof html !== 'string') return 0;
  const m = html.match(TAG_OPEN_RE);
  return m ? m.length : 0;
}

// data-anchor 속성의 개수를 셈 (검증용)
export function countAnchors(html) {
  if (!html || typeof html !== 'string') return 0;
  const m = html.match(/data-anchor\s*=/gi);
  return m ? m.length : 0;
}

/**
 * body HTML의 각 블록 요소에 data-anchor를 멱등 주입.
 * - 이미 data-anchor 있는 태그는 건드리지 않음 (기존 ID 불변)
 * - 없는 블록에만 새 ID 부여
 * 반환: 앵커 주입된 HTML 문자열
 */
export function injectAnchors(html) {
  if (!html || typeof html !== 'string') return html;

  // 기존 앵커 수집 (충돌 방지 + 멱등)
  const existing = new Set();
  const existingMatch = html.match(/data-anchor\s*=\s*"([^"]+)"/gi);
  if (existingMatch) {
    existingMatch.forEach((frag) => {
      const v = frag.match(/data-anchor\s*=\s*"([^"]+)"/i);
      if (v && v[1]) existing.add(v[1]);
    });
  }

  // 각 대상 여는 태그를 검사해서, data-anchor 없으면 주입
  const out = html.replace(TAG_OPEN_RE, (full, tag, attrs) => {
    // 이미 이 태그에 data-anchor가 있으면 그대로 둠 (멱등)
    if (attrs && /\sdata-anchor\s*=/i.test(attrs)) {
      return full;
    }
    const id = makeId(existing);
    const attrStr = attrs || '';
    return '<' + tag + attrStr + ' data-anchor="' + id + '">';
  });

  return out;
}

/**
 * 주입 결과 검증 (마틴 지시: 조용한 부분 실패 금지).
 * 대상 블록 개수 === 앵커 개수 여야 정상.
 * 반환: { ok, blocks, anchors }
 */
export function verifyAnchors(html) {
  const blocks = countBlocks(html);
  const anchors = countAnchors(html);
  return { ok: blocks === anchors, blocks, anchors };
}
