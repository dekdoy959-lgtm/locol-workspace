import { colors } from '../../styles/tokens';
import { LChip } from './LChip';

interface LStatusProps {
  status: string;
}

const map: Record<string, { ink: string; bg: string; border: string }> = {
  New:      { ink: colors.text,    bg: colors.bgCard, border: colors.lineHi },
  Triage:   { ink: '#E8B923',      bg: '#241a06',     border: '#5a3f10' },
  Assigned: { ink: colors.surface, bg: colors.bgCard, border: colors.lineHi },
  Pursuing: { ink: colors.green,   bg: '#19250a',     border: colors.greenDk },
  Decision: { ink: colors.bg,      bg: colors.green,  border: colors.green },
  Won:      { ink: colors.green,   bg: '#19250a',     border: colors.greenDk },
  Lost:     { ink: '#d96a66',      bg: '#241010',     border: '#5a1a18' },
  Archived: { ink: colors.dim,     bg: colors.bgSoft, border: colors.line },
  Stale:    { ink: '#d96a66',      bg: '#241010',     border: '#5a1a18' },
};

export function LStatus({ status }: LStatusProps) {
  const m = map[status] || map.New;
  return <LChip ink={m.ink} bg={m.bg} border={m.border}>{status}</LChip>;
}
