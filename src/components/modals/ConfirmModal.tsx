import type { ReactNode } from 'react';
import { LCard, LBtn } from '../primitives';
import { colors } from '../../styles/tokens';

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
        zIndex: 200,
        padding: 24,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, width: '100%' }}>
        <LCard padding={28}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: -0.3,
              color: danger ? '#d96a66' : colors.text,
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
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              style={{
                padding: '7px 18px',
                borderRadius: '8px 0 8px 0',
                border: `1px solid ${danger ? '#5a1a18' : colors.greenDk}`,
                background: danger ? '#3a1010' : '#19250a',
                color: danger ? '#d96a66' : colors.green,
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
