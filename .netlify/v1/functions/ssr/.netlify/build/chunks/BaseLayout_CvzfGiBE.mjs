import { c as createComponent } from './astro-component_IAje6_d0.mjs';
import 'piccolore';
import { l as createRenderInstruction, m as maybeRenderHead, p as renderTemplate, n as renderHead, r as renderComponent, o as renderSlot } from './ssr-function_D8uC465_.mjs';
import 'clsx';

async function renderScript(result, id) {
  const inlined = result.inlinedScripts.get(id);
  let content = "";
  if (inlined != null) {
    if (inlined) {
      content = `<script type="module">${inlined}</script>`;
    }
  } else {
    const resolved = await result.resolve(id);
    content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"></script>`;
  }
  return createRenderInstruction({ type: "script", id, content });
}

const $$QuillButton = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<button class="quill-btn" id="quill-btn" aria-label="발행소" title="발행소" data-astro-cid-tc3g6qlm> <div class="quill-reveal" data-astro-cid-tc3g6qlm> <svg class="quill-svg" viewBox="0 0 80 100" aria-hidden="true" data-astro-cid-tc3g6qlm> <!-- 잉크병 --> <g class="inkpot" data-astro-cid-tc3g6qlm> <path class="pot-body" d="M22 66 Q20 62 24 60 L56 60 Q60 62 58 66 L56 92 Q56 96 52 96 L28 96 Q24 96 24 92 Z" fill="var(--ink)" stroke="var(--ink)" stroke-width="1" data-astro-cid-tc3g6qlm></path> <rect class="pot-neck" x="32" y="54" width="16" height="8" rx="2" fill="var(--ink)" data-astro-cid-tc3g6qlm></rect> <ellipse class="pot-mouth" cx="40" cy="54" rx="9" ry="3" fill="#0a0c14" data-astro-cid-tc3g6qlm></ellipse> </g> <!-- 깃펜 --> <g class="quill" data-astro-cid-tc3g6qlm> <!-- 펜대(깃대) --> <path class="quill-shaft" d="M40 58 Q49 38 62 10" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" fill="none" data-astro-cid-tc3g6qlm></path> <!-- 깃털: 깃대 양옆으로 갈라진 깃가지들 --> <g class="quill-barbs" stroke="var(--mark)" stroke-width="1.1" stroke-linecap="round" fill="none" data-astro-cid-tc3g6qlm> <path d="M58 17 Q63 15 66 11 M57 20 Q62 19 65 15 M55 24 Q61 23 64 20 M54 27 Q59 27 62 24 M52 31 Q57 31 60 29 M51 34 Q56 35 58 33" data-astro-cid-tc3g6qlm></path> <path d="M59 16 Q56 12 57 8 M57 21 Q54 18 55 13 M56 25 Q53 22 53 18 M54 28 Q51 26 51 22" data-astro-cid-tc3g6qlm></path> </g> </g> </svg> </div> </button>  ${renderScript($$result, "/workspaces/nuh-muh/src/components/QuillButton.astro?astro&type=script&index=0&lang.ts")}`;
}, "/workspaces/nuh-muh/src/components/QuillButton.astro", void 0);

const $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$BaseLayout;
  const { title } = Astro2.props;
  return renderTemplate`<html lang="ko"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Unicase:wght@500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Noto+Serif+KR:wght@300;400;500;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">${renderHead()}</head> <body> <div class="paper-frame" aria-hidden="true" style="position:fixed; inset:0; pointer-events:none; z-index:200; box-shadow: inset 0 0 70px 0 rgba(88,70,40,0.32), inset 0 0 20px 0 rgba(66,52,28,0.22);"></div> ${renderComponent($$result, "QuillButton", $$QuillButton, {})} ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "/workspaces/nuh-muh/src/layouts/BaseLayout.astro", void 0);

export { $$BaseLayout as $, renderScript as r };
