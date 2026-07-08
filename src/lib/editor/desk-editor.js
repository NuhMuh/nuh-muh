import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { AnchorPreserve } from './anchor-extension.js';

// 발행소 리치 에디터 (2층). 위지윅 ↔ 소스뷰 토글.
// 앵커는 여기서 만들지 않는다 — 저장 직전 preprocessBody(anchor-client)의 몫.
// AnchorPreserve는 "기존 앵커를 보존"만 한다.

let editor = null;
let sourceMode = false;  // false = 위지윅, true = 소스뷰

// 발행소 스크립트에서 접근할 수 있게 전역 헬퍼로 노출
// (get/set을 발행소가 쓰던 방식과 맞추기 위해)
export function initDeskEditor() {
  const el = document.getElementById('ed-editor');
  if (!el) return null;

  editor = new Editor({
    element: el,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false }),
      Image,
      AnchorPreserve,
    ],
    content: '',
    onUpdate: () => { refreshToolbar(); },
    onSelectionUpdate: () => { refreshToolbar(); },
  });

  wireToolbar();
  wireSourceToggle();

  return {
    // 발행소가 저장 시 본문을 가져가는 통로
    getBody() {
      if (sourceMode) {
        const ta = document.getElementById('f-body');
        return ta ? ta.value : '';
      }
      return editor.getHTML();
    },
    // 발행소가 글 불러올 때 본문을 넣는 통로
    setBody(html) {
      editor.commands.setContent(html || '');
      const ta = document.getElementById('f-body');
      if (ta) ta.value = html || '';
      // 불러오면 위지윅 모드로 복귀
      if (sourceMode) toggleSource(false);
    },
    isSourceMode() { return sourceMode; },
  };
}

// 툴바 버튼 동작
function wireToolbar() {
  const tools = document.getElementById('ed-tools');
  if (!tools) return;
  tools.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !editor) return;
    const cmd = btn.dataset.cmd;
    const c = editor.chain().focus();
    if (cmd === 'bold') c.toggleBold().run();
    else if (cmd === 'italic') c.toggleItalic().run();
    else if (cmd === 'h2') c.toggleHeading({ level: 2 }).run();
    else if (cmd === 'h3') c.toggleHeading({ level: 3 }).run();
    else if (cmd === 'quote') c.toggleBlockquote().run();
    else if (cmd === 'bullet') c.toggleBulletList().run();
    else if (cmd === 'ordered') c.toggleOrderedList().run();
    else if (cmd === 'link') {
      const prev = editor.getAttributes('link').href;
      const url = window.prompt('링크 주소:', prev || 'https://');
      if (url === null) return;
      if (url === '') { c.unsetLink().run(); return; }
      c.extendMarkRange('link').setLink({ href: url }).run();
    }
    else if (cmd === 'image') {
      const url = window.prompt('이미지 주소(URL):', 'https://');
      if (!url) return;
      const alt = window.prompt('이미지 설명(alt):', '') || '';
      c.setImage({ src: url, alt: alt }).run();
    }
  });
}

// 툴바 활성 상태 표시
function refreshToolbar() {
  if (!editor) return;
  const map = {
    bold: () => editor.isActive('bold'),
    italic: () => editor.isActive('italic'),
    h2: () => editor.isActive('heading', { level: 2 }),
    h3: () => editor.isActive('heading', { level: 3 }),
    quote: () => editor.isActive('blockquote'),
    bullet: () => editor.isActive('bulletList'),
    ordered: () => editor.isActive('orderedList'),
    link: () => editor.isActive('link'),
  };
  document.querySelectorAll('#ed-tools button').forEach((btn) => {
    const cmd = btn.dataset.cmd;
    if (map[cmd]) btn.classList.toggle('is-active', map[cmd]());
  });
}

// 소스뷰 토글
function wireSourceToggle() {
  const toggle = document.getElementById('ed-source-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => toggleSource(!sourceMode));
}

function toggleSource(toSource) {
  const edEl = document.getElementById('ed-editor');
  const ta = document.getElementById('f-body');
  const tools = document.getElementById('ed-tools');
  const toggle = document.getElementById('ed-source-toggle');
  const warn = document.getElementById('f-bodywarn');
  if (!edEl || !ta) return;

  if (toSource) {
    // 위지윅 → 소스: 현재 HTML을 textarea로
    ta.value = editor.getHTML();
    edEl.style.display = 'none';
    ta.style.display = '';
    if (tools) tools.style.opacity = '0.35', tools.style.pointerEvents = 'none';
    if (toggle) { toggle.textContent = '◀ 에디터로'; toggle.classList.add('is-active'); }
    if (warn) warn.style.display = 'block';
    sourceMode = true;
  } else {
    // 소스 → 위지윅: textarea HTML을 에디터로
    editor.commands.setContent(ta.value || '');
    ta.style.display = 'none';
    edEl.style.display = '';
    if (tools) tools.style.opacity = '', tools.style.pointerEvents = '';
    if (toggle) { toggle.textContent = '</> 소스보기'; toggle.classList.remove('is-active'); }
    if (warn) warn.style.display = 'none';
    sourceMode = false;
  }
}
