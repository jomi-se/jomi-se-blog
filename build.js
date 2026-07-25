#!/usr/bin/env node
// build.js — the bespoke aggregator.
//
// Finished, hand-authored HTML posts under posts/<slug>/index.html are the SOURCE.
// This script never renders post bodies. It reads each post's <head> metadata
// (OpenGraph + standard tags) and emits only the DERIVED files into dist/:
//   - index.html          (home: newest-first list of posts)
//   - archive/index.html  (grouped by year)
//   - feed.xml            (RSS 2.0, summary-only from og:description)
//   - sitemap.xml
// Plus a straight copy of posts/ and styles/ (and any top-level static assets).
//
// Zero runtime dependencies: Node stdlib only. See AGENTS.md for the design rationale.

import { readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { join } from "node:path";

// ── Site config ─────────────────────────────────────────────────────────────
// SITE_URL is the canonical home (custom domain on Cloudflare). Override via env
// (e.g. SITE_URL=https://... node build.js) for staging/preview builds.
const SITE_URL   = (process.env.SITE_URL || "https://jomi-se.com").replace(/\/$/, "");
const SITE_TITLE = process.env.SITE_TITLE || "Jose M Arroyo - Blog posts and notes";
// The author's own bio line (doubles as meta description + RSS description).
const SITE_DESC  = process.env.SITE_DESC  || "Chilean/French software engineer. Blog posts, deep dives and experiments.";
const AUTHOR     = process.env.SITE_AUTHOR || "José M Arroyo";

const POSTS_DIR = "posts";
const OUT_DIR   = "dist";

// ── Tiny HTML helpers (posts share a known head shape, so this stays simple) ──
const decode = s => (s ?? "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'");
const escHtml = s => (s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
const escXml = s => (s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function headOf(html) {
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : html;
}
// Order-independent: grab the whole matching tag, then pull `content`/`href` out.
function metaBy(head, attr, value) {
  const re = new RegExp(`<meta\\b[^>]*\\b${attr}=["']${value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}["'][^>]*>`, "i");
  const tag = head.match(re);
  if (!tag) return null;
  const c = tag[0].match(/\bcontent=(?:"([^"]*)"|'([^']*)')/i);
  return c ? decode((c[1] ?? c[2]).trim()) : null;
}
function linkHref(head, rel) {
  const re = new RegExp(`<link\\b[^>]*\\brel=["']${rel}["'][^>]*>`, "i");
  const tag = head.match(re);
  if (!tag) return null;
  const h = tag[0].match(/\bhref=(?:"([^"]*)"|'([^']*)')/i);
  return h ? decode((h[1] ?? h[2]).trim()) : null;
}
function titleOf(head) {
  const m = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decode(m[1].trim()) : null;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate = iso => {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : iso || "";
};

// Optional 7th head tag: keys a post's home-page card to one functional color.
const ACCENTS = new Set(["coral", "teal", "periwinkle", "amber"]);

// ── Load posts ───────────────────────────────────────────────────────────────
function loadPosts() {
  if (!existsSync(POSTS_DIR)) return [];
  const posts = [];
  for (const slug of readdirSync(POSTS_DIR, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    const file = join(POSTS_DIR, slug.name, "index.html");
    if (!existsSync(file)) continue;
    const head = headOf(readFileSync(file, "utf8"));
    const title = metaBy(head, "property", "og:title") || titleOf(head) || slug.name;
    const date  = metaBy(head, "property", "article:published_time") || "";
    if (!date) {
      console.warn(`⚠  ${file}: missing <meta property="article:published_time"> — post will sort last`);
    }
    const keywords = metaBy(head, "name", "keywords") || "";
    posts.push({
      slug: slug.name,
      url: `/posts/${slug.name}/`,
      title,
      date,
      summary: metaBy(head, "property", "og:description") || "",
      // Tags stay "silent": parsed from <meta keywords> for potential future use
      // (feed categories, related posts) but deliberately NOT rendered anywhere.
      tags: keywords.split(",").map(t => t.trim()).filter(Boolean),
      canonical: linkHref(head, "canonical"),
      accent: (a => ACCENTS.has(a) ? a : null)(metaBy(head, "name", "home-accent") || ""),
    });
  }
  return posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// ── Page shell ────────────────────────────────────────────────────────────────
const themeToggle = `<button class="theme-toggle" aria-label="Toggle light/dark theme" onclick="const r=document.documentElement,c=r.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),n=c==='dark'?'light':'dark';r.dataset.theme=n;localStorage.setItem('theme',n)">◐</button>`;

// `header: false` drops the site header (home carries its own identity strip
// with the nav folded in — the wordmark would just duplicate the h1 there).
function page(title, bodyHtml, { description = SITE_DESC, header = true } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title>
<meta name="description" content="${escHtml(description)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="${escHtml(SITE_TITLE)}" href="/feed.xml">
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/base.css">
<script>(()=>{const t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t})()</script>
</head>
<body>
${header ? `<header class="site-header">
  <a class="site-title" href="/"><svg class="site-mark" viewBox="0 0 32 32" width="18" height="18" aria-hidden="true"><circle cx="16" cy="8" r="5.5" fill="#c04732"/><circle cx="9.072" cy="20" r="5.5" fill="#005f5b"/><circle cx="22.928" cy="20" r="5.5" fill="#525dbd"/></svg>${escHtml(SITE_TITLE)}</a>
  <nav><a href="/archive/">Archive</a> <a href="/feed.xml">RSS</a>${themeToggle}</nav>
</header>` : ""}
<main>
${bodyHtml}
</main>
<footer class="site-footer">
  <p>© ${new Date().getFullYear()} ${escHtml(AUTHOR)} · <a href="/feed.xml">RSS</a> ·
  <a href="https://github.com/jomi-se/jomi-se-blog">Source</a></p>
</footer>
</body>
</html>`;
}

const postLi = p => `  <li class="post-item">
    ${p.date ? `<time datetime="${escHtml(p.date)}">${escHtml(fmtDate(p.date))}</time>` : ""}
    <a href="${escHtml(p.url)}">${escHtml(p.title)}</a>
  </li>`;

// Home snippet card: real summary from og:description, identity from the
// optional home-accent circle. Never touches post bodies.
const postCard = p => `  <article class="post-card${p.accent ? ` post-card--${p.accent}` : ""}">
    <p class="post-card-meta"><span class="post-dot" aria-hidden="true"></span>${p.date ? `<time datetime="${escHtml(p.date)}">${escHtml(fmtDate(p.date))}</time>` : ""}</p>
    <h2 class="post-card-title"><a href="${escHtml(p.url)}">${escHtml(p.title)}</a></h2>${p.summary ? `
    <p class="post-card-summary">${escHtml(p.summary)}</p>` : ""}
  </article>`;

// ── Emit ───────────────────────────────────────────────────────────────────────
function write(relPath, contents) {
  const full = join(OUT_DIR, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, contents);
}

function build() {
  const posts = loadPosts();

  // Clean + copy static sources verbatim.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  if (existsSync(POSTS_DIR)) cpSync(POSTS_DIR, join(OUT_DIR, "posts"), { recursive: true });
  if (existsSync("styles")) cpSync("styles", join(OUT_DIR, "styles"), { recursive: true });
  for (const asset of ["favicon.ico", "favicon.svg", "apple-touch-icon.png", "robots.txt", "CNAME", ".well-known"]) {
    if (existsSync(asset)) cpSync(asset, join(OUT_DIR, asset), { recursive: true });
  }

  // ── Home ── direction contract ("Snippet cards on the bench", seed 4008c17a):
  // THESIS: the homepage answers "who is this and what does he write" in one
  //   viewport; it refuses the anonymous date+title link list.
  // OWN-WORLD: Quiet Workbench unchanged — cool neutrals, hairline borders,
  //   compact radii; functional colors as per-post identity via the circle
  //   motif carried down from the logo.
  // STORY: the reader meets the author (h1 + authored bio + GitHub/LinkedIn),
  //   skims real og:description summaries on flat cards, and leaves knowing
  //   what this blog is and where its source lives.
  // FIRST VIEWPORT: identity strip (mark 44px + h1 + bio + links), then the
  //   newest card. Primary action: opening a post.
  // FORM: grounded candidate 5 (uniform snippet-card stack), assigned by
  //   roll; staging challenger rejected (gating opposes skim-first reading).
  const identity = `<section class="home-id">
  <svg class="home-mark" viewBox="0 0 32 32" width="44" height="44" aria-hidden="true"><circle cx="16" cy="8" r="5.5" fill="#c04732"/><circle cx="9.072" cy="20" r="5.5" fill="#005f5b"/><circle cx="22.928" cy="20" r="5.5" fill="#525dbd"/></svg>
  <div class="home-id-text">
    <h1>José Arroyo</h1>
    <p class="home-bio">${escHtml(SITE_DESC)}</p>
    <p class="home-links"><a href="https://github.com/jomi-se">GitHub</a> <a href="https://www.linkedin.com/in/jos%C3%A9-miguel-a-b2233b80/">LinkedIn</a></p>
  </div>
  <nav class="home-nav"><a href="/archive/">Archive</a>${themeToggle}</nav>
</section>`;
  const cards = posts.length
    ? `<div class="post-cards">\n${posts.map(postCard).join("\n")}\n</div>`
    : `<p class="empty-note">No posts yet.</p>`;
  write("index.html", page(SITE_TITLE, [identity, cards].join("\n"), { header: false }));

  // Archive by year
  const byYear = {};
  for (const p of posts) (byYear[(p.date || "----").slice(0, 4)] ??= []).push(p);
  const archiveBody = Object.keys(byYear).sort().reverse().map(y =>
    `<section><h2>${escHtml(y)}</h2>\n<ul class="post-list">\n${byYear[y].map(postLi).join("\n")}\n</ul></section>`
  ).join("\n");
  write("archive/index.html", page(`Archive · ${SITE_TITLE}`, `<h1>Archive</h1>\n${archiveBody}`));

  // RSS feed (summary-only — never touches post bodies)
  const items = posts.map(p => `  <item>
    <title>${escXml(p.title)}</title>
    <link>${escXml(SITE_URL + p.url)}</link>
    <guid isPermaLink="true">${escXml(SITE_URL + p.url)}</guid>
    ${p.date ? `<pubDate>${new Date(p.date).toUTCString()}</pubDate>` : ""}
    <description>${escXml(p.summary)}</description>
  </item>`).join("\n");
  write("feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escXml(SITE_TITLE)}</title>
  <link>${escXml(SITE_URL)}/</link>
  <atom:link href="${escXml(SITE_URL)}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>${escXml(SITE_DESC)}</description>
${items}
</channel>
</rss>`);

  // Sitemap
  const urls = [`${SITE_URL}/`, `${SITE_URL}/archive/`,
    ...posts.map(p => SITE_URL + p.url)];
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${escXml(u)}</loc></url>`).join("\n")}
</urlset>`);

  console.log(`✓ Built ${posts.length} post(s) → ${OUT_DIR}/  (index, archive, feed.xml, sitemap.xml)`);
}

build();
