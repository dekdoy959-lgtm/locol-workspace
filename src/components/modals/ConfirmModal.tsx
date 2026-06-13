import { useEffect, useRef, type ReactNode } from 'react';
import { LCard, LBtn } from '../primitives';
import { colors, z } from '../../styles/tokens';

interface ConfirmModalProps {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  isLoading?: boolean;
}

export function ConfirmModal({
  title,
  body,
  confirmLabel = 'ยืนยัน',
  onConfirm,
  onCancel,
  danger = false,
  isLoading = false,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  // Latest onCancel without re-running the focus effect on every render.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  // a11y (#24): focus the dialog on open, trap Tab within it, close on Escape,
  // and return focus to the previously-focused element on close.
  useEffect(() => {
    const prevFocused = document.activeElement as HTMLElement | null;
    confirmBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelRef.current();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prevFocused?.focus?.();
    };
  }, []);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: z.modalBackdrop,
        padding: 24,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 400, width: '100%' }}
      >
        <LCard padding={28} bg={colors.bgOverlay}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: -0.3,
              color: danger ? colors.danger : colors.text,
              marginBottom: 10,
            }}
          >
            {title}
          </div>
          <p style={{ margin: '0 0 22px', fontSize: 13.5, color: colors.surface, lineHeight: 1.6 }}>
            {body}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <LBtn ghost onClick={onCancel} disabled={isLoading}>
              ยกเลิก
            </LBtn>
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              style={{
                padding: '7px 18px',
                borderRadius: '8px 0 8px 0',
                border: `1px solid ${danger ? colors.dangerDk : colors.greenDk}`,
                background: danger ? '#3a1010' : colors.greenBg,
                color: danger ? colors.danger : colors.green,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                letterSpacing: 0.5,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? '…' : confirmLabel}
            </button>
          </div>
        </LCard>
      </div>
    </div>
  );
}
