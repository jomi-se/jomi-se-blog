#!/usr/bin/env node
// build.js — the bespoke aggregator.
//
// Finished, hand-authored HTML posts under posts/<slug>/index.html are the SOURCE.
// This script never renders post bodies. It reads each post's <head> metadata
// (OpenGraph + standard tags) and emits only the DERIVED files into dist/:
//   - index.html          (home: newest-first list of posts)
//   - archive/index.html  (grouped by year)
//   - tags/<tag>/index.html
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
const SITE_TITLE = process.env.SITE_TITLE || "Jose M — Blog posts and notes";
const SITE_DESC  = process.env.SITE_DESC  || "Personal blog pages.";
const AUTHOR     = process.env.SITE_AUTHOR || "José Arroyo";

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
  const c = tag[0].match(/\bcontent=["']([\s\S]*?)["']/i);
  return c ? decode(c[1].trim()) : null;
}
function linkHref(head, rel) {
  const re = new RegExp(`<link\\b[^>]*\\brel=["']${rel}["'][^>]*>`, "i");
  const tag = head.match(re);
  if (!tag) return null;
  const h = tag[0].match(/\bhref=["']([^"']*)["']/i);
  return h ? decode(h[1].trim()) : null;
}
function titleOf(head) {
  const m = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decode(m[1].trim()) : null;
}

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
      tags: keywords.split(",").map(t => t.trim()).filter(Boolean),
      canonical: linkHref(head, "canonical"),
    });
  }
  return posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// ── Page shell ────────────────────────────────────────────────────────────────
function page(title, bodyHtml, { description = SITE_DESC } = {}) {
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
</head>
<body>
<header class="site-header">
  <a class="site-title" href="/"><svg class="site-mark" viewBox="0 0 32 32" width="18" height="18" aria-hidden="true"><circle cx="16" cy="8" r="5.5" fill="#c04732"/><circle cx="9.072" cy="20" r="5.5" fill="#005f5b"/><circle cx="22.928" cy="20" r="5.5" fill="#525dbd"/></svg>${escHtml(SITE_TITLE)}</a>
  <nav><a href="/archive/">Archive</a> <a href="/feed.xml">RSS</a></nav>
</header>
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
    <time datetime="${escHtml(p.date)}">${escHtml(p.date || "—")}</time>
    <a href="${escHtml(p.url)}">${escHtml(p.title)}</a>
    ${p.tags.map(t => `<a class="tag" href="/tags/${encodeURIComponent(t)}/">#${escHtml(t)}</a>`).join(" ")}
  </li>`;

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

  // Home
  const intro = `<section class="intro"><p>${escHtml(SITE_DESC)}</p></section>`;
  write("index.html", page(SITE_TITLE,
    `${intro}\n<ul class="post-list">\n${posts.map(postLi).join("\n")}\n</ul>`));

  // Archive by year
  const byYear = {};
  for (const p of posts) (byYear[(p.date || "----").slice(0, 4)] ??= []).push(p);
  const archiveBody = Object.keys(byYear).sort().reverse().map(y =>
    `<section><h2>${escHtml(y)}</h2>\n<ul class="post-list">\n${byYear[y].map(postLi).join("\n")}\n</ul></section>`
  ).join("\n");
  write("archive/index.html", page(`Archive · ${SITE_TITLE}`, `<h1>Archive</h1>\n${archiveBody}`));

  // Tag pages
  const byTag = {};
  for (const p of posts) for (const t of p.tags) (byTag[t] ??= []).push(p);
  for (const [tag, list] of Object.entries(byTag)) {
    write(`tags/${tag}/index.html`, page(`#${tag} · ${SITE_TITLE}`,
      `<h1>#${escHtml(tag)}</h1>\n<ul class="post-list">\n${list.map(postLi).join("\n")}\n</ul>`));
  }

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
    ...posts.map(p => SITE_URL + p.url),
    ...Object.keys(byTag).map(t => `${SITE_URL}/tags/${t}/`)];
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${escXml(u)}</loc></url>`).join("\n")}
</urlset>`);

  console.log(`✓ Built ${posts.length} post(s) → ${OUT_DIR}/  (index, archive, ${Object.keys(byTag).length} tag page(s), feed.xml, sitemap.xml)`);
}

build();
