---
target: inbox
total_score: 31
p0_count: 0
p1_count: 0
timestamp: 2026-06-19T09-55-28Z
slug: src-pages-inbox-inboxpage-tsx
---
# Critique — Inbox (`src/pages/inbox/InboxPage.tsx`) · run #2

## Design Health Score

| # | Heuristic | Score | Δ | Key Issue |
|---|-----------|-------|---|-----------|
| 1 | Visibility of System Status | 4 | +1 | move toast now confirms drag/keyboard track changes |
| 2 | Match System / Real World | 3 | — | Thai-first tracks + kanban read true |
| 3 | User Control and Freedom | 3 | — | undo on move now; still no undo on stage/edit |
| 4 | Consistency and Standards | 4 | +1 | side-stripe gone, track colors consistent in both themes, all DS |
| 5 | Error Prevention | 3 | — | destructive actions confirmed; move reversible via toast |
| 6 | Recognition Rather Than Recall | 3 | — | sort/density now one click into View options, clearly labeled |
| 7 | Flexibility and Efficiency | 3 | — | keyboard move, density, focus, ⌘K · still no bulk select |
| 8 | Aesthetic and Minimalist Design | 3 | +1 | toolbar decluttered to Filters + View options |
| 9 | Error Recovery | 3 | — | ErrorBoundary + real empty states |
| 10 | Help and Documentation | 2 | — | FirstRunTip + sub hint help; lifecycle micro-bar still unlabeled |
| **Total** | | **31/40** | **+3** | **Good** |

## Anti-Patterns Verdict

**LLM assessment:** Still not AI slop — and now cleaner. The control bar no longer brushes the cluttered-enterprise anti-reference; the dense row reads as a tidy list with a track dot rather than the side-stripe tell.

**Deterministic scan:** `detect.mjs` → **0 findings** (was 1; the side-stripe at line 1213 is resolved).

**Visual overlays:** Not available — live `/inbox` is Google-OAuth-gated; findings from source review + CLI detector.

## Overall Impression

The four fixes from run #1 landed cleanly and moved the needle where expected: status feedback, consistency, and minimalism. 31/40 is solidly "Good." What's left isn't broken design — it's the next tier of efficiency: **bulk actions** for an ops board where users process backlogs, and small help/discoverability polish.

## What's Working

- **Move → toast → undo** closes the silent-mutation gap; the board now feels safe to rearrange.
- **View options popover** thinned the toolbar without hiding anything — the default view breathes.
- **Track identity is theme-safe** (rgba tints + accent dot), readable in light and dark, no SVG breakage.

## Priority Issues

- **[P2] No bulk actions.** An ops user clearing 10 stale items still repeats 10 single moves/archives.
  - **Why it matters:** the core job is processing a backlog; single-item-only is the efficiency ceiling for the power user (Alex).
  - **Fix:** shift/⌘-click or a checkbox affordance to multi-select cards → a batch action bar (move track, archive, set priority). Keyboard-accessible.
  - **Suggested command:** `/impeccable craft` (it's a feature, not a tweak) or direct build.
- **[P3] Lifecycle micro-bar is unlabeled.** The per-column stage progress bar has no legend/tooltip.
  - **Fix:** a `title`/tooltip naming the stages it represents.
  - **Suggested command:** `/impeccable clarify`
- **[P3] View options + filters don't persist across reloads.** Density/sort/filter reset each visit.
  - **Fix:** persist to localStorage (the calendar split already does this).
  - **Suggested command:** `/impeccable harden`

## Persona Red Flags

**Alex (Power User):** keyboard move + undo + ⌘K are strong now. The one remaining gap is **bulk select** — backlog processing is still one-at-a-time.

**Sam (Accessibility):** keyboard-operable cards, focus rings, AA text, theme-safe track colors ✓. Confirm the `<details>` View options popover is keyboard-toggleable (Enter on summary) and the LSelect inside is reachable.

**"Nok" (Ops coordinator):** the move toast + lighter toolbar directly improve her fast-triage flow. Her next friction is volume — when a track has 30+ items, per-item actions add up (→ bulk select).

## Minor Observations

- Toast lives at `bottom: 80` to clear the mobile bottom nav — verify it doesn't collide with the pull-to-refresh indicator on mobile.
- `<details>` popover stays open after picking a sort; consider closing on selection for a tighter feel (minor).

## Questions to Consider

- For backlog processing, is bulk-select the right model, or would per-column "move all done → archive" be faster for the actual workflow?
- Should the board remember the user's last view (tab + density + filters), so returning lands them where they left off?
