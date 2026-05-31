import { useRef, useState } from 'react';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import { LIcon } from '../primitives';
import { colors } from '../../styles/tokens';

interface AvatarUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  initials: string;
  contactId?: string;
}

export function AvatarUpload({ value, onChange, initials, contactId }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useAvatarUpload();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLocalError('ไฟล์ใหญ่เกิน 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setLocalError('ต้องเป็นไฟล์รูปภาพ (JPG, PNG, WebP)');
      return;
    }

    const result = await upload(file, contactId);
    if (result) {
      onChange(result.url);
    }
    if (e.target) e.target.value = '';
  };

  const handleRemove = () => {
    onChange(null);
  };

  const displayError = localError || error;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 96,
            height: 96,
            background: colors.bgRaise,
            border: `1px solid ${colors.lineHi}`,
            borderRadius: '16px 0 16px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {value ? (
            <img
              src={value}
              alt="avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                fontWeight: 600,
                fontSize: 32,
                color: colors.surface,
                letterSpacing: 1,
              }}
            >
              {initials}
            </span>
          )}
          {uploading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.green,
                fontSize: 11,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              UPLOADING…
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.lineHi}`,
              color: colors.text,
              padding: '7px 14px',
              borderRadius: '10px 0 10px 0',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
              cursor: uploading ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <LIcon kind="plus" size={11} color={colors.text} />
            {value ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
          </button>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.danger,
                padding: '4px 0',
                fontFamily: 'inherit',
                fontSize: 11,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              ลบรูป
            </button>
          )}
          <div style={{ fontSize: 11, color: colors.dim, letterSpacing: 0.3 }}>
            JPG · PNG · WebP · ≤ 5MB
          </div>
        </div>
      </div>

      {displayError && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 10px',
            background: colors.dangerBg,
            border: '1px solid #5a1a18',
            borderRadius: '6px 0 6px 0',
            color: colors.danger,
            fontSize: 12,
          }}
        >
          {displayError}
        </div>
      )}
    </div>
  );
}
