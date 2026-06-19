# CLAUDE.md · LOCOL Workspace — project instructions

> Read this first each session in this repo. If it conflicts with the user's request, ask.

## Identity
Thai-first **internal CRM + opportunity tracker** for **LOCOL** (Thailand low-carbon premium beef,
cocoa-fed cattle / methane reduction). Users: Operations (grants, events, field trips) + Marketing
(content planning). Live: <https://locol-workspace.vercel.app>.

## Stack
Vite 8 + React 19 + TypeScript · Supabase (Postgres + Auth + Realtime + Storage) · TanStack Query ·
React Router 7 · Vercel (auto-deploy from `main`). Package manager: **npm**.

## Hard rules
1. **Design tokens are the single source of truth** — `src/styles/tokens.ts`, mirrored as CSS vars in
   `src/styles/global.css`. Never inline raw hex; reference a token. Keep the two files in lockstep.
2. **Elevation by the surface ladder** (`bg→bgSoft→bgCard→bgRaise→bgOverlay` + `bgInput`); **borders
   are rgba whispers** (`lineSubtle/line/lineHi/lineStrong`). No solid-hex borders. (see `docs/`)
3. **UPPERCASE is the brand signature** — keep it on headings/buttons/short labels, never body copy.
4. **Signature geometry** = asymmetric corner `Npx 0 Npx 0`. Lean into it; don't round all four.
5. **NO Tailwind** — inline styles + tokens only.
6. **All motion gated** behind `prefers-reduced-motion`; deceleration easing, no spring/bounce.
7. **RLS is the security boundary** for tier/visibility — client `canSee()` is a UX hint only.
8. **Don't run `npm run build` mid-edit** — push and let Vercel build; build green only before
   commit/handoff. User can say "build check" to request one.
9. **DB migrations are run by the user** via Supabase SQL Editor (no direct DB access from here).
10. Before any `pbcopy` of SQL/credentials, **ask "พร้อม paste ไหม?"** first (clipboard overwrites).

## Tracks
4 opportunity tracks: `apply` (ขอทุน/แข่ง) · `watch` (ข่าว) · `event` · `trip` (ลงพื้นที่).
(Was 5; `act`/`contract` removed in migration 0013.)

## Docs (update as work happens)
`docs/WORKLOG.md` (always) · `DECISIONS.md` (ADRs) · `FORMULA_METHODOLOGY.md` (why the numbers) ·
`SOP.md` · `PROCESS.md` · `RECONCILIATION.md` · `GLOSSARY.md` · `DESIGN-REFINEMENT.md` (design spec).
Setup: `SETUP-DEV.md` / `SETUP-NON.md`. Past review: `REVIEW-FINDINGS.md`.

## Design context (impeccable)
- [`PRODUCT.md`](./PRODUCT.md) — register (product) · users · purpose · brand personality · design principles · a11y
- [`DESIGN.md`](./DESIGN.md) — visual system: themes, color tokens, typography, components, motion (mirrors `src/styles/tokens.ts`)
- `.impeccable/live/config.json` — `/impeccable live` is pre-configured (Vite SPA, `index.html`)

## Common tasks
| Task | How |
|---|---|
| Dev | `npm run dev` (:5173) |
| Build (pre-commit only) | `npm run build` |
| Lint | `npm run lint` |
| Deploy | `git push` (auto) |
