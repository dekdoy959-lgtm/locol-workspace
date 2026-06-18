import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LCard, LH, LBtn, LFrame } from '../components/primitives';
import { colors } from '../styles/tokens';

export function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      setLoading(false);
    }
  };

  return (
    <LFrame>
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <LCard padding={44} style={{ maxWidth: 480, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <img src="/brand/LOCOL_Logo_White.svg" alt="LOCOL" style={{ height: 28, width: 'auto' }} />
            <span style={{ fontWeight: 600, letterSpacing: 1, fontSize: 13, color: colors.dimSoft }}>
              · Workspace
            </span>
          </div>

          <LH level={2}>เข้าสู่ระบบ</LH>

          <p
            style={{
              fontSize: 14,
              color: colors.dimSoft,
              lineHeight: 1.55,
              marginTop: -4,
              marginBottom: 28,
            }}
          >
            Internal Opportunity + People Workspace · สำหรับทีม LOCOL เท่านั้น
          </p>

          <LBtn primary onClick={handleSignIn} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบด้วย Google'}
          </LBtn>

          {error && (
            <div
              style={{
                marginTop: 18,
                padding: 12,
                background: colors.dangerBg,
                border: `1px solid ${colors.dangerDk}`,
                borderRadius: '10px 3px 10px 3px',
                color: colors.danger,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${colors.line}` }}>
            <p
              style={{
                fontSize: 11.5,
                color: colors.dim,
                marginTop: 10,
                lineHeight: 1.5,
                letterSpacing: 0.2,
              }}
            >
              Two layers · One shell · Owner + Reviewer rule · Bi-weekly review · ไม่มีโอกาสไหนหล่นหาย
              ไม่มีใครต้องเย็นชา
            </p>
          </div>
        </LCard>
      </div>
    </LFrame>
  );
}
