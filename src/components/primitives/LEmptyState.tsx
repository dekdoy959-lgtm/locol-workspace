import type { ReactNode } from 'react';
import { colors } from '../../styles/tokens';

type Art = 'sprout' | 'box' | 'calendar' | 'people';

/** On-brand line-art illustrations (low-carbon / growth motif). 96×96 viewBox. */
function Illustration({ art }: { art: Art }) {
  const st = {
    stroke: colors.greenDk,
    strokeWidth: 2,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const soft = { ...st, stroke: colors.line };
  return (
    <svg width={84} height={84} viewBox="0 0 96 96" aria-hidden="true">
      {/* ground line — shared */}
      <line x1="20" y1="76" x2="76" y2="76" {...soft} />
      {art === 'sprout' && (
        <>
          <path d="M48,76 V46" {...st} />
          <path d="M48,52 C40,52 33,46 33,38 C42,38 48,44 48,52 Z" {...{ ...st, fill: colors.greenBg }} />
          <path d="M48,46 C56,46 63,40 63,32 C54,32 48,38 48,46 Z" {...{ ...st, fill: colors.greenBg }} />
          <circle cx="48" cy="30" r="3" {...{ ...st, fill: colors.greenBg }} />
        </>
      )}
      {art === 'box' && (
        <>
          <path d="M28,44 L48,52 L68,44 L48,36 Z" {...st} />
          <path d="M28,44 V64 L48,72 V52" {...st} />
          <path d="M68,44 V64 L48,72" {...st} />
        </>
      )}
      {art === 'calendar' && (
        <>
          <rect x="28" y="34" width="40" height="38" rx="4" {...st} />
          <line x1="28" y1="46" x2="68" y2="46" {...st} />
          <line x1="38" y1="28" x2="38" y2="38" {...st} />
          <line x1="58" y1="28" x2="58" y2="38" {...st} />
        </>
      )}
      {art === 'people' && (
        <>
          <circle cx="40" cy="42" r="8" {...st} />
          <path d="M26,70 C26,58 54,58 54,70" {...st} />
          <circle cx="60" cy="46" r="6" {...soft} />
          <path d="M52,70 C52,61 72,61 72,70" {...soft} />
        </>
      )}
    </svg>
  );
}

export function LEmptyState({
  art = 'box',
  title,
  sub,
  action,
}: {
  art?: Art;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '36px 24px',
        gap: 4,
      }}
    >
      <Illustration art={art} />
      <div style={{ fontSize: 14, fontWeight: 600, color: colors.surface, marginTop: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: colors.dim, maxWidth: 320, lineHeight: 1.5 }}>{sub}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
