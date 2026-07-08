// 클라이언트 앵커 주입 (마틴: (ㄴ) 앵커 주입을 클라이언트로 이전).
// DOMParser로 구조를 정확히 읽어, blockquote/li 내부 p를 제외하고 앵커를 주입한다.
// 승계 원칙: 멱등(data-anchor 없는 블록에만 새 ID), 8자 base36, 글 내 충돌 방지.
// "에디터는 앵커를 만들지 않는다" — 주입은 저장 직전 이 함수의 몫.

const ANCHOR_TAGS = ['P', 'H2', 'H3', 'BLOCKQUOTE', 'UL', 'OL', 'LI'];

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

// 이 요소가 "내부 p"인가 — 부모가 blockquote 또는 li인 p.
// 내부 p는 앵커 대상이 아니다 (겉 블록에만 앵커, 참조 모호성 방지).
function isInnerP(el) {
  if (el.tagName !== 'P') return false;
  const parent = el.parentElement;
  if (!parent) return false;
  return parent.tagName === 'BLOCKQUOTE' || parent.tagName === 'LI';
}

/**
 * body HTML에 앵커를 멱등 주입. DOMParser 기반이라 중첩을 정확히 판단.
 * - 앵커 대상 블록 중 내부 p는 제외
 * - 이미 data-anchor 있으면 유지(멱등)
 * - 없는 블록에만 새 ID
 * 반환: 앵커 주입된 HTML 문자열
 */
export function injectAnchorsClient(html) {
  if (!html || typeof html !== 'string') return html;

  const doc = new DOMParser().parseFromString('<div id="__root__">' + html + '</div>', 'text/html');
  const root = doc.getElementById('__root__');
  if (!root) return html;

  // 기존 앵커 수집 (충돌 방지 + 멱등)
  const existing = new Set();
  root.querySelectorAll('[data-anchor]').forEach((el) => {
    const v = el.getAttribute('data-anchor');
    if (v) existing.add(v);
  });

  // 대상 블록 순회
  root.querySelectorAll(ANCHOR_TAGS.join(',')).forEach((el) => {
    if (isInnerP(el)) return;               // 내부 p 제외
    if (el.hasAttribute('data-anchor')) return;  // 멱등: 기존 유지
    el.setAttribute('data-anchor', makeId(existing));
  });

  return root.innerHTML;
}

// 빈 블록인가 — 텍스트도 이미지도 없는 순수 빈 블록 (마틴 (나): "빈" 정의 좁게).
// 이미지가 든 블록은 빈 것이 아니다.
function isEmptyBlock(el) {
  const text = (el.textContent || '').trim();
  if (text.length > 0) return false;
  if (el.querySelector('img')) return false;  // 이미지 있으면 빈 것 아님
  return true;
}

/**
 * 저장 전 본문 전처리 (마틴 파이프라인 순서: 빈 블록 제거 → 앵커 주입).
 * DOMParser 한 번으로 둘 다 처리.
 * - 빈 블록 제거: 텍스트·이미지 둘 다 없는 대상 블록 삭제 (앵커 있어도 제거 = 결번 정상)
 * - 앵커 주입: 남은 블록에 멱등 주입 (내부 p 제외)
 * 반환: { html, removed } — removed는 제거된 빈 블록 수(로그용)
 */
export function preprocessBody(html) {
  if (!html || typeof html !== 'string') return { html: html, removed: 0 };

  const doc = new DOMParser().parseFromString('<div id="__root__">' + html + '</div>', 'text/html');
  const root = doc.getElementById('__root__');
  if (!root) return { html: html, removed: 0 };

  // 1) 빈 블록 제거 — 텍스트도 이미지도 없는 순수 빈 블록 (내부 p 포함, 마틴 (가))
  let removed = 0;
  root.querySelectorAll(ANCHOR_TAGS.join(',')).forEach((el) => {
    // 빈 블록 제거는 내부 p에도 적용 (마틴 (가): 빈 블록 제거의 일관 확장).
    // "빈"의 정의는 동일 — 텍스트도 이미지도 없는 것. 내부 p든 독립 p든 빈 것은 제거.
    if (isEmptyBlock(el)) {
      el.remove();
      removed++;
    }
  });

  // 2) 앵커 주입 (내부 p 제외, 멱등) — 기존 함수 재사용 위해 여기서 직접 순회
  const existing = new Set();
  root.querySelectorAll('[data-anchor]').forEach((el) => {
    const v = el.getAttribute('data-anchor');
    if (v) existing.add(v);
  });
  root.querySelectorAll(ANCHOR_TAGS.join(',')).forEach((el) => {
    if (isInnerP(el)) return;
    if (el.hasAttribute('data-anchor')) return;
    el.setAttribute('data-anchor', makeId(existing));
  });

  return { html: root.innerHTML, removed: removed };
}
