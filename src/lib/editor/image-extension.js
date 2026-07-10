import Image from '@tiptap/extension-image';

// 이미지 조판 확장 (마틴: 프리셋, float 없음, 캡션 figure/figcaption).
// data-size(5단) + data-align(좌/중/우) + data-caption(캡션 텍스트).
// data-* 속성으로 일관(data-anchor와 결). figure/figcaption 모두 앵커 비대상
// (ANCHOR_TAGS에 없으므로 주입·서버 방어선 집계 대상 아님).
//
// 캡션 있으면 <figure><img><figcaption> 로 렌더, 없으면 <img> 단독.
// figcaption은 텍스트 속성(data-caption)이라 내부에 p가 안 생김 → 깊이 스캔 무관.
export const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),  // src, alt 등 유지
      // figure로 감싸인 경우 자식 img에서 src/alt를 읽어야 함 (유실 방지)
      src: {
        default: '',
        parseHTML: (el) => el.getAttribute('src') || el.querySelector?.('img')?.getAttribute('src') || '',
        renderHTML: (attrs) => (attrs.src ? { src: attrs.src } : {}),
      },
      alt: {
        default: '',
        parseHTML: (el) => el.getAttribute('alt') || el.querySelector?.('img')?.getAttribute('alt') || '',
        renderHTML: (attrs) => (attrs.alt ? { alt: attrs.alt } : {}),
      },
      'data-size': {
        default: 'md',
        parseHTML: (el) => el.getAttribute('data-size') || el.querySelector?.('img')?.getAttribute('data-size') || 'md',
        renderHTML: (attrs) => ({ 'data-size': attrs['data-size'] || 'md' }),
      },
      'data-align': {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') || el.querySelector?.('img')?.getAttribute('data-align') || 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs['data-align'] || 'center' }),
      },
      'data-caption': {
        default: '',
        parseHTML: (el) => {
          // figure면 figcaption 텍스트, img면 data-caption 속성
          const cap = el.querySelector?.('figcaption');
          if (cap) return cap.textContent || '';
          return el.getAttribute('data-caption') || '';
        },
        renderHTML: (attrs) => ({ 'data-caption': attrs['data-caption'] || '' }),
      },
    };
  },

  // figure/img 둘 다 파싱 (기존 단독 img 글도, 새 figure 글도 읽음)
  parseHTML() {
    return [
      { tag: 'figure[data-nm-figure]' },
      { tag: 'img[src]' },
    ];
  },

  // 캡션 유무로 렌더 분기
  renderHTML({ HTMLAttributes }) {
    const caption = HTMLAttributes['data-caption'] || '';
    const size = HTMLAttributes['data-size'] || 'md';
    const align = HTMLAttributes['data-align'] || 'center';
    const src = HTMLAttributes.src || '';
    const alt = HTMLAttributes.alt || '';

    const imgAttrs = { src, alt, 'data-size': size, 'data-align': align };

    if (caption && caption.trim()) {
      // figure 컨테이너에 크기·정렬(조판 단위), img는 순수, figcaption은 텍스트
      return [
        'figure',
        { 'data-nm-figure': '', 'data-size': size, 'data-align': align },
        ['img', imgAttrs],
        ['figcaption', {}, caption],
      ];
    }
    return ['img', imgAttrs];
  },
});
