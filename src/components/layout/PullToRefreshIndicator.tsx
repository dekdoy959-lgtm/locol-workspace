import { colors } from '../../styles/tokens';

interface Props {
  distance: number;
  refreshing: boolean;
  ready: boolean;
}

/**
 * PullToRefreshIndicator — visual cue at the top during a pull gesture.
 * Render at the top of the page (e.g. fixed) so it appears when pulling.
 */
export function PullToRefreshIndicator({ distance, refreshing, ready }: Props) {
  if (distance === 0 && !refreshing) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: Math.max(distance, refreshing ? 50 : 0),
        zIndex: 80,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 8px',
        background: 'linear-gradient(180deg, rgba(16,16,16,0.95), rgba(16,16,16,0))',
        pointerEvents: 'none',
        transition: refreshing ? 'height 250ms ease-out' : 'none',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: ready || refreshing ? colors.green : colors.dimSoft,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {refreshing ? (
          <>
            <Spinner />
            กำลังโหลด…
          </>
        ) : ready ? (
          '↑ ปล่อยเพื่อโหลดใหม่'
        ) : (
          '↓ ดึงลงเพื่อโหลด'
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'l-spin 800ms linear infinite' }}>
      <circle cx="12" cy="12" r="9" strokeWidth="2" fill="none" strokeDasharray="40 60" style={{ stroke: colors.green }} />
      <style>{`@keyframes l-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
