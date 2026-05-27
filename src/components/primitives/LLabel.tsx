import type { ReactNode } from 'react';
import { colors } from '../../styles/tokens';

interface LLabelProps {
  children: ReactNode;
  required?: boolean;
}

export function LLabel({ children, required }: LLabelProps) {
  return (
    <label
      style={{
        display: 'block',
        fontWeight: 500,
        fontSize: 10,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: colors.dim,
        marginBottom: 6,
      }}
    >
      {children}
      {required && <span style={{ color: '#d96a66', marginLeft: 4 }}>*</span>}
    </label>
  );
}
