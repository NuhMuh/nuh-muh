import Image from '@tiptap/extension-image';

// 이미지 조판 확장 (마틴: 프리셋 방식, float 없음 — 확정선 유지).
// 기본 Image에 data-size(크기 5단) + data-align(정렬 좌/중/우) 속성 추가.
// data-* 속성으로 일관(data-anchor와 결 맞춤). 앵커 비대상.
//
// data-size: xs/sm/md/lg/full (기본 md)
// data-align: left/center/right (기본 center) — float 아님. 한 줄 통째 차지하되
//             그 줄 안에서의 위치만. 글이 옆으로 흐르지 않음(감싸기는 발행 후).
export const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),  // 기존 src, alt 등 유지
      'data-size': {
        default: 'md',
        parseHTML: (el) => el.getAttribute('data-size') || 'md',
        renderHTML: (attrs) => ({ 'data-size': attrs['data-size'] || 'md' }),
      },
      'data-align': {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') || 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs['data-align'] || 'center' }),
      },
    };
  },
});
