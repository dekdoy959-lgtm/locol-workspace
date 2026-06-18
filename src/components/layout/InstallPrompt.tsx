import { useEffect, useState } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { colors, layout } from '../../styles/tokens';
import { LIcon } from '../primitives/LIcon';

// BeforeInstallPromptEvent isn't in the TS lib; declare a minimal shape
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'locol-install-dismissed-at';
const SUPPRESS_DAYS = 14;

/**
 * Install prompt — shows a slim banner above the bottom nav when:
 * - On mobile
 * - Browser fires `beforeinstallprompt` (Chrome/Android, Edge desktop)
 * - User hasn't dismissed recently
 * For iOS Safari, no programmatic install — show manual instructions instead.
 */
export function InstallPrompt() {
  const isMobile = useIsMobile();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile) return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < SUPPRESS_DAYS) return;
    }

    // Already installed? Don't show.
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) return;

    // iOS Safari path — no event; show manual after delay
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !('MSStream' in window);
    if (isIOS) {
      const t = setTimeout(() => {
        setShowIOSInstructions(true);
        setVisible(true);
      }, 8000);
      return () => clearTimeout(t);
    }

    // Modern path — wait for prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isMobile]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setDeferredPrompt(null);
    setShowIOSInstructions(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  return (
    <div
      className="safe-bottom"
      style={{
        position: 'fixed',
        bottom: layout.bottomNavHeight,
        left: 8,
        right: 8,
        background: colors.bgCard,
        border: `1px solid ${colors.greenDk}`,
        borderRadius: '12px 3px 12px 3px',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 99,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.5)',
        animation: 'l-slide-up 250ms ease-out',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          background: colors.green,
          borderRadius: '8px 2px 8px 2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16, color: colors.bg, letterSpacing: 0 }}>L</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: colors.text, fontWeight: 600, lineHeight: 1.3 }}>
          {showIOSInstructions ? 'ติดตั้ง LOCOL ลง Home Screen' : 'ติดตั้ง LOCOL Workspace'}
        </div>
        <div style={{ fontSize: 10.5, color: colors.dimSoft, marginTop: 2, lineHeight: 1.3 }}>
          {showIOSInstructions
            ? 'กด Share → Add to Home Screen'
            : 'ใช้ offline · เปิดเร็ว · เหมือน app'}
        </div>
      </div>

      {!showIOSInstructions && (
        <button
          type="button"
          onClick={install}
          style={{
            padding: '7px 12px',
            background: colors.green,
            color: colors.bg,
            border: 'none',
            borderRadius: '8px 2px 8px 2px',
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          Install
        </button>
      )}

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          width: 28,
          height: 28,
          padding: 0,
          background: 'transparent',
          color: colors.dim,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <LIcon kind="close" size={16} color={colors.dim} />
      </button>
    </div>
  );
}
