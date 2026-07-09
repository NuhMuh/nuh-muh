import { c as createComponent } from './astro-component_nLdLDFF8.mjs';
import 'piccolore';
import { n as renderHead, p as renderTemplate } from './ssr-function_B09diSc_.mjs';
import 'clsx';
import { r as renderScript } from './script_Cm-RTDgV.mjs';

const prerender = false;
const $$Audition = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="ko" data-astro-cid-wssfr4ss> <head><meta charset="utf-8"><title>Tiptap 오디션</title>${renderHead()}</head> <body data-astro-cid-wssfr4ss> <h1 data-astro-cid-wssfr4ss>Tiptap 오디션 — 앵커 보존 실증</h1> <p data-astro-cid-wssfr4ss>아래 에디터엔 앵커 붙은 샘플 글이 로드됩니다. 편집 후 "HTML 출력"을 눌러 앵커 생존을 확인하세요.</p> <div class="tt-toolbar" id="toolbar" data-astro-cid-wssfr4ss> <button data-cmd="bold" data-astro-cid-wssfr4ss><b data-astro-cid-wssfr4ss>B</b></button> <button data-cmd="italic" data-astro-cid-wssfr4ss><i data-astro-cid-wssfr4ss>I</i></button> <button data-cmd="h2" data-astro-cid-wssfr4ss>H2</button> <button data-cmd="h3" data-astro-cid-wssfr4ss>H3</button> <button data-cmd="quote" data-astro-cid-wssfr4ss>인용</button> <button data-cmd="bullet" data-astro-cid-wssfr4ss>• 목록</button> <button data-cmd="ordered" data-astro-cid-wssfr4ss>1. 목록</button> <button data-cmd="image" data-astro-cid-wssfr4ss>🖼 이미지</button> </div> <div class="tt-editor" id="editor" data-astro-cid-wssfr4ss></div> <div class="btn-row" data-astro-cid-wssfr4ss> <button id="btn-out" data-astro-cid-wssfr4ss>HTML 출력</button> <button id="btn-reload" data-astro-cid-wssfr4ss>샘플 다시 로드</button> </div> <div class="label" data-astro-cid-wssfr4ss>현재 HTML 출력 (getHTML):</div> <div class="out" id="output" data-astro-cid-wssfr4ss>(HTML 출력을 누르세요)</div> ${renderScript($$result, "/workspaces/nuh-muh/src/pages/desk/audition.astro?astro&type=script&index=0&lang.ts")} </body> </html>`;
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
