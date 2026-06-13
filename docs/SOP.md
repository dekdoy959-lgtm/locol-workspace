# SOP — Standard Operating Procedures (LOCOL Workspace)

> How to extend the design system without drifting it. Keep tokens the single source of truth.

## Adding / changing a color

1. Edit `src/styles/tokens.ts` (the `colors` object) **and** mirror it in `src/styles/global.css`
   `:root` if it has a CSS-var twin. These two MUST stay in lockstep.
2. Never write a raw hex inline in a component — reference a token. If no token fits, add one.
3. Before converting any token to `rgba(...)`, grep for hex-alpha concatenation
   (`${colors.X}33`) — rgba breaks that pattern.

## Adding a surface

Pick a rung of the elevation ladder (`bg/bgSoft/bgCard/bgRaise/bgOverlay/bgInput`) — do not invent a
new hex. Higher elevation = lighter. Overlays (menus/modals/popovers) use `bgOverlay`. Inputs use
`bgInput` (darker = inset).

## Adding a border

Use the rgba scale (`lineSubtle/line/lineHi/lineStrong`) — match intensity to the boundary's
importance. Solid-hex borders are disallowed (ADR-003).

## Making a card clickable

Pass `interactive` to `LCard` (adds `.l-lift`), or add `className="l-lift"` to a custom card root.
Ensure a keyboard path: `role="button"`, `tabIndex={0}`, Enter/Space handler, and a focus ring
(`.l-focus` or inline). The inbox `OpportunityCard` is the reference implementation.

## Adding motion

Gate every animation behind `@media (prefers-reduced-motion: no-preference)` (or disable the
transform under `reduce`). Use deceleration easing; no spring/bounce. Fast micro-interactions
(~120–200ms); larger transitions slightly longer.

## Typography

Headings/buttons/short labels may be UPPERCASE (brand signature, ADR-002). Never uppercase long body
copy. Big headings get tight tracking (`LH` handles this per level); small labels get airy tracking.

## Build / ship

- `npm run build` (= `tsc -b && vite build`) must be **green before commit**. Do not run build mid-
  edit; push and let Vercel build for routine deploys.
- `main` auto-deploys to `locol-workspace.vercel.app`.
- DB migrations are run by the user via the Supabase SQL Editor (Claude has no direct DB access).
