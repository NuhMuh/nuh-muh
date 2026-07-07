import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { AnchorPreserve } from './anchor-extension.js';

const SAMPLE = [
  '<p data-anchor="aaa11111">첫 문단이다. 이걸 편집해본다.</p>',
  '<h2 data-anchor="bbb22222">소제목</h2>',
  '<p data-anchor="ccc33333">둘째 문단이다.</p>',
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
