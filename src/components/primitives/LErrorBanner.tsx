import { colors } from '../../styles/tokens';
import type { ReactNode } from 'react';
import { LIcon } from './LIcon';

interface LErrorBannerProps {
  children: ReactNode;
  onRetry?: () => void;
  variant?: 'error' | 'warning';
}

export function LErrorBanner({ children, onRetry, variant = 'error' }: LErrorBannerProps) {
  const color = variant === 'warning' ? colors.warn : colors.danger;
  const bg = variant === 'warning' ? colors.warnBg : colors.dangerBg;
  const border = variant === 'warning' ? colors.warnDk : colors.dangerDk;

  return (
    <div
      style={{
        padding: '12px 14px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '10px 3px 10px 3px',
        color,
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
      }}
    >
      <LIcon kind="warn" size={14} color={color} />
      <div style={{ flex: 1, lineHeight: 1.45 }}>{children}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: 'transparent',
            border: `1px solid ${color}`,
            color,
            padding: '4px 10px',
            borderRadius: '6px 2px 6px 2px',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontFamily: 'inherit',
          }}
        >
          ลองใหม่
        </button>
      )}
    </div>
  );
}
