import { c as createComponent } from './astro-component_IAje6_d0.mjs';
import 'piccolore';
import { r as renderComponent, p as renderTemplate, m as maybeRenderHead, j as addAttribute, u as unescapeHTML } from './ssr-function_D8uC465_.mjs';
import { $ as $$BaseLayout } from './BaseLayout_CvzfGiBE.mjs';
import { createClient } from '@supabase/supabase-js';

const prerender = false;
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$slug;
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );
  const { slug } = Astro2.params;
  const { data: article } = await supabase.from("articles").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!article) {
    return new Response(null, { status: 404, statusText: "Not Found" });
  }
  const dateStr = article.created_at ? new Date(article.created_at).toLocaleDateString("ko-KR") : "";
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": article.title + " — Nuh-Muh", "data-astro-cid-yvbahnfj": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<article class="art-wrap" data-astro-cid-yvbahnfj> <a href="/" class="art-back" data-astro-cid-yvbahnfj>← 너머</a> <p class="art-category" data-astro-cid-yvbahnfj>${article.category}</p> <h1 class="art-title" data-astro-cid-yvbahnfj>${article.title}</h1> ${article.subtitle && renderTemplate`<p class="art-subtitle" data-astro-cid-yvbahnfj>${article.subtitle}</p>`} <div class="art-meta" data-astro-cid-yvbahnfj> <span class="art-author" data-astro-cid-yvbahnfj>${article.author}</span> <span class="art-dot" data-astro-cid-yvbahnfj>·</span> <span class="art-date" data-astro-cid-yvbahnfj>${dateStr}</span> </div> ${article.cover_image && renderTemplate`<img class="art-cover"${addAttribute(article.cover_image, "src")}${addAttribute(article.cover_alt || "", "alt")} data-astro-cid-yvbahnfj>`} <div class="art-body" data-astro-cid-yvbahnfj>${unescapeHTML(article.body)}</div> ${article.tags && article.tags.length > 0 && renderTemplate`<div class="art-tags" data-astro-cid-yvbahnfj> ${article.tags.map((t) => renderTemplate`<span class="art-tag" data-astro-cid-yvbahnfj>${t}</span>`)} </div>`} ${article.work && renderTemplate`<p class="art-work" data-astro-cid-yvbahnfj>이 글은 「${article.work}」에 대한 글입니다.</p>`} </article> ` })}`;
}, "/workspaces/nuh-muh/src/pages/[slug].astro", void 0);

const $$file = "/workspaces/nuh-muh/src/pages/[slug].astro";
const $$url = "/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
