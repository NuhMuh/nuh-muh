import Image from '@tiptap/extension-image';

// 이미지 크기 프리셋 확장 (마틴: 프리셋 방식, 정렬/float 없음 — 확정선 유지).
// 기본 Image에 data-size 속성만 추가. sm/md/lg. 없으면 md(기본).
// class가 아닌 data-size를 쓰는 이유: data-anchor처럼 data-* 속성으로 일관.
export const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),  // 기존 src, alt 등 유지
      'data-size': {
        default: 'md',
        parseHTML: (el) => el.getAttribute('data-size') || 'md',
        renderHTML: (attrs) => {
          const size = attrs['data-size'] || 'md';
          return { 'data-size': size };
        },
      },
    };
  },
});
