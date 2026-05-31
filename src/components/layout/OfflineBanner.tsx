import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { colors, layout, z } from '../../styles/tokens';

/**
 * OfflineBanner — slim sticky bar when navigator.onLine === false.
 * Auto-hides + shows "back online" toast for 2s when reconnected.
 */
export function OfflineBanner() {
  const isMobile = useIsMobile();
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      setShowReconnected(true);
      // Reset the hide timer instead of stacking a new one each time 'online'
      // fires (flapping connections would otherwise pile up timeouts — the
      // returned cleanup from an event handler is ignored, so it never ran).
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(() => setShowReconnected(false), 2000);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  if (online && !showReconnected) return null;

  // Position above bottom nav on mobile, top on desktop
  const positionStyle: React.CSSProperties = isMobile
    ? { bottom: layout.bottomNavHeight + 8, left: 8, right: 8 }
    : { top: 8, left: '50%', transform: 'translateX(-50%)', maxWidth: 360 };

  const bg = online ? '#19250a' : '#241a06';
  const fg = online ? colors.green : '#E8B923';
  const border = online ? colors.greenDk : '#5a3f10';
  const message = online ? '✓ กลับมา online แล้ว' : '⚠ Offline · ใช้ข้อมูลที่ cache ไว้';

  return (
    <div
      className="safe-bottom"
      style={{
        position: 'fixed',
        ...positionStyle,
        zIndex: z.banner,
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        borderRadius: '10px 0 10px 0',
        padding: '8px 14px',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.5,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        textAlign: 'center',
        animation: 'l-fade-in 200ms ease-out',
      }}
    >
      {message}
    </div>
  );
}
