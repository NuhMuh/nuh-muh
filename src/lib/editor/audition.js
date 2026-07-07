import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { AnchorPreserve } from './anchor-extension.js';

// 이미지가 앞뒤 문단 사이에 낀 샘플 (항목 6: 이미지 전후 앵커 온전 확인)
// 이미지는 앵커 대상 아님 (마틴 확정) → img엔 data-anchor 없음
const SAMPLE = [
  '<p data-anchor="aaa11111">이미지 앞 문단이다.</p>',
  '<img src="https://placehold.co/400x200/8b3a2e/ece4cf?text=NUH-MUH" alt="테스트 이미지">',
  '<p data-anchor="bbb22222">이미지 뒤 문단이다.</p>',
  '<h2 data-anchor="ccc33333">소제목</h2>',
  '<blockquote data-anchor="ddd44444">인용한 문장.</blockquote>',
  '<ul data-anchor="eee55555"><li data-anchor="fff66666">목록 항목 하나</li><li data-anchor="ggg77777">목록 항목 둘</li></ul>',
].join('');

const el = document.getElementById('editor');
if (el) {
  const editor = new Editor({
    element: el,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link,
      Image,
      AnchorPreserve,
    ],
    content: SAMPLE,
  });

  const toolbar = document.getElementById('toolbar');
  if (toolbar) {
    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const cmd = btn.dataset.cmd;
      const c = editor.chain().focus();
      if (cmd === 'bold') c.toggleBold().run();
      else if (cmd === 'italic') c.toggleItalic().run();
      else if (cmd === 'h2') c.toggleHeading({ level: 2 }).run();
      else if (cmd === 'h3') c.toggleHeading({ level: 3 }).run();
      else if (cmd === 'quote') c.toggleBlockquote().run();
      else if (cmd === 'bullet') c.toggleBulletList().run();
      else if (cmd === 'ordered') c.toggleOrderedList().run();
      else if (cmd === 'image') {
        c.setImage({ src: 'https://placehold.co/300x150/1c2340/ece4cf?text=NEW+IMG', alt: '삽입 이미지' }).run();
      }
    });
  }

  const btnOut = document.getElementById('btn-out');
  if (btnOut) btnOut.addEventListener('click', () => {
    document.getElementById('output').textContent = editor.getHTML();
  });
  const btnReload = document.getElementById('btn-reload');
  if (btnReload) btnReload.addEventListener('click', () => {
    editor.commands.setContent(SAMPLE);
    document.getElementById('output').textContent = '(다시 로드됨)';
  });

  window.__editor = editor;
}
