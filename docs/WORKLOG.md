# WORKLOG — LOCOL Workspace

> Chronological log of design/engineering sessions. Newest at top.

---

## 2026-06-16 · Fix card-click black-screen (Rules-of-Hooks) + root ErrorBoundary

**Bug (user #3):** clicking any opportunity card showed a black screen on first open;
exiting and re-entering then worked.

**Root cause:** `OpportunityDetailPage` called `useMemo(teamById)` *after* the early
`if (isLoading)` / `if (!opp)` returns. On a cold click the first render returns early
(useMemo skipped); when data arrives the re-render reaches the extra hook → React throws
"Rendered more hooks than during the previous render". With **no error boundary**, that
blanks the whole app (black, on the dark canvas). Re-entry worked because the opp was then
cached → `isLoading` false on the first render → hook count consistent.

**Fix:**
- Moved `teamById` `useMemo` above the early returns (all hooks now run unconditionally).
- Added `src/components/layout/ErrorBoundary.tsx` and wrapped `<Routes>` — any future render
  throw now shows a recoverable card (ลองใหม่ / กลับ Inbox) instead of a black screen; it
  auto-resets when the route path changes.
- Audited all detail pages (`Contact/Org/Group/Brief/Team`) — no other hook-after-return
  violations.

**Validation:** `npm run build` green (258 modules). Fix is the canonical Rules-of-Hooks
remedy; traced the exact cold-vs-warm-cache crash path.

---

## 2026-06-14 · Design refinement (craft pass A–F)

**Goal (user):** "สวยขึ้น · อ่านง่ายขึ้น · มีลูกเล่นขึ้น" — a craft-level polish on top of the
already-clean codebase, using the `interface-design` skill methodology. No new features.

**Approach:** prompt-pipeline Mode B (one-shot package → approve → execute). Almost everything
flows through **design tokens + primitives**, so one edit propagates app-wide across all routes.
Package spec: [`DESIGN-REFINEMENT.md`](./DESIGN-REFINEMENT.md). Rationale for the numbers:
[`FORMULA_METHODOLOGY.md`](./FORMULA_METHODOLOGY.md). Decisions: [`DECISIONS.md`](./DECISIONS.md).

**Changed:**
- `src/styles/tokens.ts` — **A** surface elevation ladder (`bg→bgSoft→bgCard→bgRaise→bgOverlay`
  + `bgInput`), each rung a whisper-quiet step lighter & a hair warmer · **B** border progression
  moved from solid hex to rgba whispers (`lineSubtle/line/lineHi/lineStrong`) · **C+D** warm-neutral
  text hierarchy, `dim` bumped to AA-pass (`#8a8782`, ~4.7:1), `dimSoft` warmer/brighter.
- `src/styles/global.css` — CSS vars kept in lockstep with tokens · body `line-height` 1.5 → **1.55**
  + `optimizeLegibility` · **F** `.l-lift` enhanced (deceleration easing + border firm-up + faint
  signature-green ring), now reduced-motion-gated · new `.l-focus` keyboard ring utility.
- `src/components/primitives/LCard.tsx` — `interactive` (adds `.l-lift`), `raised` (one rung up),
  `className` passthrough; default surface still `bgCard` (backward compatible).
- `src/components/primitives/LH.tsx` — **E** big-heading tracking tightened (−0.5 → −1), per-level
  tracking scale, optional `tick` (signature-corner accent block before the heading), `sub` bumped
  to 13.5px / 1.5 lh for readability.
- **A (overlays)** `UserMenu` · `NotificationBell` · `GlobalSearch` · `ConfirmModal` ·
  `ShareContactModal` → panels moved to `bgOverlay` so they detach from the page.
- **E (heroes)** `BriefingPage` + `InboxPage` headers → `tick`.

**Kept deliberately:** UPPERCASE on headings/buttons/labels — it's the stamped, agri-industrial
brand signature; de-casing would read *generic*. Readability solved via contrast + spacing + line-
height instead (ADR-002).

**Validation:** `npm run build` green (tsc + vite, 257 modules). Live token check via preview on
:5173 — `--bg-card #1d1c19`, `--line rgba(255,255,255,0.09)`, `--dim #8a8782`, body lh 24.8px (1.55)
all confirmed. Login page squint-tested: clear hierarchy, soft borders, single green accent.

**Risk:** 🟢 Low — token/primitive-level, reversible, no DB/logic touched. Verified no hex-alpha
concatenation on changed tokens before converting borders to rgba.

**Ship:** committed to `main` → Vercel auto-deploy → `locol-workspace.vercel.app`.

---

## Earlier

Prior history (build-out of the CRM, kanban, calendar, trips, team, multi-agent review remediation)
predates this log and lives in git history + `REVIEW-FINDINGS.md`.
