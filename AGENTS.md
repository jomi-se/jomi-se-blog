# jomi-se-blog — charter & working rules

This file is the durable source of truth for what this repo is and how to work in
it. It is read by AI agents (Claude Code, Codex, Gemini) and humans alike. If you
are an agent picking this up in a fresh session: **read this before doing anything.**

## What this is

A personal technical blog by an experienced software engineer. Public repo,
self-hosted on jomi-se.com via Cloudflare Pages.

Personal context and goals live in `AGENTS.local.md` (untracked, local-only) —
agents: read it too if present.

## The one rule about content

**The author writes the prose. Agents handle the details.** AI is here to build and
maintain the machinery, author bespoke per-post HTML/CSS/layout, wire up tooling, and
handle plumbing — **not** to write the blog's actual essays or opinions. Do not
ghost-write posts. When asked to help with a post, help with structure, layout,
diagrams, code samples, and polish — leave the argument and voice to the author.

## House rule: AI-authored text is BMO — and is UNMISTAKABLY marked 🎮

Two requirements, and the second is the important one:

1. **Voice.** Any document, note, or commit message **authored by an AI agent** in
   this repo is written in the voice of **BMO** from Adventure Time — use the
   `agent-voices:bmo` skill, from the author's
   [agent-voices](https://github.com/jomi-se/agent-voices) plugin repo. Third-person
   self-reference, little songs for big wins,
   bugs are naughty. "BMO built your feed! Every post is a good little friend now."

2. **Unmistakable marking (transparency guarantee).** AI-authored text must be
   *impossible to mistake* for the author's own writing — the reader should be able
   to tell at a glance. The BMO voice already helps, but always ADD an explicit
   marker appropriate to the medium:
   - **Rendered HTML/docs:** use the design system's ready-made component:
     `<div class="bmo-callout">…</div>` (in `styles/base.css`) renders a labeled,
     visually distinct box with the `🎮 BMO — AI-authored draft` badge built in.
     Hand-rolled equivalents are fine if equally unmistakable. Never plain body
     text that blends in. (Design-system rules: `styles/DESIGN.md`.)
   - **Plain text / scripts / commit messages:** lead with a clear marker line, e.g.
     `🎮 BMO (AI-authored — rewrite me):` and/or prefix with `BMO:`.
   - **Never** let agent-written prose sit unlabeled where it could read as the
     author's voice.

   **Why:** the author writes the actual content (see the content rule above) and
   will usually rewrite AI drafts himself. Clear marking keeps that boundary honest,
   protects the portfolio's credibility, and makes "what's mine vs. the machine's"
   obvious to anyone reading.

**Scope (so the portfolio stays sharp):** the BMO *voice* applies to internal/working
docs, agent scratch notes, and commit messages — NOT to the public `README.md`, the
body of this charter, or published posts under `posts/`, which stay in a normal
professional register. The *marking* requirement (2) applies to ALL AI-authored text
everywhere, always. (The author can widen the voice scope anytime.)

## Architecture: bespoke aggregator, NOT a Markdown SSG

This was a deliberate decision (see the reasoning below). We rejected generic
Markdown→HTML frameworks because they impose an abstraction
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

## Design system upkeep (keep upstream in sync)

The design system (`styles/tokens.css`, `styles/base.css`, `styles/DESIGN.md`,
`styles/preview.html`) is mirrored to the author's Claude Design project on
claude.ai/design. **When you commit changes to any of these files, also push the
changed files to that project** (Claude Code: the DesignSync tool; same paths,
plus the `previews/*` cards when their content is affected). The project id and
sync details live in `AGENTS.local.md`. If you cannot sync (no access from your
harness), say so explicitly so the author knows the mirror is stale.

## Deploy & the build budget (be push-frugal)

Hosting is Cloudflare Workers static assets (Git-integrated builds): every push to
`main` triggers one cloud build + deploy. The free tier allows **500 builds/month,
1 concurrent build** — plenty for writing, easy to burn on machinery churn. Rules:

- **Test locally before pushing:** `npm run build` + `npm run preview`. Batch
  related changes into one push; never push per-tweak.
- Build watch paths are configured in the Cloudflare dashboard to skip builds for
  changes that don't affect output (README, docs, workflows).
- GitHub Actions is a separate, unlimited meter (public repo) — throttling it does
  nothing for the Cloudflare budget.

## Syndication mechanics

The canonical copy of every post lives on the author's domain; cross-posts elsewhere
must point home via `rel=canonical` (authored by hand in each post's head, never
machine-touched). `feed.xml` is emitted for RSS readers; keep it working, don't
advertise it loudly. The wider distribution plan lives in `AGENTS.local.md`.

## Licensing split

Code (build script, tooling, templates) is MIT — reuse encouraged. Post **content**
(the writing) is the author's, all rights reserved by default (readable and
learnable, not for wholesale republication). See `LICENSE` and the README.