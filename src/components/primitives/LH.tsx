import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../../styles/tokens';

interface LHProps {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5;
  sub?: ReactNode;
  accent?: boolean;
  color?: string;
  style?: CSSProperties;
}

const sizes = { 1: 56, 2: 36, 3: 26, 4: 20, 5: 16 } as const;
const lh = { 1: 1.0, 2: 1.05, 3: 1.1, 4: 1.2, 5: 1.25 } as const;

export function LH({ children, level = 2, sub, accent = true, color, style = {} }: LHProps) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <div
        style={{
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: sizes[level],
          lineHeight: lh[level],
          letterSpacing: level <= 2 ? -0.5 : 0.5,
          color: color || (accent ? colors.green : colors.text),
        }}
      >
        {children}
      </div>
      {sub && (
        <div
          style={{
            fontWeight: 300,
            fontSize: 13,
            color: colors.dimSoft,
            marginTop: 6,
            maxWidth: 720,
            lineHeight: 1.45,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
