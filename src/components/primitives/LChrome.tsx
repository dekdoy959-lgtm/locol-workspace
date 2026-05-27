import type { ReactNode } from 'react';
import { colors } from '../../styles/tokens';
import { MiniL } from './Decorations';

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
          <MiniL size={16} color={colors.green} />
          <span
            style={{
              fontWeight: 700,
              letterSpacing: 2.5,
              fontSize: 13,
              color: colors.text,
            }}
          >
            LOCOL · OPS
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
