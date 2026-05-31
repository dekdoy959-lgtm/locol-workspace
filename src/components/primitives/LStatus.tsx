import { colors } from '../../styles/tokens';
import { LChip } from './LChip';

interface LStatusProps {
  status: string;
}

const map: Record<string, { ink: string; bg: string; border: string }> = {
  New:      { ink: colors.text,    bg: colors.bgCard, border: colors.lineHi },
  Triage:   { ink: colors.warn,      bg: colors.warnBg,     border: colors.warnDk },
  Assigned: { ink: colors.surface, bg: colors.bgCard, border: colors.lineHi },
  Pursuing: { ink: colors.green,   bg: colors.greenBg,     border: colors.greenDk },
  Decision: { ink: colors.bg,      bg: colors.green,  border: colors.green },
  Won:      { ink: colors.green,   bg: colors.greenBg,     border: colors.greenDk },
  Lost:     { ink: colors.danger,      bg: colors.dangerBg,     border: colors.dangerDk },
  Archived: { ink: colors.dim,     bg: colors.bgSoft, border: colors.line },
  Stale:    { ink: colors.danger,      bg: colors.dangerBg,     border: colors.dangerDk },
};

export function LStatus({ status }: LStatusProps) {
  const m = map[status] || map.New;
  return <LChip ink={m.ink} bg={m.bg} border={m.border}>{status}</LChip>;
}
