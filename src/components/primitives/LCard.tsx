import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../../styles/tokens';

interface LCardProps {
  children: ReactNode;
  padding?: number;
  style?: CSSProperties;
  bg?: string;
  border?: string;
  radius?: number;
  /** Opt-in quiet hover lift + green ring (for clickable cards). Adds the .l-lift class. */
  interactive?: boolean;
  /** Sit one rung up the elevation ladder (selected / highlighted cards). */
  raised?: boolean;
  className?: string;
  onClick?: () => void;
}

export function LCard({
  children,
  padding = 18,
  style = {},
  bg,
  border = colors.line,
  radius = 24,
  interactive = false,
  raised = false,
  className,
  onClick,
}: LCardProps) {
  const surface = bg ?? (raised ? colors.bgRaise : colors.bgCard);
  const cls = [interactive && 'l-lift', className].filter(Boolean).join(' ') || undefined;
  // DS signature corner: round TL + BR, small off-corner (~20%) echoing the logo mark.
  const off = Math.max(3, Math.round(radius * 0.2));
  return (
    <div
      onClick={onClick}
      className={cls}
      style={{
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: `${radius}px ${off}px ${radius}px ${off}px`,
        padding,
        position: 'relative',
        cursor: interactive || onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
