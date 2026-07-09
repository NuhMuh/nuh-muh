import { c as createComponent } from './astro-component_B7AB7GD3.mjs';
import 'piccolore';
import { m as maybeRenderHead, p as renderTemplate, j as addAttribute, r as renderComponent } from './ssr-function_B8RbhC4x.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BW6bc_l5.mjs';
import 'clsx';
import { r as renderScript } from './script_DkA-WtgU.mjs';
import { createClient } from '@supabase/supabase-js';

const $$Masthead = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<header class="masthead" data-astro-cid-r6zpem2t> <a href="/" class="masthead-link" data-astro-cid-r6zpem2t><h1 class="reveal reveal-1" data-astro-cid-r6zpem2t>Nuh<span class="dash" data-astro-cid-r6zpem2t>—</span>Muh</h1></a> </header>`;
}, "/workspaces/nuh-muh/src/components/Masthead.astro", void 0);

const $$WorkCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$WorkCard;
  const { work, isSpotlight = false } = Astro2.props;
  const href = "/work/" + work.id;
  const sizeClass = "slot-" + (work.slotSize || 4);
  const images = work.hoverImages || [];
  const titles = work.articleTitles || [];
  const hasArticles = titles.length > 0;
  const classList = ["card", "color-" + work.color];
  if (isSpotlight) {
    classList.push("card-spotlight");
  } else {
    classList.push(sizeClass);
  }
  if (work.isComing) classList.push("card-coming");
  const className = classList.join(" ");
  const titleChars = [...work.title];
  return renderTemplate`${maybeRenderHead()}<a${addAttribute(href, "href")}${addAttribute(className, "class")} data-astro-cid-r7kjq4ip> <div class="hover-images" aria-hidden="true" data-astro-cid-r7kjq4ip> ${images.map((src, i) => renderTemplate`<div class="hover-img"${addAttribute(`background-image:url('${src}')`, "style")} data-astro-cid-r7kjq4ip></div>`)} </div> <div class="card-inner" data-astro-cid-r7kjq4ip> <div data-astro-cid-r7kjq4ip> <div class="card-top" data-astro-cid-r7kjq4ip> <span data-astro-cid-r7kjq4ip>${work.number}</span> ${work.isComing ? renderTemplate`<span class="status" data-astro-cid-r7kjq4ip>${work.status}</span>` : renderTemplate`<span data-astro-cid-r7kjq4ip>${work.articleCount}편</span>`} </div> <h3 class="card-title" data-astro-cid-r7kjq4ip> ${titleChars.map((ch, i) => renderTemplate`<span class="t-char"${addAttribute(`--ci:${i}`, "style")} data-astro-cid-r7kjq4ip>${ch === " " ? " " : ch}</span>`)} </h3> <p class="card-tag" data-astro-cid-r7kjq4ip>${work.tag}</p> <div class="hover-titles" data-astro-cid-r7kjq4ip> ${hasArticles ? renderTemplate`<div class="titles-track"${addAttribute(`animation-duration:${Math.max(titles.length, 1) * 9}s`, "style")} data-astro-cid-r7kjq4ip>${[0, 1, 2, 3].map(() => renderTemplate`<span class="titles-group" data-astro-cid-r7kjq4ip>${titles.map((t) => renderTemplate`<span class="t-item" data-astro-cid-r7kjq4ip>${t}<span class="sep" data-astro-cid-r7kjq4ip>·</span></span>`)}</span>`)}</div>` : renderTemplate`<span class="not-yet" data-astro-cid-r7kjq4ip>아직</span>`} </div> </div> <div class="card-foot" data-astro-cid-r7kjq4ip> <span data-astro-cid-r7kjq4ip>${work.isComing ? work.articleCount + "편" : work.status}</span> <span class="arrow" data-astro-cid-r7kjq4ip>→</span> </div> </div> </a>  ${renderScript($$result, "/workspaces/nuh-muh/src/components/WorkCard.astro?astro&type=script&index=0&lang.ts")}`;
}, "/workspaces/nuh-muh/src/components/WorkCard.astro", void 0);

const $$CardFan = createComponent(($$result, $$props, $$slots) => {
  const cards = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  return renderTemplate`${maybeRenderHead()}<a href="/works" class="card-fan" id="card-fan" aria-label="전체 글" data-astro-cid-el6rsbjk> <div class="fan-stack" data-astro-cid-el6rsbjk> ${cards.map((i) => renderTemplate`<div class="fan-card"${addAttribute(`--i:${i}`, "style")} data-astro-cid-el6rsbjk></div>`)} </div> <span class="fan-hint" data-astro-cid-el6rsbjk>전체 글</span> </a>`;
}, "/workspaces/nuh-muh/src/components/CardFan.astro", void 0);

const $$DiscordCrack = createComponent(async ($$result, $$props, $$slots) => {
  const DISCORD_URL = "https://discord.gg/zSzuk2rp8T";
  return renderTemplate`${maybeRenderHead()}<a${addAttribute(DISCORD_URL, "href")} class="crk" id="discord-crack" target="_blank" rel="noopener" aria-label="???" data-astro-cid-2zpnhh5r> <div class="crk-inner" data-astro-cid-2zpnhh5r> <!-- 목구멍: 굵은 흑백 최면 나선 --> <div class="crk-throat" data-astro-cid-2zpnhh5r> <svg class="crk-swirl" viewBox="0 0 100 100" aria-hidden="true" data-astro-cid-2zpnhh5r> <path fill="none" stroke="#1c2340" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" d="M50.0 50.0 L50.2 50.0 L50.5 50.1 L50.7 50.3 L50.9 50.5 L51.0 50.7 L51.1 51.0 L51.2 51.3 L51.2 51.6 L51.1 52.0 L51.0 52.3 L50.7 52.6 L50.5 53.0 L50.1 53.2 L49.7 53.5 L49.3 53.7 L48.8 53.8 L48.2 53.9 L47.6 53.8 L47.1 53.7 L46.5 53.5 L45.9 53.3 L45.3 52.9 L44.8 52.4 L44.3 51.9 L43.9 51.2 L43.5 50.5 L43.3 49.7 L43.1 48.9 L43.0 48.0 L43.1 47.1 L43.2 46.2 L43.5 45.3 L43.9 44.4 L44.5 43.5 L45.1 42.7 L45.9 42.0 L46.8 41.3 L47.8 40.8 L48.9 40.3 L50.0 40.0 L51.2 39.8 L52.5 39.8 L53.7 39.9 L55.0 40.2 L56.3 40.6 L57.5 41.3 L58.6 42.0 L59.7 42.9 L60.7 44.0 L61.5 45.2 L62.3 46.5 L62.8 48.0 L63.2 49.5 L63.5 51.1 L63.5 52.7 L63.3 54.3 L62.9 56.0 L62.4 57.6 L61.6 59.1 L60.6 60.6 L59.4 62.0 L58.1 63.2 L56.6 64.3 L54.9 65.2 L53.2 65.9 L51.3 66.4 L49.3 66.7 L47.3 66.8 L45.3 66.6 L43.3 66.2 L41.3 65.5 L39.4 64.6 L37.6 63.4 L35.9 62.0 L34.4 60.4 L33.1 58.6 L31.9 56.7 L31.0 54.6 L30.4 52.3 L30.0 50.0 L29.9 47.6 L30.1 45.2 L30.5 42.8 L31.3 40.5 L32.3 38.2 L33.7 36.0 L35.2 34.0 L37.1 32.2 L39.1 30.6 L41.4 29.2 L43.8 28.1 L46.4 27.3 L49.1 26.8 L51.8 26.6 L54.6 26.7 L57.4 27.2 L60.2 28.0 L62.8 29.1 L65.3 30.6 L67.7 32.3 L69.8 34.4 L71.7 36.7 L73.4 39.2 L74.7 42.0 L75.7 44.9 L76.4 47.9 L76.7 51.1 L76.7 54.2 L76.2 57.4 L75.4 60.5 L74.2 63.6 L72.7 66.5 L70.7 69.2 L68.5 71.7 L66.0 73.9 L63.2 75.8 L60.1 77.4 L56.9 78.7 L53.5 79.5 L50.0 80.0 L46.4 80.0 L42.9 79.7 L39.4 78.8 L35.9 77.6 L32.6 76.0 L29.5 74.0 L26.7 71.6 L24.1 68.8 L21.9 65.8 L20.0 62.4 L18.5 58.9 L17.4 55.2 L16.8 51.3 L16.6 47.4 L16.9 43.4 L17.7 39.5 L18.9 35.7 L20.6 32.0 L22.7 28.5 L25.3 25.3 L28.2 22.3 L31.5 19.7 L35.0 17.5 L38.9 15.8 L42.9 14.4 L47.1 13.6 L51.4 13.3 L55.8 13.5 L60.1 14.1 L64.4 15.4 L68.4 17.1 L72.3 19.3 L76.0 21.9 L79.3 25.0 L82.2 28.5 L84.7 32.3 L86.8 36.4 L88.4 40.8 L89.5 45.3 L90.0 50.0 L90.0 54.7 L89.4 59.5 L88.2 64.1 L86.5 68.6 L84.3 72.9 L81.6 77.0 L78.3 80.7 L74.7 84.0 L70.6 86.9 L66.3 89.3 L61.6 91.1 L56.7 92.5 L51.7 93.2 L46.6 93.4 L41.5 92.9 L36.4 91.8 L31.5 90.2 L26.7 87.9 L22.3 85.1 L18.2 81.8 L14.5 78.0 L11.2 73.8 L8.5 69.2 L6.3 64.2 L4.6 59.0 L3.6 53.6 L3.3 48.2 L3.6 42.6 L4.5 37.2 L6.1 31.8 L8.3 26.7 L11.2 21.8 L14.6 17.2 L18.5 13.1 L22.9 9.5 L27.8 6.3 L33.0 3.8 L38.4 1.9 L44.2 0.6 L50.0 0.0 L55.9 0.1 L61.8 0.9 L67.6 2.4 L73.2 4.6 L78.5 7.4 L83.4 10.8 L88.0 14.9 L92.1 19.4 L95.6 24.5 L98.5 29.9 L100.8 35.7 L102.3 41.7 L103.2 47.9 L103.3 54.2 L102.7 60.5 L101.4 66.7 L99.3 72.7 L96.5 78.5 L93.0 83.9 L88.9 88.9 L84.2 93.4 L79.0 97.3 L73.3 100.6 L67.3 103.3 L61.0 105.2 L54.4 106.3 L47.8 106.7 L41.1 106.3 L34.5 105.1 L28.0 103.1 L21.8 100.4 L15.9 96.9 L10.5 92.8 L5.5 88.0 L1.2 82.6 L-2.6 76.8 L-5.6 70.5 L-7.9 63.9 L-9.3 57.0 L-10.0 50.0" data-astro-cid-2zpnhh5r></path> </svg> </div> <!-- 좌/우 균열 조각 (불규칙 세로). 호버하면 양옆으로 갈라짐 --> <svg class="shard shard-left" viewBox="0 0 60 112" preserveAspectRatio="none" aria-hidden="true" data-astro-cid-2zpnhh5r> <path d="M0 0 L34 0 L22 11 L31 24 L19 34 L27 48 L15 62 L29 76 L20 90 L33 101 L24 112 L0 112 Z" data-astro-cid-2zpnhh5r></path> </svg> <svg class="shard shard-right" viewBox="0 0 60 112" preserveAspectRatio="none" aria-hidden="true" data-astro-cid-2zpnhh5r> <path d="M60 0 L34 0 L22 11 L31 24 L19 34 L27 48 L15 62 L29 76 L20 90 L33 101 L24 112 L60 112 Z" data-astro-cid-2zpnhh5r></path> </svg> </div> </a>  ${renderScript($$result, "/workspaces/nuh-muh/src/components/DiscordCrack.astro?astro&type=script&index=0&lang.ts")}`;
}, "/workspaces/nuh-muh/src/components/DiscordCrack.astro", void 0);

