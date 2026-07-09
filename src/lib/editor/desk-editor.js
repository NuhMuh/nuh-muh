import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { SizedImage } from './image-extension.js';
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
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Link.configure({ openOnClick: false }),
      SizedImage,
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

// 이미지 업로드 (서명 URL 방식): 파일 선택 → 서버서 서명URL 발급 → 브라우저 직접 업로드 → 공개URL 삽입
let deskTokenForUpload = null;  // 발행소가 주입 (operator 토큰)
export function setUploadToken(tok) { deskTokenForUpload = tok; }

function triggerImageUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp,image/gif';
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('이미지는 10MB 이하만 가능합니다.'); return; }
    try {
      // 1) 서명 URL 요청 (operator 인증)
      const signRes = await fetch('/.netlify/functions/sign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: deskTokenForUpload, contentType: file.type }),
      });
      const sign = await signRes.json();
      if (sign.status !== 'ok') { alert('업로드 준비 실패: ' + (sign.detail || '')); return; }

      // 2) 서명 URL로 브라우저 직접 업로드 (→ Storage)
      const upRes = await fetch(sign.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!upRes.ok) { alert('업로드 실패 (' + upRes.status + ')'); return; }

      // 3) 공개 URL을 에디터에 삽입 (alt는 삽입 후 운영자가 소스뷰 등에서 조정 가능)
      const alt = window.prompt('이미지 설명(alt, 비워도 됨):', '') || '';
      editor.chain().focus().setImage({ src: sign.publicUrl, alt: alt }).run();
    } catch (e) {
      alert('업로드 오류: ' + e.message);
    }
  };
  input.click();
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
      triggerImageUpload();
    }
    else if (cmd === 'img-sm' || cmd === 'img-md' || cmd === 'img-lg') {
      // 선택된 이미지의 크기 프리셋 변경 (마틴: 프리셋, 정렬 없음)
      const size = cmd.slice(4); // 'sm' | 'md' | 'lg'
      if (editor.isActive('image')) {
        editor.chain().focus().updateAttributes('image', { 'data-size': size }).run();
      }
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

  // 이미지 크기 버튼: 이미지 선택 시에만 활성화 + 현재 크기 강조
  const imgActive = editor.isActive('image');
  const curSize = imgActive ? (editor.getAttributes('image')['data-size'] || 'md') : null;
  document.querySelectorAll('#ed-tools .ed-imgsize').forEach((btn) => {
    const size = btn.dataset.cmd.slice(4); // sm/md/lg
    btn.disabled = !imgActive;             // 이미지 선택 안 됐으면 비활성
    btn.classList.toggle('is-active', imgActive && curSize === size);
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
