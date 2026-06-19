# Product

## Register

product

## Users

Two internal teams at **LOCOL** (Thailand climate-biotech / low-carbon premium beef — cocoa-fed
cattle, methane reduction), working **Thai-first** (bilingual TH/EN):

- **Operations** — track grants & competitions (ขอทุน), news to watch, events, and field trips
  (ลงพื้นที่). Often at a desk planning; sometimes on mobile during trips.
- **Marketing** — read across opportunities to plan content; coordinate with Ops on shared items.

Job to be done: keep every opportunity, contact, and commitment moving so **nothing falls through
the cracks**, and let anyone see "what needs me today" at a glance.

## Product Purpose

An internal CRM + opportunity tracker. Core surfaces: an **Inbox** (4 tracks — apply · watch ·
event · trip — as kanban + list), **Contacts / Organizations** with a relationship graph,
**Calendar**, **Team**, a daily **Briefing**, and per-trip **Trip Intelligence Briefings**.
Success = the team is coordinated, deadlines and payouts are never missed, and coordination cost
(status pings, spreadsheets) drops to near zero.

## Brand Personality

**Scientific · precise · future-facing** — a global climate-biotech company born from real
agricultural experience. External line: *"Sustainability Finally Pays."* The UI should feel exact
and quietly confident, not flashy. Voice is clear and bilingual (Thai primary, English secondary),
never lossy in either language.

## Anti-references

- **Cluttered enterprise** (SAP-style dense menus, deep navigation, heavy tables, noisy chrome) —
  the explicit thing to avoid.
- Generic SaaS dashboards (gradient hero-metric templates, identical card grids) — the AI default.
- Playful consumer-app styling (cartoonish, oversized rounded, bouncy motion) — wrong register for
  an internal tool.

## Design Principles

1. **The tool disappears into the task.** Earned familiarity over novelty; standard affordances done
   well beat invented ones. A user fluent in Linear/Notion/Stripe should trust it on sight.
2. **Thai-first, fully bilingual.** TH leads, EN supports; labels, dates, and copy work in both
   without losing meaning.
3. **Signature restraint.** Identity is carried by ONE lime accent (`#9BCF25`) + the asymmetric
   signature corner — everything else stays quiet. Calm surfaces, no decoration for its own sake.
4. **Nothing falls through the cracks.** The system surfaces what needs attention now (stale, due,
   cold, upcoming payouts) rather than making people hunt for it.
5. **Practice the brand.** Climate-biotech precision shows up as an exact, low-noise, fast interface
   — the product behaves the way the company claims to.

## Accessibility & Inclusion

- **WCAG AA** for text contrast (muted/metadata colors were bumped to ≥4.5:1 this cycle).
- **Reduced motion** honored everywhere — every animation has a `prefers-reduced-motion` fallback
  (crossfade / no transform); hover-lift transforms disabled under `reduce`.
- **Keyboard-operable** primary surfaces (kanban cards: Enter/Space to open, Ctrl/⌘+←/→ to move) with
  visible green focus rings.
- **Light + dark themes** ship (default dark for the desk tool); brand lime stays readable in both.
