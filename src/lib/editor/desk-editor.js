import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { SizedImage } from './image-extension.js';
import { ImageGroup } from './imagegroup-extension.js';
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
      ImageGroup,
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

// 서명 URL로 파일 하나 업로드 → 공개 URL 반환 (공통 헬퍼)
async function uploadOne(file) {
  const signRes = await fetch('/.netlify/functions/sign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: deskTokenForUpload, contentType: file.type }),
  });
  const sign = await signRes.json();
  if (sign.status !== 'ok') throw new Error(sign.detail || '업로드 준비 실패');
  const upRes = await fetch(sign.signedUrl, {
    method: 'PUT', headers: { 'Content-Type': file.type }, body: file,
  });
  if (!upRes.ok) throw new Error('업로드 실패 (' + upRes.status + ')');
  return sign.publicUrl;
}

// 2장 묶음: 파일 2개 선택 → 둘 다 업로드 → imageGroup 노드 삽입
function triggerImageGroupUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp,image/gif';
  input.multiple = true;  // 2장 선택
  input.onchange = async () => {
    const files = Array.from(input.files || []);
    if (files.length < 2) { alert('2장 묶음은 사진을 정확히 2장 선택해야 합니다.'); return; }
    if (files.length > 2) { alert('2장까지만 됩니다. 앞의 2장만 사용합니다.'); }
    const two = files.slice(0, 2);
    for (const f of two) {
      if (f.size > 10 * 1024 * 1024) { alert('각 이미지는 10MB 이하만 가능합니다.'); return; }
    }
    try {
      const url1 = await uploadOne(two[0]);
      const url2 = await uploadOne(two[1]);
      editor.chain().focus().insertContent({
        type: 'imageGroup',
        attrs: { src1: url1, src2: url2, 'data-size': 'full', 'data-align': 'center', 'data-caption': '' },
      }).run();
    } catch (e) {
      alert('묶음 업로드 오류: ' + e.message);
    }
  };
  input.click();
}

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

// 현재 선택된 노드가 image인지 imageGroup인지 (없으면 null)
function activeImageType() {
  if (editor.isActive('image')) return 'image';
  if (editor.isActive('imageGroup')) return 'imageGroup';
  return null;
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
    else if (cmd === 'imagegroup') {
      triggerImageGroupUpload();
    }
    else if (cmd.indexOf('size-') === 0) {
      // 크기 프리셋 변경 (image 또는 imageGroup, 선택된 쪽)
      const size = cmd.slice(5);
      const t = activeImageType();
      if (t) editor.chain().focus().updateAttributes(t, { 'data-size': size }).run();
    }
    else if (cmd.indexOf('align-') === 0) {
      // 정렬 변경 (float 아님)
      const align = cmd.slice(6);
      const t = activeImageType();
      if (t) editor.chain().focus().updateAttributes(t, { 'data-align': align }).run();
    }
    else if (cmd === 'caption') {
      const t = activeImageType();
      if (t === 'image') {
        // 단일 이미지: 캡션 한 줄
        const cur = editor.getAttributes('image')['data-caption'] || '';
        const cap = window.prompt('캡션 (출처·설명, 비우면 제거):', cur);
        if (cap === null) return;
        editor.chain().focus().updateAttributes('image', { 'data-caption': cap.trim() }).run();
      } else if (t === 'imageGroup') {
        // 2장 묶음: 팝업 2칸(왼/오) → ' | '로 합쳐 한 캡션으로 저장
        const cur = editor.getAttributes('imageGroup')['data-caption'] || '';
        const parts = cur.split(' | ');
        const left = window.prompt('왼쪽 사진 설명 (비워도 됨):', parts[0] || '');
        if (left === null) return;
        const right = window.prompt('오른쪽 사진 설명 (비워도 됨):', parts[1] || '');
        if (right === null) return;
        const l = left.trim(), r = right.trim();
        let merged = '';
        if (l && r) merged = l + ' | ' + r;
        else if (l) merged = l;
        else if (r) merged = r;
        editor.chain().focus().updateAttributes('imageGroup', { 'data-caption': merged }).run();
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

  // 이미지 크기/정렬 버튼: image 또는 imageGroup 선택 시 활성화 + 현재 값 강조
  const imgType = activeImageType();
  const imgActive = !!imgType;
  const imgAttrs = imgActive ? editor.getAttributes(imgType) : {};
  const curSize = imgActive ? (imgAttrs['data-size'] || 'md') : null;
  const curAlign = imgActive ? (imgAttrs['data-align'] || 'center') : null;
  document.querySelectorAll('#ed-tools .ed-imgsize').forEach((btn) => {
    const size = btn.dataset.cmd.slice(5); // size- 접두어
    btn.disabled = !imgActive;
    btn.classList.toggle('is-active', imgActive && curSize === size);
  });
  document.querySelectorAll('#ed-tools .ed-imgalign').forEach((btn) => {
    const align = btn.dataset.cmd.slice(6); // align- 접두어
    btn.disabled = !imgActive;
    btn.classList.toggle('is-active', imgActive && curAlign === align);
  });
  // 캡션 버튼: 이미지 선택 시 활성화, 캡션 있으면 강조
  const hasCaption = imgActive && !!(imgAttrs['data-caption'] || '').trim();
  document.querySelectorAll('#ed-tools .ed-imgcaption').forEach((btn) => {
    btn.disabled = !imgActive;
    btn.classList.toggle('is-active', hasCaption);
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
