# DECISIONS — LOCOL Workspace (ADRs)

> Architecture / design decision records. Append-only, newest at bottom. One decision per ADR.

---

## ADR-001 · Surface elevation via color shift, not shadow (dark mode)

**Date:** 2026-06-14 · **Status:** Accepted

**Context.** Cards, dropdowns, and modals all sat on the same `#1c1c1c`, so depth was flat —
dropdowns blended into the cards behind them.

**Decision.** Introduce a numbered surface ladder (`bg → bgSoft → bgCard → bgRaise → bgOverlay`,
each a few % lighter and a hair warmer) and lift overlays (menus/popovers/modals) to `bgOverlay`.
In dark mode shadows barely read, so **elevation is carried by surface lightness + borders**, not
drop shadows (shadows reserved for the hover-lift cue only). Single hue; only lightness shifts.

**Consequences.** Depth reads correctly; overlays detach. All consumers reference the tokens, so the
change was one edit. Future surfaces must pick a rung, not invent a hex.

---

## ADR-002 · Keep UPPERCASE as the brand signature (do NOT de-case)

**Date:** 2026-06-14 · **Status:** Accepted

**Context.** The `interface-design` skill warns that all-uppercase labels "shout" and hurt reading,
and recommends reserving uppercase for eyebrows/true labels. The app uses uppercase widely
(`LH`, `LBtn`, `LNote`).

**Decision.** **Keep uppercase.** It is a deliberate stamped / agri-industrial identity that pairs
with the asymmetric-corner signature; removing it would fail the skill's own *swap test* in the
wrong direction (the UI would read generic). Thai script can't uppercase, so the concern only ever
applied to short English labels — which are genuine labels, the sanctioned use. Readability is
instead improved via **contrast + letter-spacing + line-height** (ADR-003), not by de-casing.

**Consequences.** Identity preserved. Uppercase stays scoped to headings / buttons / short labels —
never long body copy (body was never uppercased).

---

## ADR-003 · Borders as low-opacity rgba whispers; text bumped to WCAG AA

**Date:** 2026-06-14 · **Status:** Accepted

**Context.** Borders were solid hex (`#2a2a2a`/`#3a3a3a`) — harsher than the surfaces they bordered.
Muted text `dim #747474` was ~3.5:1 on canvas (below AA for small text).

**Decision.** Borders → `rgba(255,255,255, .05/.09/.15/.22)` (subtle→strong) so edges blend with
whatever they sit on. Muted text → warm-neutral `#8a8782` (~4.7:1, AA-pass); `dimSoft` warmer &
brighter; body `line-height` 1.5 → 1.55. Verified beforehand that no code concatenates hex-alpha
onto these tokens (which would break with rgba).

**Consequences.** Quieter, more professional structure; small text passes AA; warmth makes the dark
canvas feel "inhabited." Solid-hex borders are now disallowed — use the rgba scale.

---

## ADR-007 · Theming via CSS vars + data-theme; SVG resolves vars to hex

**Date:** 2026-06-18 · **Status:** Accepted

**Context.** The official DS ships light + dark. The app was dark-only with a TS `colors` object of
static hex used in inline styles AND SVG presentation attributes.

**Decision.** Theme via CSS custom properties: `:root` = light, `[data-theme="dark"]` = dark; default
dark (set in `index.html` before paint). Only **surfaces / text / borders / green** flip — other
accents are constant per the DS, which keeps them safe as literal hex in SVG. `colors.*` for the
flipping tokens become `var(--…)` so every inline style is theme-reactive with no per-component work.

**The SVG catch & rule.** `var()` does NOT resolve in SVG presentation attributes (`fill=`/`stroke=`).
So: (1) icons use `currentColor` under a color-bearing wrapper; (2) one-off SVG fills use `style=`
not the attribute; (3) the data-viz graph resolves theme tokens to concrete hex via `getComputedStyle`
(re-run on theme change). **Forward rule:** never put a CSS-var color in an SVG `fill`/`stroke`
*attribute* — use `currentColor`, `style={{fill}}`, or a getComputedStyle-resolved hex.

**Consequences.** One toggle flips the whole app. The one place that needs care forever is SVG color.
Accents not flipping is an intentional DS simplification (lime stays lime). Light-theme lime uses
lime-700 for contrast; a future refinement could split brand-bg vs brand-text tokens if needed.

---

## ADR-006 · Team access — soft gate first (5a), hard RLS deferred (5b)

**Date:** 2026-06-17 · **Status:** Accepted (5a) · Proposed (5b)

**Context.** Anyone in Google "Test Users" who logs in is auto-created as a team_member and (because
RLS lets every authenticated user read/write everything) immediately has full access. The user wants
an in-app way to approve/disable members and manage access.

**Decision.** Ship **Phase 5a** now: add `team_members.status` (pending/active/disabled), make new
signups `pending`, gate the app in `ProtectedRoute`, and give admins approve/disable controls in
`/team`. **Do NOT change RLS yet.** A missing `status` (pre-migration) is treated as `active` so the
live app is never disrupted before the migration runs. **Phase 5b** (helper functions + RLS rewrite so
only active members read/write and only admins change roles/status) is deferred and opt-in, because a
wrong RLS policy on the live, in-use DB could lock the whole team out.

**Consequences.** Real onboarding control + admin backend with near-zero risk. The gate is a UX
boundary, not yet a security boundary (a determined user with the anon key could still hit the API) —
5b closes that. Pair with publishing the Google OAuth consent screen to drop the Test-Users cap.

---

## ADR-005 · Trip Intelligence Briefing is config-driven JSONB, not bespoke columns

**Date:** 2026-06-17 · **Status:** Accepted

**Context.** The trip briefing document (Parts A/B/C) has ~20 sections and 100+ fields, many
repeatable (partners, sites, meetings, hotels, daily logs) and several international-only
(passport, visa, import regs, embassy). Modelling each as typed columns/tables = a huge, rigid
migration; every doc tweak = another migration.

**Decision.** Describe the whole document as a **typed config** in `src/types/briefing.ts`
(parts → sections → fields, each with `intlOnly`), render it with one generic `BriefingEditor`
over a small set of section *kinds* (`fields / repeatable / checklist / objectives / budget /
risk`), and store answers in a single `opportunities.briefing` JSONB column. Add `trip_scope`
('domestic'|'international') as a real column for the Inbox split + indexing. Timeline (B2) reuses
the existing `trip_stops` table rather than duplicating it.

**Consequences.** Adding/editing a briefing field is a one-line config change, no migration. One
migration (0019) covers the whole feature. Trade-off: briefing data isn't individually queryable
in SQL (acceptable — it's per-trip document content, not analytics). The config is also the single
source of truth for the (future) read-only/print view.

---

## ADR-004 · Signature-corner accent tick on hero headings (opt-in)

**Date:** 2026-06-14 · **Status:** Accepted

**Context.** Headings were strong but flat; the user asked for more "ลูกเล่น" (flair).

**Decision.** Add an opt-in `tick` prop to `LH` — a small accent block using the signature
asymmetric corner radius, placed before the heading. Applied to page heroes (Briefing, Inbox); not
default, to avoid noise on every heading.

**Consequences.** Heroes get a distinctive on-brand flourish; the rest of the app stays calm.
