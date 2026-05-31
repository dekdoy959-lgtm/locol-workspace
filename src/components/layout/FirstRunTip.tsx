import { useState, type ReactNode } from 'react';
import { colors } from '../../styles/tokens';
import { LIcon } from '../primitives';

/**
 * First-run onboarding tip (#14). Shows once per `id` (persisted in
 * localStorage), then can be dismissed. A lightweight alternative to a full
 * coachmark tour — explains a surface the first time the user lands on it.
 */
export function FirstRunTip({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const key = `locol_tip_${id}`;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* private window — fine, it just shows again */
    }
    setDismissed(true);
  };

  return (
    <div
      className="l-rise"
      style={{
        position: 'relative',
        marginBottom: 16,
        padding: '14px 40px 14px 16px',
        background: `linear-gradient(135deg, ${colors.greenBg}, transparent 70%)`,
        border: `1px solid ${colors.greenDk}`,
        borderRadius: '14px 0 14px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <LIcon kind="target" size={14} color={colors.green} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.green, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: colors.surface, lineHeight: 1.6 }}>{children}</div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="ปิด"
        title="เข้าใจแล้ว"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          display: 'inline-flex',
        }}
      >
        <LIcon kind="close" size={14} color={colors.dimSoft} />
      </button>
    </div>
  );
}
