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

## ADR-004 · Signature-corner accent tick on hero headings (opt-in)

**Date:** 2026-06-14 · **Status:** Accepted

**Context.** Headings were strong but flat; the user asked for more "ลูกเล่น" (flair).

**Decision.** Add an opt-in `tick` prop to `LH` — a small accent block using the signature
asymmetric corner radius, placed before the heading. Applied to page heroes (Briefing, Inbox); not
default, to avoid noise on every heading.

**Consequences.** Heroes get a distinctive on-brand flourish; the rest of the app stays calm.
