# Design

Visual system for LOCOL Workspace, aligned to the official **LOCOL Design System** (June 2026).
Source of truth in code: `src/styles/tokens.ts` (TS tokens) + `src/styles/global.css` (CSS vars,
per-theme). Surfaces / text / borders / brand flip by theme; accents are constant.

## Theme

Clean, photo-forward, slightly futuristic climate-biotech. **Dark by default** (a desk ops tool),
with a full **light** theme; toggle in the profile menu, persisted (`localStorage: locol-theme`),
set pre-paint in `index.html` to avoid flash (`<html data-theme>`).

## Color

Strategy: **Restrained** — tinted near-neutral surfaces + one brand accent. Primary = **Logo Lime
`#9BCF25`**. Brand lime flips for legibility (bright on dark, lime-700 on light); status/support
accents stay constant across themes.

**Brand & accents (constant)**
- Brand lime: `#9BCF25` (dark) / `#5F8513` (light, readable) — `--green`
- Status: danger `#E5484D` · warn `#F2A541`
- Support: cacao `#6B4226` · climate teal `#45BBAB` · emerald `#2E9E5B` · olive `#9aa56a`

**Dark theme (`[data-theme="dark"]`)**
- Surfaces: canvas `#0B0D0B` · sunken `#101310` · card `#181B17` · raised `#20241F` · overlay `#262B24` · input `#0E110D`
- Text: primary `#F7F8F6` · secondary `rgba(247,248,246,.74)` · muted `rgba(247,248,246,.52)`
- Borders: rgba white .10 / .16 / .28 / .40 (subtle → strong)

**Light theme (`:root`)**
- Surfaces: page `#F7F8F6` · sunken `#EFF1ED` · card `#FFFFFF` · raised `#F0F2EE` · overlay `#FFFFFF`
- Text: primary `#202522` · secondary `#4A4E47` · muted `#6E726B`
- Borders: rgba ink .06 / .12 / .20 / .30

Contrast: body/metadata ≥ WCAG AA in both themes.

## Typography

- **Headings:** IBM Plex Sans Thai / IBM Plex Sans — uppercase, tight tracking (−1 at display).
- **Body:** Noto Sans Thai / Noto Sans, weight 400, line-height 1.55.
- **Data / numerals:** IBM Plex Mono.
- Fixed scale (product, not fluid): h1 56 · h2 36 · h3 26 · h4 20 · h5 16 · body 13.5 · small 12 · micro 11/10.
- Uppercase is a deliberate brand signature on headings / buttons / short labels — never on body copy (Thai is caseless, unaffected).

## Shape & spacing

- **Signature corner:** asymmetric `Npx Mpx Npx Mpx` (rounded top-left + bottom-right, small
  off-corner ≈20%) echoing the interlocking logo mark. Radius scale: card 22/5 · cardSm 16/4 ·
  chip 10/3 · btn 12/3.
- Spacing: 4px base scale (`space.xs…7xl`).
- Depth: surface-color elevation ladder + rgba borders (dark mode leans on borders, not shadows);
  hover adds a faint lime glow ring.

## Components (`src/components/primitives/`)

`LCard` (signature corner, `interactive` hover-lift, `raised`) · `LBtn` (primary lime / ghost) ·
`LChip` · `LH` (heading + optional signature `tick`) · `LNote` (eyebrow) · `LStatus` · `LIcon`
(stroke icon set, `currentColor`) · `LInput`/`LSelect`/`LTextarea` · `LAvatar` · `LSkeleton`.
Every interactive element carries default/hover/focus/active/disabled; lists use skeletons + taught
empty states. Official logo via `BrandLogo` (white on dark, primary on light).

## Motion

- Deceleration ease `cubic-bezier(0.16, 1, 0.3, 1)`; durations 120 / 200 / 320 ms. No spring/bounce.
- Motion conveys state (hover lift, stagger-in lists, bell bounce, ink-sweep) — not decoration.
- **Reduced motion** gated everywhere (`prefers-reduced-motion`): transforms disabled, crossfade fallback.

## Iconography

One stroke-based icon set (`LIcon`, 1.5px stroke, `currentColor`). Emoji reserved for playful status
glyphs (track/flag chips), not core UI.
