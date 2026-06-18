import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../../styles/tokens';

interface LChipProps {
  children: ReactNode;
  ink?: string;
  bg?: string;
  border?: string;
  big?: boolean;
  style?: CSSProperties;
}

export function LChip({
  children,
  ink = colors.text,
  bg = 'transparent',
  border,
  big = false,
  style = {},
}: LChipProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: big ? '4px 12px' : '2px 9px',
        fontWeight: 500,
        fontSize: big ? 13 : 11,
        letterSpacing: 0.2,
        color: ink,
        background: bg,
        border: `1px solid ${border || ink}`,
        borderRadius: '8px 2px 8px 2px',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
