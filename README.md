# jomi-se-blog

A personal technical blog, built the way I actually wanted it: **each post is a
hand-authored, self-contained HTML page**, and a tiny zero-dependency build script
aggregates them into an index, archive, tag pages, an RSS feed, and a sitemap.

No Markdown framework, no SSG, no plugins. The repo is public on purpose — it's part
of the point. Here's how it's done; look and learn.

> **Why not just use Eleventy / Hugo / Astro?** Because a generic Markdown→HTML
> pipeline imposes a uniform shape on every post, and I don't want that. I want the
> form to serve the content — bespoke layout, custom CSS, the occasional interactive
> widget, per post. AI makes authoring one-off HTML basically free, which removes the
> only reason SSGs existed for me. What I still need is the *derivation* (index, feed,
> archive stay consistent as posts accumulate). That's all `build.js` does. The full
> reasoning lives in [`AGENTS.md`](./AGENTS.md).

## How it works

```
posts/<slug>/index.html   ← the source of truth (a complete, browser-openable page)
        │
        ▼
   node build.js           ← reads each post's <head> metadata only
        │
        ▼
   dist/                    ← index.html, archive/, tags/<tag>/, feed.xml, sitemap.xml
                              + a verbatim copy of posts/ and styles/
```

The build reads exactly six `<head>` tags from each post — the same OpenGraph/standard
tags you'd want for SEO and social cards anyway:

```html
<title>…</title>
<meta property="og:title" content="…">
<meta property="og:description" content="…">     <!-- also the RSS summary -->
<meta property="article:published_time" content="YYYY-MM-DD">
<meta name="keywords" content="tag-a,tag-b">
<link rel="canonical" href="https://DOMAIN/posts/<slug>/">
```

Everything below `</head>` is free-form. See [`posts/hello-world/`](./posts/hello-world/)
for the template.

## Writing a post

1. `cp -r posts/hello-world posts/my-slug`
2. Edit the six head tags (point `canonical` at `/posts/my-slug/`).
3. Write the body however the content wants. Put images/assets in the same folder.
4. `npm run build` and open `dist/index.html` (or `npm run preview` for a local server).
5. Commit and push — Cloudflare Pages rebuilds and deploys automatically.

Unpublished drafts live in `drafts/` (gitignored); move a folder into `posts/` to ship.

## Deploying (Cloudflare Workers static assets)

Free tier, publishes straight from GitHub on every push. Cloudflare has merged Pages
into Workers, so this uses the Workers import flow + `wrangler`:

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** →
   pick this GitHub repo.
2. In "Set up your application":
   - **Build command:** `node build.js`
   - **Deploy command:** `npx wrangler deploy`
3. `wrangler.jsonc` (in this repo) points Wrangler at `./dist` as static assets — no
   Worker script needed. `node build.js` produces `dist/`; `wrangler deploy` uploads it.
4. Add your custom domain under the Worker's **Domains & Routes** (free SSL), then set
   `SITE_URL` (a build-environment variable, or edit the constant in `build.js`) to that
   domain so feed/sitemap links are absolute and correct.
5. Optional: enable **Web Analytics** (free, privacy-first) — its beacon token is
   public-safe to include in page HTML.

Every push to `main` deploys; non-production branches get preview builds.

## Security

Secret scanning with a pinned [Gitleaks](https://github.com/gitleaks/gitleaks),
mirrored from my `agent-connect` repo, wired three ways:

- **pre-commit hook** (`.githooks/pre-commit`) — blocks commits containing secrets.
- **CI** (`.github/workflows/secret-scan.yml`) — scans full history on push/PR + weekly.
- **history auditor** (`scripts/audit-secret-history.sh`) — manual check for a known value.

One-time local setup after cloning:

```sh
npm run security:hooks:install   # sets core.hooksPath and installs pinned Gitleaks
```

There are no secrets in a static blog by design — this just keeps it that way.

## Licensing

- **Code** (build script, tooling, templates, styles): [MIT](./LICENSE). Reuse freely.
- **Post content** (the writing under `posts/`): © 2026 José M. Arroyo, all rights
  reserved. Read it, learn from it, but please don't republish the essays wholesale.

## Layout

```
build.js                  the aggregator (zero deps, Node stdlib only)
posts/<slug>/index.html   your posts
styles/base.css           shared defaults posts may use or override
drafts/                   local, gitignored
scripts/                  gitleaks install + scan + history audit
.githooks/pre-commit      secret-scan gate
.github/workflows/        secret-scan.yml, build.yml
AGENTS.md                 charter + working rules (read this first)
```
