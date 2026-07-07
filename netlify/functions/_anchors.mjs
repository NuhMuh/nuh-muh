// 앵커 서버 검증 — 최종 방어선 (마틴: (ㄴ) 주입은 클라이언트로 이전됨).
//
// [변경 이력] 앵커 주입(injectAnchors)은 클라이언트(src/lib/editor/anchor-client.js)로
// 이전되었다. 이유: 내부 p 구분은 구조 판단이고, 그것은 파서(클라이언트 DOMParser)의 일.
// 서버 정규식은 중첩을 해석하지 않고 "우회 저장"만 막는 최종 방어선으로 남는다.
//
// 방어선 3규칙 (마틴 지시):
//  1. p 이외 대상 태그(h2,h3,blockquote,ul,ol,li)는 여는 태그 전수가 data-anchor 필수.
//     (이 태그들은 "내부에 생겨 앵커 없어도 되는" 경우가 없음 → 중첩 해석 불요)
//  2. 앵커 없는 p 개수 ≤ (blockquote 여는 태그 수 + li 여는 태그 수).
//     (앵커 없는 p가 합법인 유일한 경우 = blockquote/li 내부 p. 산술 상한만 확인)
//  3. anchor ID 중복 거부 (글 내 유일성).

// --- 정규식 헬퍼 ---

// 특정 태그의 여는 태그 전체를 매칭 (닫는 태그 제외)
function openTagRe(tag) {
  return new RegExp('<' + tag + '(\\s[^>]*)?>', 'gi');
}

// 특정 태그의 여는 태그 수
function countOpenTags(html, tag) {
  const m = html.match(openTagRe(tag));
  return m ? m.length : 0;
}

// 특정 태그의 여는 태그 중 data-anchor 없는 것의 수
function countOpenTagsWithoutAnchor(html, tag) {
  const m = html.match(openTagRe(tag));
  if (!m) return 0;
  return m.filter((frag) => !/\sdata-anchor\s*=/i.test(frag)).length;
}

/**
 * 서버 최종 방어선 검증. 3규칙.
 * 반환: { ok, reason?, detail? }
 */
export function verifyAnchors(html) {
  if (!html || typeof html !== 'string') {
    return { ok: true }; // 빈 본문은 검증 대상 아님 (상위에서 body 필수 검사함)
  }

  // 규칙 1: p 이외 대상 태그는 전수 data-anchor 필수
  const strictTags = ['h2', 'h3', 'blockquote', 'ul', 'ol', 'li'];
  for (const tag of strictTags) {
    const missing = countOpenTagsWithoutAnchor(html, tag);
    if (missing > 0) {
      return {
        ok: false,
        reason: 'missing-anchor',
        detail: '<' + tag + '> 태그 중 ' + missing + '개가 앵커 없이 저장 시도됨 (주입 미경유 의심)',
      };
    }
  }

  // 규칙 2: 앵커 없는 p 개수 ≤ blockquote 수 + li 수
  const pWithoutAnchor = countOpenTagsWithoutAnchor(html, 'p');
  const bqCount = countOpenTags(html, 'blockquote');
  const liCount = countOpenTags(html, 'li');
  const innerPAllowance = bqCount + liCount;
  if (pWithoutAnchor > innerPAllowance) {
    return {
      ok: false,
      reason: 'unanchored-p',
      detail: '앵커 없는 <p> ' + pWithoutAnchor + '개가 허용치(' + innerPAllowance + ')를 초과 (독립 p 주입 미경유 의심)',
    };
  }

  // 규칙 3: anchor ID 중복 거부
  const ids = [];
  const idMatch = html.match(/data-anchor\s*=\s*"([^"]+)"/gi);
  if (idMatch) {
    for (const frag of idMatch) {
      const v = frag.match(/data-anchor\s*=\s*"([^"]+)"/i);
      if (v && v[1]) ids.push(v[1]);
    }
  }
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) {
      return { ok: false, reason: 'duplicate-anchor', detail: '중복 앵커 ID: ' + id };
    }
    seen.add(id);
  }

  return { ok: true };
}
