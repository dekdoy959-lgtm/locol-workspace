import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../../styles/tokens';

interface LFieldProps {
  label: string;
  value?: ReactNode;
  w?: string | number;
  style?: CSSProperties;
}

export function LField({ label, value, w = '100%', style = {} }: LFieldProps) {
  return (
    <div style={{ marginBottom: 12, width: w, ...style }}>
      <div
        style={{
          fontWeight: 500,
          fontSize: 10,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: colors.dim,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontWeight: 400,
          fontSize: 14,
          color: colors.text,
          lineHeight: 1.3,
          minHeight: 16,
        }}
      >
        {value ?? <span style={{ color: colors.dim }}>—</span>}
      </div>
    </div>
  );
}
