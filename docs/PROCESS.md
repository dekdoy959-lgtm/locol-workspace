# PROCESS — how design/refinement work runs here

> The repeatable workflow for a craft pass, so the next one is consistent.

## Design refinement cycle (used 2026-06-14)

1. **Gate (prompt-pipeline Step 0)** — confirm Mode (A answer / B one-shot package / C step-by-step),
   bookkeeping depth (none / core / full), and HTML presentation. Honor the choice all session.
2. **Ground** — read the foundation first: `tokens.ts`, `global.css`, and the affected primitives.
   Don't audit pages before understanding the token layer — most fixes live there.
3. **Domain exploration (interface-design)** — produce all four: domain, color world, signature,
   defaults-to-reject. Reject at least the obvious template choices.
4. **Package (Mode B)** — write the spec to `docs/DESIGN-REFINEMENT.md`; present a tight approval
   summary (not the full dump); get a go.
5. **Safe-parallel implement** — foundation first (tokens → CSS), then primitives, then spot-apply on
   pages. Never let two edits touch the same file simultaneously. Token/primitive edits propagate
   app-wide, so prefer them over per-page patching.
6. **Pre-flight safety grep** — before risky token swaps (e.g. hex→rgba), grep for patterns that would
   break (hex-alpha concatenation), and count usages to gauge blast radius.
7. **Validate** — `npm run build` green; live-check the running preview (computed CSS vars +
   screenshot + squint test). State evidence, not vibes.
8. **Document** — update the bookkeeping set as work happens (this folder).
9. **Ship** — commit to `main`; Vercel auto-deploys.

## Roles

- **Tokens/primitives** = the leverage layer. One edit → whole app.
- **Pages** = spot-apply only (heroes, overlays, specific cards).
- **The user** runs DB migrations (Supabase SQL Editor) and any credentialed/dashboard actions.
