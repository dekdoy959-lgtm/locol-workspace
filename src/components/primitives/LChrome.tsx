import type { ReactNode } from 'react';
import { colors } from '../../styles/tokens';
import { BrandLogo } from '../layout/BrandLogo';

interface LChromeProps {
  title: string;
  breadcrumbs?: ReactNode;
  right?: ReactNode;
}

export function LChrome({ title, breadcrumbs, right }: LChromeProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: `1px solid ${colors.line}`,
        background: colors.bg,
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <BrandLogo height={18} />
          <span style={{ fontWeight: 600, letterSpacing: 1, fontSize: 11.5, color: colors.dimSoft }}>
            · Workspace
          </span>
        </span>
        <span style={{ color: colors.dim, fontSize: 13 }}>/</span>
        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: colors.text,
            letterSpacing: 0.3,
          }}
        >
          {title}
        </span>
        {breadcrumbs}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{right}</div>
    </div>
  );
}
