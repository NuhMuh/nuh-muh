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

  // 규칙 2: 깊이 스캔 (마틴 재설계 — 산술 상한 폐기)
  // 태그를 앞에서부터 순차 스캔. blockquote/li 여는 +1, 닫는 -1로 깊이 카운터.
  // 앵커 없는 p가 깊이>0이면 합법(내부 p), 깊이=0이면 거부(독립 p 주입 미경유).
  // 앵커 있는 p는 깊이와 무관하게 합법. 서버가 직접 스캔 — 클라이언트 값 안 믿음.
  // (패턴 매칭이 아닌 선형 스캔이므로 정규식 중첩 취약점 없음)
  {
    // 모든 태그를 순서대로 토큰화: <tag ...> 또는 </tag>
    const tokenRe = /<(\/?)(blockquote|li|p)(\s[^>]*)?>/gi;
    let depth = 0;
    let m;
    while ((m = tokenRe.exec(html)) !== null) {
      const isClose = m[1] === '/';
      const tag = m[2].toLowerCase();
      const attrs = m[3] || '';

      if (tag === 'blockquote' || tag === 'li') {
        if (isClose) {
          depth = Math.max(0, depth - 1);
        } else {
          depth += 1;
        }
      } else if (tag === 'p' && !isClose) {
        // 앵커 없는 여는 p
        const hasAnchor = /\sdata-anchor\s*=/i.test(attrs);
        if (!hasAnchor && depth === 0) {
          return {
            ok: false,
            reason: 'unanchored-p',
            detail: '앵커 없는 독립 <p>가 발견됨 (깊이 0, 주입 미경유 의심)',
          };
        }
      }
    }
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
