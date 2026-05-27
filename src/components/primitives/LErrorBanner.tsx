import type { ReactNode } from 'react';
import { LIcon } from './LIcon';

interface LErrorBannerProps {
  children: ReactNode;
  onRetry?: () => void;
  variant?: 'error' | 'warning';
}

export function LErrorBanner({ children, onRetry, variant = 'error' }: LErrorBannerProps) {
  const color = variant === 'warning' ? '#E8B923' : '#d96a66';
  const bg = variant === 'warning' ? '#241a06' : '#241010';
  const border = variant === 'warning' ? '#5a3f10' : '#5a1a18';

  return (
    <div
      style={{
        padding: '12px 14px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '10px 0 10px 0',
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
            borderRadius: '6px 0 6px 0',
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
