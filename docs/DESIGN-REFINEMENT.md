# LOCOL Workspace — Design Refinement Package

> Mode B (one-shot package) · craft-level audit via `interface-design` skill
> Goal: prettier · more polished · easier to read · more flair — on top of already-polished code
>
> **Status: ✅ SHIPPED 2026-06-14** — A–F implemented, build green, deployed to `main`.
> See [`WORKLOG.md`](./WORKLOG.md) for the change list, [`DECISIONS.md`](./DECISIONS.md) for the
> rationale, [`FORMULA_METHODOLOGY.md`](./FORMULA_METHODOLOGY.md) for the exact values.

## Domain exploration (interface-design required outputs)

**Domain:** cocoa-fed cattle · low-carbon premium beef · Thai farms / ลงพื้นที่ · methane reduction · grants & competitions · field trips · agri-tech × sustainability · earthy-pastoral meets technical-data.

**Color world:** acid rice-leaf green (#99CE24, on-brand ✓) · rich night-soil black (#101010) · dried-grass olive (#9aa56a) · late-afternoon farm amber (#E8B923) · clay/sunset terracotta (#d96a66). All already exist as tokens. **Gap:** the dark canvas reads as flat uniform black — not "inhabited." No elevation warmth.

**Signature:** the asymmetric `14px 0 14px 0` corner (top-left + bottom-right rounded, other two sharp). Genuinely distinctive · appears on cards/chips/buttons. KEEP + lean into it.

**Defaults to reject:**
1. Flat single-surface cards (everything #1c1c1c) → **numbered elevation ladder**
2. Solid hex borders #2a2a2a (harsh) → **low-opacity rgba borders (whisper)**
3. Everything-uppercase-letterspaced labels (shouty, hurts reading) → **reserve uppercase for eyebrows/labels; sentence-case + larger body for content**

---

## Audit findings → refinement plan

### A · Elevation ladder (the backbone of craft)
**Now:** `bgCard #1c1c1c` used for everything · dropdowns/modals don't sit visibly above cards · flat.
**Fix:** numbered scale `elev0 canvas #101010 → elev1 card #161616 → elev2 raised/hover #1c1c1c → elev3 overlay/dropdown/modal #232323`, each a whisper-quiet step. Dropdowns + modals move up one rung so they detach from the page.

### B · Border softening (instant whisper upgrade — token change, propagates everywhere)
**Now:** `line #2a2a2a` / `lineHi #3a3a3a` solid hex — slightly harsh on dark.
**Fix:** `line → rgba(255,255,255,0.07)` · `lineHi → rgba(255,255,255,0.12)` · keep solid hex only for focus rings. Borders define edges without demanding attention.

### C · Readability (user asked "อ่านง่ายขึ้น")
**Now:** lots of 10–11px `dim #747474` text (≈4:1 on #101010 — borderline) · all-uppercase English labels SHOUT (Thai can't uppercase so it's inconsistent) · `sub` always 13px weight-300.
**Fix:** (1) bump `dim` → #8a8a8a for small text contrast · (2) body line-height 1.5 → 1.55 · (3) keep uppercase ONLY for true eyebrow labels (LNote, section headers, status chips) — switch button/heading content to sentence/normal case where it reads as content not label · (4) raise minimum functional text to 11px.

### D · Warmth in the dark canvas (designer big-picture: "inhabited")
**Now:** pure neutral grays — feels like a void.
**Fix:** shift elevation grays a hair warm (e.g. card #161513 instead of #161616) — barely perceptible but makes the dark feel like soil/wood not screen-black. Tiny ambient warmth, not a tint.

### E · Heading + hero craft
**Now:** LH headings good scale but flat green-on-dark · hero areas plain.
**Fix:** add optional accent tick/underline using the signature corner on section headers · tighten big-heading tracking (-0.5 → -1 at h1/h2) · LNote eyebrow gets a small leading bar in track/accent color.

### F · Card internal rhythm + hover
**Now:** uniform 18px padding · `.l-lift` exists but not applied everywhere clickable.
**Fix:** apply `.l-lift` + accent glow-ring to all clickable cards (inbox, contacts, orgs, calendar items) consistently · tune padding scale (compact 12 / default 16 / roomy 20) tied to density.

---

## Scope (what gets touched)
- `src/styles/tokens.ts` — elevation scale + softened borders + warm grays + dim bump (propagates app-wide)
- `src/styles/global.css` — body line-height + apply-lift helper
- `src/components/primitives/` — LCard (elevation prop), LH (tracking + tick), LBtn (case), LChip, LNote (leading bar)
- Spot-apply on key pages: Briefing hero, Inbox cards, Contact/Org cards, Calendar items, modals/dropdowns elevation

## Out of scope (already done / not requested)
- The 15 polish animations (done) · hex→token (done) · emoji→LIcon (done)
- New features · Tailwind (banned) · marketing pages

## Validation
- `npm run build` green after each batch · spot-check key pages render · all motion stays gated behind prefers-reduced-motion · contrast checked against WCAG AA for small text

## Risk
🟢 Low — almost all changes flow through tokens + primitives (1 edit → whole app). Reversible. No DB/logic touched.
