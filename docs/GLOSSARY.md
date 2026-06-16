# GLOSSARY — LOCOL Workspace design/project terms

> Project vocabulary (not Bible content terms). Alphabetical.

- **Asymmetric corner / signature corner** — the `Npx 0 Npx 0` border-radius (top-left + bottom-right
  rounded, other two sharp). LOCOL's signature geometry; appears on cards, chips, buttons, the `LH`
  tick. Defined in `radius` tokens.
- **`bgInput`** — input inset surface, *darker* than cards, signalling "type here" without heavy borders.
- **`bgOverlay`** — top rung of the elevation ladder; dropdowns, popovers, and modals sit here so
  they detach from the page.
- **Elevation ladder** — the numbered surface scale `bg → bgSoft → bgCard → bgRaise → bgOverlay`,
  each step slightly lighter/warmer. The backbone of depth in dark mode (see ADR-001).
- **`.l-focus`** — global utility for a consistent green keyboard focus ring on custom interactive
  elements (non-native controls).
- **`.l-lift`** — hover utility: quiet `translateY(-2px)` rise + border firm-up + faint
  signature-green ring. Reduced-motion disables the transform. Used by clickable cards.
- **`LCard` `interactive` / `raised`** — `interactive` adds `.l-lift`; `raised` puts the card one rung
  up the ladder (`bgRaise`) for selected/highlighted state.
- **`LH` `tick`** — opt-in accent block (signature-corner shaped) before a heading; hero flair.
- **Line whisper** — the rgba border philosophy: edges that define structure without demanding
  attention (ADR-003). Scale: `lineSubtle/line/lineHi/lineStrong`.
- **Track** — a kind of opportunity: `apply` (ขอทุน/แข่ง) · `watch` (ติดตามข่าว) · `event` ·
  `trip` (ลงพื้นที่). 4 tracks (was 5; `act`/`contract` removed via migration 0013).
- **Trip scope** — `trip_scope` on a trip opportunity: `domestic` (ในประเทศ) or `international`
  (ต่างประเทศ). Drives the Inbox split and which `intlOnly` briefing fields show. (#1, migration 0019)
- **Trip Intelligence Briefing** — the Part A/B/C trip-prep document, described as a typed config in
  `types/briefing.ts`, rendered by `BriefingEditor`, stored in the `briefing` JSONB column. Section
  kinds: fields / repeatable / checklist / objectives / budget / risk. (#2, ADR-005)
- **Tier** — team-member access level used for visibility (RLS is the security boundary; client
  `canSee()` is a UX hint only).