const $$GothicDoor = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<button class="gate" id="gothic-gate" aria-label="열쇠를 가진 자의 방" data-astro-cid-4ji272kw> <svg class="gate-svg" viewBox="0 0 100 130" aria-hidden="true" data-astro-cid-4ji272kw> <defs data-astro-cid-4ji272kw> <linearGradient id="gate-depth" x1="0" y1="0" x2="1" y2="0" data-astro-cid-4ji272kw> <stop offset="0%" stop-color="#0a0c14" data-astro-cid-4ji272kw></stop> <stop offset="60%" stop-color="var(--ink)" data-astro-cid-4ji272kw></stop> <stop offset="100%" stop-color="var(--ink)" data-astro-cid-4ji272kw></stop> </linearGradient> </defs> <!-- 문 안쪽 어둠 (문짝 뒤에 깔림) --> <path class="gate-dark" d="M18 124 L18 62 Q27 22 50 14 Q73 22 82 62 L82 124 Z" fill="url(#gate-depth)" opacity="0" data-astro-cid-4ji272kw></path> <!-- 첨두아치 문틀 (고정) --> <path class="gate-frame" d="M12 130 L12 58 Q22 12 50 4 Q78 12 88 58 L88 130 Z" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round" data-astro-cid-4ji272kw></path> <!-- 문짝 그룹 (왼쪽 경첩 축으로 열림) --> <g class="gate-leaf-group" data-astro-cid-4ji272kw> <path class="gate-leaf" d="M18 124 L18 62 Q27 22 50 14 Q73 22 82 62 L82 124 Z" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round" data-astro-cid-4ji272kw></path> <path class="leaf-deco" d="M30 116 L30 70 Q37 44 50 38 Q63 44 70 70 L70 116 Z" fill="none" stroke="var(--ink)" stroke-width="1" opacity="0.6" data-astro-cid-4ji272kw></path> <circle class="leaf-handle" cx="73" cy="92" r="3.4" fill="var(--ink)" data-astro-cid-4ji272kw></circle> </g> </svg> </button>  ${renderScript($$result, "/workspaces/nuh-muh/src/components/GothicDoor.astro?astro&type=script&index=0&lang.ts")}`;
}, "/workspaces/nuh-muh/src/components/GothicDoor.astro", void 0);

const $$SidePanel = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<aside class="side-panel" data-astro-cid-diz4hr7b> <div class="sp-item sp-question" data-astro-cid-diz4hr7b> <button class="question-trigger" id="question-trigger" aria-label="구독 안내 열기" data-astro-cid-diz4hr7b>?</button> <button class="signup-box" id="signup-box" data-astro-cid-diz4hr7b>가입</button> </div> <div class="sp-item sp-fan" data-astro-cid-diz4hr7b>${renderComponent($$result, "CardFan", $$CardFan, { "data-astro-cid-diz4hr7b": true })}</div> <div class="sp-item sp-crack" data-astro-cid-diz4hr7b>${renderComponent($$result, "DiscordCrack", $$DiscordCrack, { "data-astro-cid-diz4hr7b": true })}</div> <div class="sp-item sp-gate" data-astro-cid-diz4hr7b>${renderComponent($$result, "GothicDoor", $$GothicDoor, { "data-astro-cid-diz4hr7b": true })}</div> </aside>  ${renderScript($$result, "/workspaces/nuh-muh/src/components/SidePanel.astro?astro&type=script&index=0&lang.ts")}`;
}, "/workspaces/nuh-muh/src/components/SidePanel.astro", void 0);

