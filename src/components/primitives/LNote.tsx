import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../../styles/tokens';

interface LNoteProps {
  children: ReactNode;
  accent?: boolean;
  style?: CSSProperties;
}

export function LNote({ children, accent = false, style = {} }: LNoteProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '5px 11px',
        borderRadius: '10px 3px 10px 3px',
        background: accent ? colors.green : 'transparent',
        color: accent ? colors.bg : colors.dimSoft,
        border: `1px solid ${accent ? colors.green : colors.lineHi}`,
        fontWeight: 500,
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
