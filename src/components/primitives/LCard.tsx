import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../../styles/tokens';

interface LCardProps {
  children: ReactNode;
  padding?: number;
  style?: CSSProperties;
  bg?: string;
  border?: string;
  radius?: number;
  onClick?: () => void;
}

export function LCard({
  children,
  padding = 18,
  style = {},
  bg = colors.bgCard,
  border = colors.line,
  radius = 24,
  onClick,
}: LCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: `${radius}px 0 ${radius}px 0`,
        padding,
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
