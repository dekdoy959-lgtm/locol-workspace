# WORKLOG — LOCOL Workspace

> Chronological log of design/engineering sessions. Newest at top.

---

## 2026-06-17 · Card overflow — show-more cap (#6)

When a track/stage has many cards the list overflowed. Added a `COLUMN_CARD_LIMIT = 8` cap with a
"▾ แสดงเพิ่ม +N / ▲ ย่อ" toggle to all three card lists in the Inbox: kanban `TrackColumn`
(all view), `StageSection` (staged single-track), and the flat single-track list. Complements the
existing density toggle, auto-collapse-done, and column-scoped scroll. No data/migration. Build green.

---

## 2026-06-17 · Grant funding schedule + Calendar link (#7)

- **`FundingScheduleSection`** on the apply (ขอทุน) detail page — rounds of submit/payout/report,
  each with label · kind · date · amount · done; shows ได้แล้ว ฿X / ฿total. Stored in
  `details.funding` (JSONB) — **no migration**.
- **Calendar link** — `calendarUtils.aggregateCalendarItems` now reads `details.funding` for apply
  opps and emits one calendar item per dated round: kind `funding_submit` (📤 ยื่นทุน, warn) or
  `funding_payout` (💰 ได้เงิน, green). Added both to the exhaustive `kindPriority` + `KIND_META`.

Build green (262 modules). Auth-gated UI — verified via build + review.

---

## 2026-06-17 · Trip — Domestic/International split (#1) + full Trip Intelligence Briefing (#2)

Ports `LOCOL_Trip_Intelligence_Briefing_v1.docx` (Parts A/B/C) into the app, config-driven.

- **Migration 0019** (user runs): adds `opportunities.trip_scope` ('domestic'|'international')
  + `opportunities.briefing jsonb` + a partial index. ⚠️ writes fail until this is run.
- **#1 scope split** — `TripBriefingPanel` has a 🇹🇭/🌏 toggle (writes `trip_scope`); the Inbox
  trip tab gets ทั้งหมด / ในประเทศ / ต่างประเทศ filter chips (with counts) that scope the list
  (works with both flat + stage-grouped views). Trips with no scope default to domestic.
- **#2 briefing** — `src/types/briefing.ts` describes the entire document as a typed config
  (Parts A/B/C → sections → fields, with `intlOnly` flags for passport/visa/import/embassy/visa-budget).
  `BriefingEditor` renders it generically via section kinds: `fields · repeatable · checklist ·
  objectives · budget · risk` (budget auto-totals; objectives have status + 3-tier success criteria).
  `TripBriefingPanel` (on the trip detail page) shows a per-Part filled/total summary and an editor;
  saves the whole `briefing` JSONB via `useUpdateOpportunity`. Timeline (B2) intentionally reuses the
  existing `trip_stops` itinerary, not duplicated.
- Wired into `OpportunityDetailPage` for `track === 'trip'`. `types/database.ts` opportunities Row
  extended with the two columns (Insert/Update are Partial<Row>).

**Architecture:** see [DECISIONS.md ADR-005]. **Follow-up (easy):** add the scope toggle to the trip
*create* form too (today scope is set on the detail panel). **Validation:** build green (261 modules);
briefing UI is auth-gated so not click-verified in preview — reviewed for hook-safety + focus retention
(extracted `ObjectiveList` to avoid remount/focus loss).

---

## 2026-06-16 · Quick wins — contact coordinator (#9), last-contact badge (#11), role de-dupe (#4)

Part of the 11-item batch. All three need **no migration** (fields already existed).

- **#9 contact coordinator** — `contacts.owner_id`/`backup_id` existed in the DB but were never
  surfaced. Added an "ผู้ดูแล / ผู้ประสาน" section to `ContactFormPage` (owner + backup selects from
  team) and show them under the name on `ContactDetailPage`. The existing notification script already
  routes cold/birthday alerts to `owner_id`, so #10 is now effectively wired once an owner is set.
- **#11 days-since-last-contact** — `ContactDetailPage` now shows a header chip "ติดต่อล่าสุด X วันก่อน"
  computed from `last_contact_date` (auto-bumped on each interaction), coloured vs `freq_days`
  (ok / watch / overdue), or "ยังไม่เคยบันทึกการติดต่อ" when null.
- **#4 owner/reviewer de-dupe (Option 1)** — removed `owner`/`reviewer` from `TEAM_ROLE_ORDER`
  (`useOpportunityTeam.ts`) so the Assign Team section only offers the extra roles
  (document_lead/coordinator/traveler/support). Owner+Reviewer stay the two primary roles on the
  opportunity (form, two-person rule). Kept owner/reviewer in `TEAM_ROLE_META` so any legacy
  assignment rows still render. Updated the section note.

**Decisions:** #4 = Option 1 (keep Owner+Reviewer, trim Assign Team). **Validation:** build green (258).

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
