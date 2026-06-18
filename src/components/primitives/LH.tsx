import type { CSSProperties, ReactNode } from 'react';
import { colors, fonts, radius as radiusTokens } from '../../styles/tokens';

interface LHProps {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5;
  sub?: ReactNode;
  accent?: boolean;
  color?: string;
  /** Show a small signature-corner accent block before the heading (hero flair). */
  tick?: boolean;
  style?: CSSProperties;
}

const sizes = { 1: 56, 2: 36, 3: 26, 4: 20, 5: 16 } as const;
const lh = { 1: 1.0, 2: 1.05, 3: 1.1, 4: 1.2, 5: 1.25 } as const;
// Big headings get tight tracking for presence; small labels get airy tracking to read.
const tracking = { 1: -1, 2: -1, 3: -0.4, 4: 0, 5: 0.5 } as const;

export function LH({ children, level = 2, sub, accent = true, color, tick = false, style = {} }: LHProps) {
  const headColor = color || (accent ? colors.green : colors.text);
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {tick && (
          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: 6,
              height: level <= 2 ? 28 : 18,
              background: headColor,
              borderRadius: radiusTokens.chipXs,
            }}
          />
        )}
        <div
          style={{
            fontFamily: fonts.heading,
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: sizes[level],
            lineHeight: lh[level],
            letterSpacing: tracking[level],
            color: headColor,
          }}
        >
          {children}
        </div>
      </div>
      {sub && (
        <div
          style={{
            fontWeight: 300,
            fontSize: 13.5,
            color: colors.dimSoft,
            marginTop: 6,
            marginLeft: tick ? 16 : 0,
            maxWidth: 720,
            lineHeight: 1.5,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
