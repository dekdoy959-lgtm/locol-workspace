import type { CSSProperties, ReactNode } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface LPageProps {
  children: ReactNode;
  /** Max-width on desktop (default 1400). Mobile is always full width. */
  maxWidth?: number;
  /** Override desktop padding */
  padding?: string;
  /** Extra style props (merged) */
  style?: CSSProperties;
}

/**
 * LPage — responsive page container.
 * - Desktop: centered, capped at maxWidth, comfortable padding
 * - Mobile: full-width, tighter padding, extra bottom space for nav
 */
export function LPage({ children, maxWidth = 1400, padding, style }: LPageProps) {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : maxWidth,
        margin: '0 auto',
        padding: isMobile ? '14px 14px 24px' : padding ?? '28px 36px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
