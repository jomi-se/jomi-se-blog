> 🎮 **BMO (AI-authored)** — BMO wrote this guidance doc! The rules inside are
> real and exact, even if BMO's voice is small and happy. The author's posts are
> the author's; this is just the machinery manual.

# The blog's design system — "Quiet Workbench"

BMO distilled this from two references the author picked: the **Agent Connect
Canvas** design system ("The Open Workbench") and the **Architecture Story**
Claude Design project. Same family, tuned down for reading: a bright, calm
studio where prose is the main tool on the bench.

## The two files

| file | what it is | who loads it |
|---|---|---|
| `styles/tokens.css` | Fonts (self-hosted) + primitive & semantic tokens + light/dark theming | **every** page, always |
| `styles/base.css` | The house layout & typography, consuming only semantic tokens | pages that want the default look |

Posts link them **relatively** so each post stays a double-clickable artifact:

```html
<link rel="stylesheet" href="../../styles/tokens.css">
<link rel="stylesheet" href="../../styles/base.css">
```

Derived pages (index/archive/tags, made by `build.js`) use absolute `/styles/…`
paths — they only ever exist inside `dist/`.

## Three levels of freedom for a post

1. **House style.** Link both files, write semantic HTML. Done! It is already
   pretty.
2. **Reskin.** Link both, then override semantic tokens in a `<style>` block:
   `:root { --color-accent: var(--teal); --measure: 52rem; }` — the whole post
   retunes and stays in the family.
3. **Fully bespoke.** Link only `tokens.css` and build a custom layout — but
   still pull `var(--space-lg)`, `var(--font-mono)`, the palette. Wild shapes,
   same blood.

## Tokens, two tiers

- **Primitives** (`--ink`, `--coral`, `--teal-soft`, `--space-lg`, `--font-mono`,
  `--radius-md`…): raw values. Components never use them directly — but post
  diagrams and callouts may.
- **Semantics** (`--color-bg`, `--color-fg`, `--color-accent`, `--color-code-bg`…):
  what `base.css` and post styles consume. **Only this tier flips between light
  and dark**, so anything built on semantics themes for free.

Dark mode follows the OS (`prefers-color-scheme`); a page can force a side with
`<html data-theme="dark|light">`. If you build on primitives directly, YOU own
making it work in both themes.

## Type

- **Figtree Variable** (300–900) for everything readable; **IBM Plex Mono**
  (400/600) for code. Both self-hosted in `styles/fonts/` — **never** load fonts
  from a CDN. That is the security rule and it is not a game.
- Scale: `--text-headline` (clamp 2–3rem, weight 720, tight) → `--text-title`
  (1.375rem, 650) → `--text-body` (1rem/1.65, 430) → `--text-label` (.8125rem,
  650) → `--text-code` (.875rem mono).
- **The Evidence Voice Rule** (inherited): prose explains; monospace proves.
  Monospace is for code, commands, identifiers, payloads — never for making
  ordinary sentences look technical.

## Color rules (inherited from the Open Workbench, adapted)

- **Neutral majority.** Neutrals carry every page; functional colors clarify,
  never flood. Coral (`--color-accent`) is the brand/link color.
- **Stable identities in diagrams.** When a post draws systems: coral = the
  thing being built, teal = boundary/infra, periwinkle = external agent/service,
  amber = in-flight, green = success, red = failure. Pick once, keep it stable
  across every figure in the post. Each has `-soft` (fills) and `-deep` (text on
  fills) variants; `-bright` variants are for dark backgrounds.
- **Red means trouble.** `--danger` only for failure/warnings, never emphasis.

## Structure & motion

- Flat by default: spacing, dividers (`--color-border`), and surface contrast
  (`--color-surface`) before shadows. One shadow exists (`--shadow-lift`) for
  transient floating things. Never shadow + decorative border together.
- Radii are compact: 6/10/14px (`--radius-sm/md/lg`), `--radius-pill` for chips.
- Motion is state feedback only: `var(--duration) var(--ease-out)` (200ms).
  Reduced-motion users get instant changes automatically (tokens.css zeroes
  `--duration`). No scale bounces, no scroll spectacle.
- No gradients, no glassmorphism, no giant radii, no decorative grid
  backgrounds. Naughty gradients! Not in this house.

## Living reference

Open `styles/preview.html` in a browser to see every token and the house
components rendered in both themes. The same page is uploaded to the author's
Claude Design project ("jomi-se blog") so design work can continue there.
