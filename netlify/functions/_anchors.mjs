import { parse } from 'node-html-parser';

// 앵커를 부여할 블록 요소들 (이미지 제외)
const ANCHOR_TAGS = new Set(['p', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li']);

// 순서 무관 랜덤 ID (8자 base36). 순서번호 절대 금지.
function makeId(existing) {
  let id;
  do {
    id = Math.random().toString(36).slice(2, 10);
    // 8자 보장 (짧게 나오면 다시)
    if (id.length < 8) id = (id + '00000000').slice(0, 8);
  } while (existing.has(id));
  existing.add(id);
  return id;
}

/**
 * body HTML의 각 블록 요소에 data-anchor를 멱등 주입.
 * - 이미 data-anchor 있으면 건드리지 않음 (기존 ID 불변)
 * - 없는 블록에만 새 ID 부여
 * - 같은 글 안에서 ID 충돌 방지
 * 반환: 앵커가 주입된 HTML 문자열
 */
export function injectAnchors(html) {
  if (!html || typeof html !== 'string') return html;

  const root = parse(html, {
    lowerCaseTagName: false,
    comment: true,
    // 텍스트/공백 보존 — 화면 무변화 위해 원본 최대한 유지
    blockTextElements: { script: true, style: true, pre: true, code: true },
  });

  // 이미 존재하는 앵커 수집 (충돌 방지 + 멱등)
  const existing = new Set();
  root.querySelectorAll('[data-anchor]').forEach((el) => {
    const a = el.getAttribute('data-anchor');
    if (a) existing.add(a);
  });

  // 대상 태그 순회하며 없는 것에만 부여
  root.querySelectorAll('*').forEach((el) => {
    const tag = (el.rawTagName || '').toLowerCase();
    if (!ANCHOR_TAGS.has(tag)) return;
    if (el.hasAttribute('data-anchor')) return; // 멱등: 기존 유지
    el.setAttribute('data-anchor', makeId(existing));
  });

  return root.toString();
}
