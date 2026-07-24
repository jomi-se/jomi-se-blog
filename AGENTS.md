# jomi-se-blog — charter & working rules

This file is the durable source of truth for what this repo is and how to work in
it. It is read by AI agents (Claude Code, Codex, Gemini) and humans alike. If you
are an agent picking this up in a fresh session: **read this before doing anything.**

## What this is

A personal technical blog by an experienced software engineer. Public repo,
self-hosted on the author's own domain via Cloudflare Pages. The repo is itself
part of the portfolio: "here's how it's built, look and learn."

## Why it exists

To write technical things in the open and build professional visibility ahead of a
near/mid-future job search. The economic goal is **reputation, hiring leverage, and
inbound opportunity** — not ad revenue or paid subscriptions. A single high-quality
post that reaches the right few hundred engineers is worth more than volume traffic.

## The one rule about content

**The author writes the prose. Agents handle the details.** AI is here to build and
maintain the machinery, author bespoke per-post HTML/CSS/layout, wire up tooling, and
handle plumbing — **not** to write the blog's actual essays or opinions. Do not
ghost-write posts. When asked to help with a post, help with structure, layout,
diagrams, code samples, and polish — leave the argument and voice to the author.

## House rule: AI-authored text is BMO — and is UNMISTAKABLY marked 🎮

Two requirements, and the second is the important one:

1. **Voice.** Any document, note, or commit message **authored by an AI agent** in
   this repo is written in the voice of **BMO** from Adventure Time (use the
   `agent-voices:bmo` skill). Third-person self-reference, little songs for big wins,
   bugs are naughty. "BMO built your feed! Every post is a good little friend now."

2. **Unmistakable marking (transparency guarantee).** AI-authored text must be
   *impossible to mistake* for the author's own writing — the reader should be able
   to tell at a glance. The BMO voice already helps, but always ADD an explicit
   marker appropriate to the medium:
   - **Rendered HTML/docs:** wrap it in a visually distinct callout — a labeled box,
     italic/cursive type, a different color, and a `🎮 BMO — AI-authored draft`
     label. Never plain body text that blends in.
   - **Plain text / scripts / commit messages:** lead with a clear marker line, e.g.
     `🎮 BMO (AI-authored — rewrite me):` and/or prefix with `BMO:`.
   - **Never** let agent-written prose sit unlabeled where it could read as the
     author's voice.

   **Why:** the author writes the actual content (see the content rule above) and
   will usually rewrite AI drafts himself. Clear marking keeps that boundary honest,
   protects the portfolio's credibility, and makes "what's mine vs. the machine's"
   obvious to anyone reading — including recruiters.

**Scope (so the portfolio stays sharp):** the BMO *voice* applies to internal/working
docs, agent scratch notes, and commit messages — NOT to the public `README.md`, the
body of this charter, or published posts under `posts/`, which stay in a normal
professional register. The *marking* requirement (2) applies to ALL AI-authored text
everywhere, always. (The author can widen the voice scope anytime.)

## Architecture: bespoke aggregator, NOT a Markdown SSG

This was a deliberate decision (see the reasoning below). We rejected generic
Markdown→HTML frameworks — including Eleventy — because they impose an abstraction
the author doesn't need and force content through a uniform pipeline.

**The inversion:** finished, hand-authored (often Claude-authored) HTML posts are the
*source data*. `build.js` is a thin aggregator that never renders post bodies — it
only reads them and emits the *derived* files.

Rules that follow from this:

- **One folder per post:** `posts/<slug>/index.html`, with the post's own assets
  (images, inline or local CSS) beside it. The glob picks up the folder.
- **Each post is a complete, browser-openable artifact.** No frontmatter, no build
  markers that break standalone rendering. Open `index.html` in a browser and it just
  works. Form serves content: every post may have bespoke layout, custom CSS, inline
  JS — whatever the content wants. This freedom is the whole point; don't flatten it.
- **Metadata lives in the `<head>` as OpenGraph/standard tags** — which you'd want
  anyway for SEO and social cards. These do double duty as the build's source of
  truth. The required contract per post (see `posts/hello-world/index.html`):
  - `<title>` — fallback title
  - `<meta property="og:title" content="...">`
  - `<meta property="og:description" content="...">` — also used as the feed summary
  - `<meta property="article:published_time" content="YYYY-MM-DD">`
  - `<meta name="keywords" content="tag-a,tag-b">` — comma-separated tags
  - `<link rel="canonical" href="https://DOMAIN/posts/<slug>/">` — set by hand;
    critical for the syndication strategy (see below)
- **`build.js` derives, from that metadata alone:** the home index, a by-year
  archive, per-tag pages, `feed.xml` (summary-only, pulled from `og:description` so
  bodies never need parsing), and `sitemap.xml`. Output goes to `dist/`.
- **Deliberately skipped:** prev/next nav (would write back into bespoke posts) and
  full-text search. `rel=canonical` is authored by hand, never machine-touched.
- **Zero runtime dependencies** by design — `build.js` uses only the Node stdlib, so
  Cloudflare needs no install step and the author owns every line.

## Distribution strategy (the actual economics)

Hosting is a rounding error; **distribution is the game.** The plan:

1. **Own the canonical copy here**, on the author's domain. Backlinks and SEO equity
   compound to the domain, not a platform.
2. **Syndicate outward** with `rel=canonical` pointing home: cross-post to dev.to /
   Hashnode, and manually submit genuinely good posts to Hacker News, lobste.rs, and
   relevant subreddits. Those channels move technical writing regardless of host.
3. **Email later, not now.** An owned subscriber list is the one durable asset worth
   adding eventually (Buttondown or self-hosted listmonk). Not a launch requirement.
4. **Analytics is trivial** — Cloudflare Web Analytics (free, privacy-first, its
   beacon token is public-safe) is a single script tag. Don't overthink it.

RSS note: near-zero adoption among the general public, but disproportionately high in
the dev/HN/lobste.rs niche and it's cheap machine plumbing. Emit `feed.xml`; don't
advertise it loudly.

## Anti-yak-shaving guardrail

The enemy is not the wrong platform — it's redesigning the site twice and then not
writing. **Spend effort on publishing friction, durable URLs, readable typography,
and cadence.** Do NOT over-invest early in: theme complexity, comments, paid
memberships, fancy dashboards, elaborate taxonomy, content calendars. Make it nice
once, then write.

## Security hygiene (enforced, see README)

Gitleaks secret scanning is wired as a pre-commit hook, a CI workflow, and a manual
history auditor (mirrored from the author's `agent-connect` repo). Never commit
secrets. There are no secrets in a static blog by design — keep it that way. The
Cloudflare analytics beacon token is public-safe and may appear in post HTML.

## Licensing split

Code (build script, tooling, templates) is MIT — reuse encouraged. Post **content**
(the writing) is the author's, all rights reserved by default (readable and
learnable, not for wholesale republication). See `LICENSE` and the README.

---

*Provenance: the architecture and economics above were distilled from a July 2026
cross-model research conversation (Gemini → ChatGPT → Claude). The bespoke-aggregator
design was the final synthesis. This charter condenses it so future sessions don't
re-derive it.*
