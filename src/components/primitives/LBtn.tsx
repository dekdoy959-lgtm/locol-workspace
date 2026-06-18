import type { CSSProperties, ReactNode } from 'react';
import { colors, fonts } from '../../styles/tokens';

interface LBtnProps {
  children: ReactNode;
  primary?: boolean;
  ghost?: boolean;
  small?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function LBtn({
  children,
  primary = false,
  ghost = false,
  small = false,
  style = {},
  onClick,
  type = 'button',
  disabled = false,
}: LBtnProps) {
  const base: CSSProperties = {
    fontWeight: 600,
    fontSize: small ? 12 : 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    padding: small ? '5px 12px' : '8px 16px',
    borderRadius: '10px 3px 10px 3px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fonts.heading,
    opacity: disabled ? 0.5 : 1,
    transition: 'all 150ms ease-out',
  };

  const variant: CSSProperties = primary
    ? { background: colors.green, color: colors.bg, border: `1px solid ${colors.green}` }
    : ghost
      ? { background: 'transparent', color: colors.dimSoft, border: `1px solid ${colors.lineHi}` }
      : { background: 'transparent', color: colors.text, border: `1px solid ${colors.lineHi}` };

  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variant, ...style }}>
      {children}
    </button>
  );
}