const $$PostcardSignup = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<div class="postcard-stage" id="postcard-stage" data-astro-cid-lbk2pyot> <div class="stage-darken" id="stage-darken" data-astro-cid-lbk2pyot></div> <div class="postcard" id="postcard" data-astro-cid-lbk2pyot> <button class="postcard-close" id="postcard-close" aria-label="닫기" data-astro-cid-lbk2pyot>×</button> <p class="postcard-text" id="postcard-text" data-astro-cid-lbk2pyot></p> <form class="postcard-form" id="postcard-form" data-astro-cid-lbk2pyot> <input type="email" id="postcard-email" placeholder="당신의 주소를 남기시오" required autocomplete="off" data-astro-cid-lbk2pyot> <button type="submit" class="postcard-submit" data-astro-cid-lbk2pyot>남긴다</button> </form> <p class="postcard-already" id="postcard-already" data-astro-cid-lbk2pyot>이미 한 번 다녀가셨습니다.</p> </div> <div class="split-line" id="split-line" aria-hidden="true" data-astro-cid-lbk2pyot></div> <div class="split-half split-left" id="split-left" aria-hidden="true" data-astro-cid-lbk2pyot></div> <div class="split-half split-right" id="split-right" aria-hidden="true" data-astro-cid-lbk2pyot></div> <div class="login-box" id="login-box" data-astro-cid-lbk2pyot> <button class="login-close" id="login-close" aria-label="닫기" data-astro-cid-lbk2pyot>×</button> <p class="login-title" data-astro-cid-lbk2pyot>열쇠를 맞춰 주십시오.</p> <input type="email" id="login-email" autocomplete="off" readonly data-astro-cid-lbk2pyot> <input type="password" id="login-pass" placeholder="봉인 (비밀번호)" autocomplete="off" required data-astro-cid-lbk2pyot> <button type="button" class="postcard-submit" id="login-submit" data-astro-cid-lbk2pyot>연다</button> <p class="login-msg" id="login-msg" data-astro-cid-lbk2pyot></p> </div> <div class="spider-rig" id="spider-rig" aria-hidden="true" data-astro-cid-lbk2pyot> <div class="thread" data-astro-cid-lbk2pyot></div> <div class="spider" data-astro-cid-lbk2pyot><img src="/images/spider.png" alt="" data-astro-cid-lbk2pyot></div> <div class="carried-postcard" id="carried-postcard" data-astro-cid-lbk2pyot></div> </div> <div class="residue" id="residue" aria-hidden="true" data-astro-cid-lbk2pyot> <svg class="feather" viewBox="0 0 40 80" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-lbk2pyot> <path d="M20 4 Q12 40 16 74 M20 4 Q28 40 16 74 M20 20 L12 28 M20 30 L28 36 M20 42 L12 48 M20 52 L26 58" data-astro-cid-lbk2pyot></path> </svg> <svg class="screw" viewBox="0 0 30 60" fill="none" stroke="currentColor" stroke-width="1.5" data-astro-cid-lbk2pyot> <path d="M11 4 L19 4 L19 30 L15 40 L11 30 Z" data-astro-cid-lbk2pyot></path> <path d="M11 10 L19 10 M11 16 L19 16 M11 22 L19 22" data-astro-cid-lbk2pyot></path> </svg> </div> </div>  ${renderScript($$result, "/workspaces/nuh-muh/src/components/PostcardSignup.astro?astro&type=script&index=0&lang.ts")}`;
}, "/workspaces/nuh-muh/src/components/PostcardSignup.astro", void 0);

const $$JoinScroll = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section class="join-scroll" id="join-scroll" aria-hidden="true" data-astro-cid-7kd2e3xh> <div class="scroll-paper" id="scroll-paper" data-astro-cid-7kd2e3xh> <div class="scroll-inner" data-astro-cid-7kd2e3xh> <p class="join-title" data-astro-cid-7kd2e3xh>열쇠를 받는 자리</p> <p class="join-sub" data-astro-cid-7kd2e3xh>당신의 주소는 이미 우리에게 있습니다. 이제 봉인을 정하십시오.</p> <form class="join-form" id="join-form" data-astro-cid-7kd2e3xh> <input type="email" id="join-email" placeholder="엽서에 남긴 주소" autocomplete="off" required data-astro-cid-7kd2e3xh> <input type="text" id="join-nick" placeholder="불릴 이름" autocomplete="off" required data-astro-cid-7kd2e3xh> <input type="password" id="join-pass" placeholder="봉인 (비밀번호)" autocomplete="off" required data-astro-cid-7kd2e3xh> <button type="submit" class="join-submit" data-astro-cid-7kd2e3xh>봉인한다</button> </form> <p class="join-msg" id="join-msg" data-astro-cid-7kd2e3xh></p> </div> </div> </section>  ${renderScript($$result, "/workspaces/nuh-muh/src/components/JoinScroll.astro?astro&type=script&index=0&lang.ts")}`;
}, "/workspaces/nuh-muh/src/components/JoinScroll.astro", void 0);

