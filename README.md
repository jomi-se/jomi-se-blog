# jomi-se-blog

A personal blog, AI makes it easy for it to be plain HTML (for now at least)

## How it works

```
posts/<post-slug>/index.html   ← Self contained browser openable page
        │
        ▼
   node build.js           ← reads each post's <head> metadata only
        │
        ▼
   dist/                    ← index.html, archive/, tags/<tag>/, feed.xml, sitemap.xml
                              + a verbatim copy of posts/ and styles/
```

The build reads `<head>` tags from each post — the same OpenGraph/standard
tags you'd want for SEO and social cards:

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
5. Commit and push. Cloudflare Pages rebuilds and deploys automatically on main.

Unpublished drafts live in `drafts/` (gitignored); move a folder into `posts/` to commit and publish.

## Hosting

Cloudflare Workers static assets, free tier, deploying straight from GitHub on
every push to `main` (build: `node build.js`, deploy: `npx wrangler deploy`,
config: [`wrangler.jsonc`](./wrangler.jsonc)). Live at <https://jomi-se.com>.

## Security

Secret scanning with a pinned [Gitleaks](https://github.com/gitleaks/gitleaks)
- **pre-commit hook** (`.githooks/pre-commit`) — blocks commits containing secrets.
- **CI** (`.github/workflows/secret-scan.yml`) — scans full history on push/PR + weekly.
- **history auditor** (`scripts/audit-secret-history.sh`) — manual check for a known value.

One-time local setup after cloning:

```sh
npm run security:hooks:install   # sets core.hooksPath and installs pinned Gitleaks
```

## Licensing

- **Code** (build script, tooling, templates, styles): [MIT](./LICENSE). Reuse freely.
- **Post content** (the writing under `posts/`): © 2026 José M. Arroyo, all rights
  reserved. Read it, learn from it, but please don't republish.