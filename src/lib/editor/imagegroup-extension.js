import { Node } from '@tiptap/core';

// 2장 묶음 노드 (마틴: 정확히 2장, 나란히, 그룹 단위 크기/캡션).
// 컨테이너는 div(data-nm-group) — ANCHOR_TAGS에 없고 서버 방어선(규칙1·2·깊이스캔)이
// div를 안 보므로 앵커 비대상. figure/figcaption과 같은 원리.
// atom: 내부를 Tiptap이 편집하지 않음(2 img 고정). 조작은 명령으로만.
//
// 속성: data-size(그룹 크기 5단), data-align(정렬), data-caption(그룹 캡션 하나),
//       src1/src2(두 이미지 주소).
export const ImageGroup = Node.create({
  name: 'imageGroup',
  group: 'block',
  atom: true,        // 통짜 노드 (내부 편집 없음)
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src1: { default: '' },
      src2: { default: '' },
      'data-size': { default: 'full' },   // 그룹은 보통 넓게 → 기본 full
      'data-align': { default: 'center' },
      'data-caption': { default: '' },
    };
  },

  parseHTML() {
    return [{
      tag: 'div[data-nm-group]',
      getAttrs: (el) => {
        const imgs = el.querySelectorAll('img');
        const cap = el.querySelector('figcaption');
        return {
          src1: imgs[0]?.getAttribute('src') || '',
          src2: imgs[1]?.getAttribute('src') || '',
          'data-size': el.getAttribute('data-size') || 'full',
          'data-align': el.getAttribute('data-align') || 'center',
          'data-caption': cap ? (cap.textContent || '') : '',
        };
      },
    }];
  },

  renderHTML({ HTMLAttributes }) {
    const a = HTMLAttributes;
    const size = a['data-size'] || 'full';
    const align = a['data-align'] || 'center';
    const caption = a['data-caption'] || '';

    const inner = [
      ['div', { 'data-nm-group-row': '' },
        ['img', { src: a.src1 || '', alt: '' }],
        ['img', { src: a.src2 || '', alt: '' }],
      ],
    ];
    if (caption && caption.trim()) {
      inner.push(['figcaption', {}, caption]);
    }

    return [
      'div',
      { 'data-nm-group': '', 'data-size': size, 'data-align': align },
      ...inner,
    ];
  },
});
