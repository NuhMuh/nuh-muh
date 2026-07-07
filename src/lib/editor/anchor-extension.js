import { Extension } from '@tiptap/core';

// data-anchor 보존 익스텐션 (마틴 오디션 대상)
// ProseMirror는 스키마에 없는 속성을 버린다 → data-anchor를 명시적으로 선언해
// 불러오기(parseHTML)와 출력(renderHTML) 양쪽에서 보존한다.
// 불변 조건: 에디터는 앵커를 "보존"만 한다. 새로 만들지 않는다(default: null).
//            ID 부여는 저장 파이프라인(injectAnchors)의 몫.
export const AnchorPreserve = Extension.create({
  name: 'anchorPreserve',

  addGlobalAttributes() {
    return [
      {
        // 우리 앵커 대상 블록 타입 (Tiptap 노드명 기준)
        types: [
          'paragraph',
          'heading',
          'blockquote',
          'bulletList',
          'orderedList',
          'listItem',
        ],
        attributes: {
          dataAnchor: {
            default: null,
            // 불러올 때: HTML의 data-anchor를 읽어 노드 속성으로
            parseHTML: (element) => element.getAttribute('data-anchor'),
            // 출력할 때: 값이 있으면 data-anchor로 다시 씀. 없으면 아무것도 안 붙임(새 블록)
            renderHTML: (attributes) => {
              if (!attributes.dataAnchor) return {};
              return { 'data-anchor': attributes.dataAnchor };
            },
          },
        },
      },
    ];
  },
});
