import { c as createComponent } from './astro-component_IAje6_d0.mjs';
import 'piccolore';
import { p as renderTemplate, n as renderHead } from './ssr-function_D8uC465_.mjs';
import 'clsx';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const prerender = false;
const $$Audition = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate(_a || (_a = __template(['<html lang="ko" data-astro-cid-wssfr4ss> <head><meta charset="utf-8"><title>Tiptap 오디션</title>', `</head> <body data-astro-cid-wssfr4ss> <h1 data-astro-cid-wssfr4ss>Tiptap 오디션 — 앵커 보존 실증</h1> <p data-astro-cid-wssfr4ss>아래 에디터엔 앵커 붙은 샘플 글이 로드됩니다. 편집 후 "HTML 출력"을 눌러 앵커 생존을 확인하세요.</p> <div class="tt-toolbar" id="toolbar" data-astro-cid-wssfr4ss> <button data-cmd="bold" data-astro-cid-wssfr4ss><b data-astro-cid-wssfr4ss>B</b></button> <button data-cmd="italic" data-astro-cid-wssfr4ss><i data-astro-cid-wssfr4ss>I</i></button> <button data-cmd="h2" data-astro-cid-wssfr4ss>H2</button> <button data-cmd="h3" data-astro-cid-wssfr4ss>H3</button> <button data-cmd="quote" data-astro-cid-wssfr4ss>인용</button> <button data-cmd="bullet" data-astro-cid-wssfr4ss>• 목록</button> <button data-cmd="ordered" data-astro-cid-wssfr4ss>1. 목록</button> </div> <div class="tt-editor" id="editor" data-astro-cid-wssfr4ss></div> <div class="btn-row" data-astro-cid-wssfr4ss> <button id="btn-out" data-astro-cid-wssfr4ss>HTML 출력</button> <button id="btn-reload" data-astro-cid-wssfr4ss>샘플 다시 로드</button> </div> <div class="label" data-astro-cid-wssfr4ss>현재 HTML 출력 (getHTML):</div> <div class="out" id="output" data-astro-cid-wssfr4ss>(HTML 출력을 누르세요)</div> <script type="module">
    import { Editor } from '@tiptap/core';
    import StarterKit from '@tiptap/starter-kit';
    import Link from '@tiptap/extension-link';
    import { AnchorPreserve } from '../../lib/editor/anchor-extension.js';

    // 앵커 붙은 샘플 글 (오디션 항목 커버: 문단·소제목·인용·목록)
    const SAMPLE = [
      '<p data-anchor="aaa11111">첫 문단이다. 이걸 편집해본다.</p>',
      '<h2 data-anchor="bbb22222">소제목</h2>',
      '<p data-anchor="ccc33333">둘째 문단이다.</p>',
      '<blockquote data-anchor="ddd44444">인용한 문장.</blockquote>',
      '<ul data-anchor="eee55555"><li data-anchor="fff66666">목록 항목 하나</li><li data-anchor="ggg77777">목록 항목 둘</li></ul>',
    ].join('');

    const editor = new Editor({
      element: document.getElementById('editor'),
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] } }),
        Link,
        AnchorPreserve,
      ],
      content: SAMPLE,
    });

    // 툴바
    document.getElementById('toolbar').addEventListener('click', (e) => {
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

    document.getElementById('btn-out').addEventListener('click', () => {
      document.getElementById('output').textContent = editor.getHTML();
    });
    document.getElementById('btn-reload').addEventListener('click', () => {
      editor.commands.setContent(SAMPLE);
      document.getElementById('output').textContent = '(다시 로드됨)';
    });

    window.__editor = editor; // 콘솔 디버깅용
  <\/script> </body> </html>`])), renderHead());
}, "/workspaces/nuh-muh/src/pages/desk/audition.astro", void 0);

const $$file = "/workspaces/nuh-muh/src/pages/desk/audition.astro";
const $$url = "/desk/audition";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Audition,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
