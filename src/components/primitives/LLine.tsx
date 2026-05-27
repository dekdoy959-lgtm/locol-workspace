import type { CSSProperties } from 'react';
import { colors } from '../../styles/tokens';

interface LLineProps {
  w?: string | number;
  h?: number;
  style?: CSSProperties;
}

export function LLine({ w = '80%', h = 6, style = {} }: LLineProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: w,
        height: h,
        background: colors.lineHi,
        opacity: 0.7,
        ...style,
      }}
    />
  );
}
