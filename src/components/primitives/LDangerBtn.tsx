import type { ReactNode } from 'react';
import { LIcon } from './LIcon';

interface LDangerBtnProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
}

export function LDangerBtn({ children, onClick, disabled, small }: LDangerBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        color: '#d96a66',
        border: '1px solid #5a1a18',
        padding: small ? '5px 12px' : '8px 16px',
        borderRadius: '10px 0 10px 0',
        fontFamily: 'inherit',
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <LIcon kind="warn" size={11} color="#d96a66" /> {children}
    </button>
  );
}
