# RECONCILIATION — resolving conflicts

> Where a guideline, skill rule, or default conflicted with this project's reality, and how it was
> resolved. Keeps decisions from being re-litigated.

## interface-design skill vs. established brand identity

| Skill says | LOCOL reality | Resolution |
|---|---|---|
| Reserve UPPERCASE for eyebrows/labels; all-caps "shouts" | Uppercase is the existing stamped/agri-industrial signature, paired with the asymmetric corner | **Keep uppercase** on headings/buttons/short labels; never on body copy. Improve readability via contrast + spacing + line-height instead. (ADR-002) |
| Dark mode: lean on borders, shadows barely read | App already dark; flat single surface | Adopted as-is → elevation by surface lightness + borders; shadow only for the hover cue. (ADR-001) |
| Borders: low-opacity rgba whispers | Borders were solid hex | Adopted → rgba scale. Verified no hex-alpha concat would break. (ADR-003) |
| One accent color, used with intention | Brand green `#99CE24` already the sole accent; semantic tokens (danger/warn/olive) exist for status | No change — already compliant. Semantic colors are meaning, not decoration. |

## No content/data conflicts

This was a presentation-layer (CSS/tokens/primitives) pass. No business data, formulas, or copy were
changed, so there were no content reconciliations. Future content work that touches numbers should
record drift here.
