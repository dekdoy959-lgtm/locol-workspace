# WORKLOG — LOCOL Workspace

> Chronological log of design/engineering sessions. Newest at top.

---

## 2026-06-19 · impeccable critique inbox → P1/P2 fixes

`/impeccable init` wrote PRODUCT.md + DESIGN.md + live config (register=product). `/impeccable
critique inbox` scored **28/40 (Good)**; snapshot in `.impeccable/critique/`.

Fixed (detector + regression-backed):
- **P1 — track colors theme-aware (system-wide).** `TRACKS[].color` had dark-hex `soft` blobs +
  `var()` ink/chip on the watch track → broke on the new light theme and in the SVG graph. Now each
  track is a constant accent `ink` + **rgba-tint `soft`** + constant `chip` — theme-agnostic and
  SVG-attribute-safe. Fixes inbox columns/chips, calendar, graph, summary in both themes. Dropped the
  now-unused `colors` import from `types/opportunity.ts`.
- **P2 — side-stripe border (absolute ban).** Dense-card `borderLeft: 3px` → a leading track **dot** +
  full 1px border. Detector re-run: clean (`[]`).

Then completed the remaining two P2s:
- **P2 — control-bar density (`/impeccable layout`).** Folded Sort + Density into a `⚙ View options`
  popover (native `<details>`, marker hidden, escapes the clipped-dropdown trap). Toolbar now =
  Filters + View options only; the board breathes. Addresses the cluttered-enterprise anti-ref.
- **P2 — move-confirmation toast (`/impeccable harden`).** One `moveTrack()` source of truth for
  drag + keyboard moves → a bottom toast "ย้ายไป {track} · เลิกทำ" with working **undo** (re-mutates
  to the prior track), auto-dismiss 4.5s, `l-slide-up`, above the mobile nav.

Deferred: P3 bulk select. Build green (264). Re-run `/impeccable critique inbox` to see the score move.

---

## 2026-06-18 · Design System — Phase B (light/dark theme toggle)

Runtime light + dark theme per the DS (ships both). Default stays **dark** (internal ops tool).

- **Theme model:** surfaces / text / borders / `green` are CSS vars that flip — `:root` = light,
  `[data-theme="dark"]` = dark (`global.css`). Accents (status, cacao, teal, emerald) stay constant
  per DS. `green` flips (dark `#9BCF25` / light readable lime `#5F8513`) so headings + buttons read
  on both. `tokens.ts` surface/text/border/green tokens → `var(--…)`.
- **Toggle:** `ThemeContext` (localStorage `locol-theme`, default dark) + an inline script in
  `index.html` sets `data-theme` before paint (no flash). Toggle UI in the profile menu.
- **SVG var-safety** (the hard part — `var()` doesn't resolve in SVG presentation attributes):
  `LIcon` now uses `currentColor` inside a color-bearing span; `Decorations`/`GroupsList`/
  `PullToRefresh` SVG fills moved to `style`; the Relationship **graph** resolves theme tokens to
  hex via `getComputedStyle` (re-run on theme change) for its `fill`/`stroke` attributes; confetti
  uses static DS hex (canvas can't read vars). Grep-verified: 0 remaining `fill/stroke={colors.<var>}`.
- **Logo** is theme-aware (`BrandLogo`): white on dark, primary on light.

**Validation:** build green (264); login verified in BOTH themes via computed styles
(`--bg`/`--text`/`--green` flip; logo src swaps White↔Primary). ADR-007.
**⚠️ User spot-check after deploy:** authed surfaces (icons, kanban, **relationship graph**) in both
themes — they couldn't be visually verified in preview (login-gated).

---

## 2026-06-18 · Align to official LOCOL Design System — Phase A (dark)

Re-skinned the workspace to the official `LOCOL Design System` (June 2026 spec). The DS validated the
earlier craft pass (asymmetric signature corner, ALL-CAPS headings, rgba borders, ease-out) — Phase A
tunes values to the official spec. **Static dark values only — zero SVG risk.** (Phase B = light + toggle.)

- **`tokens.ts` + `global.css`** → DS dark palette: primary **lime `#9BCF25`** (was `#99CE24`),
  canvas `#0B0D0B`, surfaces `#181B17 / #20241F`, rgba-white borders, neutral-50 text family,
  + new accents (cacao `#6B4226`, climate teal `#45BBAB`, emerald `#2E9E5B`).
- **Fonts** → DS split: headings **IBM Plex Sans (Thai)**, body **Noto Sans (Thai)**, data IBM Plex
  Mono. `LH`/`LBtn` use the heading font; body uses Noto. `@import` updated.
- **Signature corner** → DS brand corners (round TL+BR, small off-corner). Swept all 252 inline
  `Npx 0 Npx 0` literals → `Npx Mpx Npx Mpx`; radius tokens + `LCard` numeric template updated.
- **Hover glow** → official lime glow (`shadow-glow-lime`).
- **Official logo** → `LOCOL_Logo_White.svg` on Login + app chrome (desktop + mobile), replacing the
  custom `MiniL` wordmark. Logos copied to `public/brand/`.

**Validation:** build green (262); preview login confirmed `--green #9BCF25`, `--bg #0B0D0B`, body
Noto Sans Thai, official logo rendering. **Source:** `~/Desktop/Skill MD/Brand Design/LOCOL Design System.zip`.
**Next (Phase B):** light theme + runtime light/dark toggle (var() refactor + SVG-attribute fixes).

---

## 2026-06-17 · Team access management — Phase 5a (#5)

Soft access gate + admin backend (no RLS change yet — see ADR-006).

- **Migration 0020** (user runs): `team_members.status` ('pending'|'active'|'disabled'); existing rows
  default 'active'; `handle_new_user()` trigger updated so **new Google signups land 'pending'**;
  sets `role='admin', status='active'` for the admin email. ⚠️ change the email in the migration to
  your real LOCOL admin Google account before running.
- **`ProtectedRoute`** now gates by status: `pending` → "รออนุมัติ" screen, `disabled` → blocked,
  else through. Missing `status` (pre-migration) resolves to 'active' → zero disruption before 0020.
- **`/team`** (admin only): ✓ อนุมัติ (pending→active) · ปิด/เปิดใช้งาน · status badge per member ·
  pending-approvals banner. Non-admins see read-only controls.
- New hook `useMyTeamMember()` + `isAdmin()` / `memberStatus()` helpers (`useTeamMembers.ts`).
- **#10 also fully closed**: the notification script already routes cold/birthday alerts to a contact's
  `owner_id`, and #9 surfaced owner; so a contact's coordinator now receives those.
- **Onboarding (user action):** publish the Google OAuth consent screen so anyone with a Google
  account can sign in → lands 'pending' → admin approves (removes the Test-Users cap).

**Decision:** signups = pending; depth = 5a now, **5b (hard RLS) deferred** (lockout risk on live DB).
Build green (262 modules). Auth-gated UI — verified via build + review.

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
