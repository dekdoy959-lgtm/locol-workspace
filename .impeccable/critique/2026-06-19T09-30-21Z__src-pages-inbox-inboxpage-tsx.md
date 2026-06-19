---
target: inbox
total_score: 28
p0_count: 0
p1_count: 1
timestamp: 2026-06-19T09-30-21Z
slug: src-pages-inbox-inboxpage-tsx
---
# Critique — Inbox (`src/pages/inbox/InboxPage.tsx`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | tab counts, stale chips, drag-over highlight, last-update age all present; no toast after a drag-move |
| 2 | Match System / Real World | 3 | Thai-first track names + kanban metaphor read true; UPPERCASE English labels are brand, not noise |
| 3 | User Control and Freedom | 3 | drag + keyboard move, view switches, archive/cancel confirm; no undo on a track move |
| 4 | Consistency and Standards | 3 | DS primitives used throughout; dense-card side-stripe + dark-only track colors break it |
| 5 | Error Prevention | 3 | destructive actions gated by ConfirmModal; track move is instant but reversible |
| 6 | Recognition Rather Than Recall | 3 | tabs/counts/filters visible; density + sort hidden in dropdowns |
| 7 | Flexibility and Efficiency | 3 | keyboard card-move, density modes, focus mode, ⌘K, filters — strong; no bulk select |
| 8 | Aesthetic and Minimalist Design | 2 | header packs tabs + filter chips + density + sort + 2 nav buttons + capture; busiest surface |
| 9 | Error Recovery | 3 | root ErrorBoundary + real empty states; track-color-only meaning is a gap |
| 10 | Help and Documentation | 2 | only the sub-line + track cadence; no hint that cards drag or that ⌘/⌥+arrows move them |
| **Total** | | **28/40** | **Good (low end)** |

## Anti-Patterns Verdict

**LLM assessment:** This does NOT read as AI slop. It avoids the SaaS-cream/hero-metric template, uses a real working kanban, the signature asymmetric corner + single lime accent give it identity, and copy is genuinely bilingual. The risk for this surface isn't AI-genericness — it's the stated anti-reference, **cluttered enterprise**: the control bar above the board is dense.

**Deterministic scan:** `detect.mjs` → 1 finding. `side-tab` (Side-tab accent border) at `InboxPage.tsx:1213` — `borderLeft: 3px solid` on the dense-mode opportunity row. This is a shared absolute ban; it's the one literal AI-tell on the page.

**Visual overlays:** Not available — the live `/inbox` is behind Google OAuth, so no in-page injection/overlay was possible. Findings are from source review + the CLI detector only.

## Overall Impression

A capable, identity-forward ops board that mostly disappears into the task — exactly the brief. Two things hold it at "good" not "excellent": (1) a **light-theme regression** I introduced — track palettes are dark-only hex, so on the new light theme the column headers/chips will render as dark blobs; (2) the **control bar is doing too much at once**, brushing the cluttered-enterprise anti-reference. The single biggest opportunity: make track color theme-aware, then thin the header.

## What's Working

- **Real kanban, real affordances.** Drag-drop + keyboard move (Ctrl/⌘+←/→) + per-column show-more cap — power-user efficiency without breaking the basics. Earned familiarity.
- **Density + focus modes.** Spacious/compact/dense + focus tab respect that ops users have very different session needs (triage vs. deep work).
- **Signature restraint.** One lime accent + asymmetric corner carry the brand; the board itself stays quiet. On-principle.

## Priority Issues

- **[P1] Track colors are dark-only → light theme breaks.** `TRACKS[].color.soft/chip` in `types/opportunity.ts` are static dark hex (`#3a2a0a`, `#1f1f1f`, `#2a1212`, …). Surfaces/text now flip per theme, but these don't — so on light theme the column headers, track chips, and dense-row borders will be dark patches on white.
  - **Why it matters:** the theme toggle I just shipped is visibly broken on the busiest screen; track identity becomes unreadable in light.
  - **Fix:** derive track soft/chip from the track ink via rgba tints (theme-agnostic), or add per-theme values. Verify all 4 tracks in both themes.
  - **Suggested command:** `/impeccable colorize` (or `adapt`)
- **[P2] Side-stripe border on the dense card.** `borderLeft: 3px solid` (line 1213) is a flagged absolute ban — the most recognizable AI-UI tell.
  - **Why it matters:** undercuts the "not AI slop" win; inconsistent with every other card (full 1px border + corner).
  - **Fix:** replace with a leading track **dot** (already used on stage headers) or a faint full-bleed track-tint background; keep the full 1px border.
  - **Suggested command:** `/impeccable quieter` (or `polish`)
- **[P2] Control-bar density (the cluttered-enterprise risk).** Header carries: 6 tabs + 3 filter chips + density toggle + sort dropdown + Summary + Table + Capture. ~13 controls competing before any card is seen.
  - **Why it matters:** directly the anti-reference; raises extraneous cognitive load on the primary triage surface.
  - **Fix:** keep primary (tabs, Capture, filter chips) prominent; fold density + sort + Summary/Table into one "view options" overflow (`⋯`) so the default view breathes.
  - **Suggested command:** `/impeccable layout` (or `distill`)
- **[P2] A track move gives no confirmation.** Dragging or keyboard-moving a card mutates its track instantly with no toast and no undo.
  - **Why it matters:** silent state change on a destructive-ish action; easy to mis-drop and not notice.
  - **Fix:** a brief "ย้ายไป {track} · เลิกทำ" toast (3-4s) wired to the existing mutation.
  - **Suggested command:** `/impeccable harden`
- **[P3] No bulk actions.** Can't multi-select cards to move/archive several at once.
  - **Why it matters:** ops users processing a backlog repeat single-item actions.
  - **Fix:** shift-click / checkbox multi-select with a batch action bar. Defer until the above land.

## Persona Red Flags

**Alex (Power User):** keyboard move ✓, ⌘K ✓, density ✓ — strong. But **no bulk select**: moving 10 stale items = 10 separate drags. Sort + density are buried in dropdowns, not keyboard-reachable.

**Sam (Accessibility):** cards are keyboard-operable with visible green focus rings ✓, WCAG AA text ✓. But **track meaning leans on color** — mitigated by the track name + icon on the chip, so not color-alone. The light-theme track-color regression (P1) will hurt low-vision users most.

**"Nok" (Ops coordinator — project persona from PRODUCT.md):** Thai-first ops user triaging grants/events/trips. Reads the board fast to find "what needs me today." The control-bar density (P2) and the lack of a move-confirmation (P2) are her two friction points; otherwise the track split + stale chips serve her job well.

## Minor Observations

- Density + sort as native-ish dropdowns: confirm they're keyboard + screen-reader friendly (custom dropdowns often aren't).
- Lifecycle micro-bar in the column header is a nice touch but unlabeled — its meaning isn't discoverable (Help/docs gap).
- `flatExpanded` / column `expanded` state doesn't reset on tab switch — minor surprise when returning to a tab still expanded.

## Questions to Consider

- What if the board defaulted to **Focus** (what needs me today) rather than **All**? The primary job is triage, not browsing everything.
- Does the header need every control visible at once, or could "view options" collapse the rarely-changed ones?
- What would the *confident* version of a track move look like — silent, or a crisp "moved · undo"?
