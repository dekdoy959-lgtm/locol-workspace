# FORMULA METHODOLOGY — why these specific values

> The reasoning behind the exact numbers in the design system, so future edits don't drift them
> blindly. Source of truth for the values: [`src/styles/tokens.ts`](../src/styles/tokens.ts)
> (mirrored into `src/styles/global.css` as CSS vars).

## Surface elevation ladder

| Token | Value | Approx L\* | Role |
|---|---|---|---|
| `bg` | `#101010` | ~6.6 | L0 canvas (brand black) |
| `bgSoft` | `#171614` | ~8.6 | L1 inset / section bands |
| `bgCard` | `#1d1c19` | ~11 | L2 cards (default resting surface) |
| `bgRaise` | `#252320` | ~13.6 | L3 raised / hover / active |
| `bgOverlay` | `#2c2a26` | ~16 | L4 dropdowns / popovers / modals |
| `bgInput` | `#141311` | ~7.6 | input inset (darker than card → "type here") |

**Why ~2–2.5 L\* per step:** each jump is almost invisible in isolation but the hierarchy emerges
when surfaces stack — "whisper-quiet shifts you feel rather than see" (interface-design). Inputs go
*darker* than their surroundings (inset), surfaces go *lighter* with elevation.

**Why warm-neutral (R ≥ G ≥ B):** a hair of warmth (e.g. card `#1d1c19` vs neutral `#1c1c1c`) makes
the dark read like soil/wood at night rather than screen-black — fits the agri/farm domain. Kept
sub-perceptual so it never tints toward brown or fights the green brand.

## Border opacity scale

| Token | Value | Use |
|---|---|---|
| `lineSubtle` | `rgba(255,255,255,0.05)` | faint inner dividers |
| `line` | `rgba(255,255,255,0.09)` | standard border |
| `lineHi` | `rgba(255,255,255,0.15)` | emphasis border |
| `lineStrong` | `rgba(255,255,255,0.22)` | max emphasis / hover firm-up |

**Why rgba not hex:** low-opacity white blends with whatever surface it sits on, so one token reads
correctly on every rung of the ladder. `0.09` over `#101010` ≈ the old `#2a2a2a` but softer; the
progression matches intensity to the importance of the boundary.

## Text contrast (WCAG)

| Token | Value | Contrast on `#101010` | Tier |
|---|---|---|---|
| `text` | `#FFFFFF` | ~19:1 | primary |
| `surface` | `#D9D9D9` | ~13:1 | bright body |
| `dimSoft` | `#a6a39e` | ~6:1 | secondary / labels |
| `dim` | `#8a8782` | ~4.7:1 | muted / metadata (AA-pass) |

**Why `dim` was bumped from `#747474`:** old value ~3.5:1 failed AA for normal text. `#8a8782`
clears the 4.5:1 bar while staying clearly below `dimSoft`, preserving a 4-level hierarchy.

## Motion

| Value | Where | Why |
|---|---|---|
| `1.55` line-height | body | comfortable reading for mixed Thai/English (Thai needs more leading) |
| `cubic-bezier(0.16,1,0.3,1)` | `.l-lift` | deceleration ease — professional, no spring/bounce |
| `180ms` | hover lift | fast micro-interaction; settles quickly |
| `translateY(-2px)` + `0 0 0 1px rgba(153,206,36,0.14)` | hover | quiet rise + faint signature-green ring; disabled under `prefers-reduced-motion` |

## Signature geometry

The asymmetric corner `Npx 0 Npx 0` (top-left + bottom-right rounded) is the one element unique to
LOCOL. Radius scale lives in `radius` tokens: card 24 / cardSm 14 / chip 8 / btn 10. The `LH` `tick`
reuses `chipXs` (4) so the flair stays in-family.
