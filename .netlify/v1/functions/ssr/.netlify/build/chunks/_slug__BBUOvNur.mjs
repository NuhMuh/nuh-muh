import { c as createComponent } from './astro-component_CtVdnQg5.mjs';
import 'piccolore';
import { r as renderComponent, p as renderTemplate, m as maybeRenderHead, j as addAttribute } from './ssr-function_CyStJnH4.mjs';
import { $ as $$BaseLayout } from './BaseLayout_BZIsUN2t.mjs';
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
  const { data: work } = await supabase.from("works").select("id, week, category, title, slug").eq("slug", slug).maybeSingle();
  if (!work) {
    return new Response(null, { status: 404, statusText: "Not Found" });
  }
  const { data: articles } = await supabase.from("articles").select("title, slug, subtitle, created_at").eq("work_id", work.id).eq("status", "published").order("created_at", { ascending: false });
  const list = articles || [];
  function fmt(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate() + ".";
  }
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": work.title + " — Nuh-Muh", "data-astro-cid-by4zwojz": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="topic-wrap" data-astro-cid-by4zwojz> <a href="/" class="topic-back" data-astro-cid-by4zwojz>← 너머</a> <div class="topic-head" data-astro-cid-by4zwojz> <span class="topic-cat" data-astro-cid-by4zwojz>${work.category}</span> <h1 class="topic-title" data-astro-cid-by4zwojz>${work.title}</h1> </div> ${list.length === 0 ? renderTemplate`<p class="topic-empty" data-astro-cid-by4zwojz>아직 글이 없습니다.</p>` : renderTemplate`<ul class="topic-list" data-astro-cid-by4zwojz> ${list.map((a) => renderTemplate`<li data-astro-cid-by4zwojz> <a${addAttribute("/" + a.slug, "href")} data-astro-cid-by4zwojz> <span class="a-date" data-astro-cid-by4zwojz>${fmt(a.created_at)}</span> <span class="a-title" data-astro-cid-by4zwojz>${a.title}</span> ${a.subtitle && renderTemplate`<span class="a-sub" data-astro-cid-by4zwojz>${a.subtitle}</span>`} </a> </li>`)} </ul>`} </div> ` })}`;
}, "/workspaces/nuh-muh/src/pages/work/[slug].astro", void 0);

const $$file = "/workspaces/nuh-muh/src/pages/work/[slug].astro";
const $$url = "/work/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