const prerender = false;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );
  const { data: works } = await supabase.from("works").select("id, week, category, title, slug, hover_images").order("week", { ascending: false });
  const { data: articles } = await supabase.from("articles").select("id, title, work_id, created_at").eq("status", "published");
  const allWorks = works || [];
  const allArticles = articles || [];
  const CATEGORY_INFO = {
    "영상 너머": { spot: "ga", color: "rust" },
    "소설 너머": { spot: "na", color: "deep" },
    "인물 너머": { spot: "da", color: "cold" },
    "소식 너머": { spot: "ra", color: "mossy" }
  };
  function toCard(w) {
    const info = CATEGORY_INFO[w.category] || { spot: "da", color: "warm" };
    const mine = allArticles.filter((a) => a.work_id === w.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      id: w.slug,
      title: w.title,
      color: info.color,
      spot: info.spot,
      category: w.category,
      hoverImages: w.hover_images || [],
      articleTitles: mine.map((a) => a.title),
      // WorkCard가 기대하지만 새 구조에서 안 쓰는 것들 — 빈 값
      number: "",
      tag: "",
      status: "",
      articleCount: mine.length
    };
  }
  const weekNums = [...new Set(allWorks.map((w) => w.week))].sort((a, b) => b - a);
  const CARD_COLORS = ["c1", "c2", "c3", "c4", "c5", "c6"];
  let colorSeq = 0;
  const sets = weekNums.map((week) => {
    const cards = {};
    for (const w of allWorks.filter((x) => x.week === week)) {
      cards[CATEGORY_INFO[w.category]?.spot || "da"] = toCard(w);
    }
    for (const pos of ["ga", "na", "da", "ra"]) {
      if (cards[pos]) {
        cards[pos].color = CARD_COLORS[colorSeq % CARD_COLORS.length];
        colorSeq++;
      }
    }
    return { week, cards };
  });
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Nuh-Muh", "data-astro-cid-j7pv25f6": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="container" data-astro-cid-j7pv25f6> ${renderComponent($$result2, "Masthead", $$Masthead, { "data-astro-cid-j7pv25f6": true })} <div class="top-grid" data-astro-cid-j7pv25f6> ${renderComponent($$result2, "SidePanel", $$SidePanel, { "data-astro-cid-j7pv25f6": true })} </div> <div class="week-sets" data-astro-cid-j7pv25f6> ${sets.map((set, i) => renderTemplate`<div${addAttribute("week-set" + (i % 2 === 1 ? " mirrored" : ""), "class")} data-astro-cid-j7pv25f6> <div class="set-cards" data-astro-cid-j7pv25f6> ${["ga", "na", "da", "ra"].map((pos) => renderTemplate`<div${addAttribute("slot pos-" + pos, "class")} data-astro-cid-j7pv25f6> ${set.cards[pos] ? renderTemplate`${renderComponent($$result2, "WorkCard", $$WorkCard, { "work": set.cards[pos], "data-astro-cid-j7pv25f6": true })}` : renderTemplate`<div class="empty-card" aria-hidden="true" data-astro-cid-j7pv25f6></div>`} </div>`)} </div> </div>`)} </div> </div> ${renderComponent($$result2, "PostcardSignup", $$PostcardSignup, { "data-astro-cid-j7pv25f6": true })} ${renderComponent($$result2, "JoinScroll", $$JoinScroll, { "data-astro-cid-j7pv25f6": true })} ` })}`;
}, "/workspaces/nuh-muh/src/pages/index.astro", void 0);

const $$file = "/workspaces/nuh-muh/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
