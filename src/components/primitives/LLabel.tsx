import type { ReactNode } from 'react';
import { colors } from '../../styles/tokens';

interface LLabelProps {
  children: ReactNode;
  required?: boolean;
  /** Associate the label with an input's id for screen-reader support. */
  htmlFor?: string;
}

export function LLabel({ children, required, htmlFor }: LLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
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
      {required && <span style={{ color: colors.danger, marginLeft: 4 }}>*</span>}
    </label>
  );
}
