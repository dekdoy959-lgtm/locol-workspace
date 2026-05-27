import { colors } from '../../styles/tokens';

interface LPriProps {
  level?: 'hi' | 'med' | 'low';
}

const map = {
  hi: colors.green,
  med: colors.dimSoft,
  low: colors.lineHi,
} as const;

export function LPri({ level = 'med' }: LPriProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        background: map[level],
        borderRadius: 99,
        flexShrink: 0,
      }}
    />
  );
}
