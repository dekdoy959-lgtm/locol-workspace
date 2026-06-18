import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMyTeamMember, memberStatus } from '../../hooks/useTeamMembers';
import { colors } from '../../styles/tokens';

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {children}
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <FullScreen>
      <span style={{ color: colors.dim, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</span>
    </FullScreen>
  );
}

function GateCard({ tone, title, body }: { tone: string; title: string; body: string }) {
  const { signOut } = useAuth();
  return (
    <FullScreen>
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          background: colors.bgCard,
          border: `1px solid ${colors.lineHi}`,
          borderRadius: '16px 4px 16px 4px',
          padding: 28,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: tone, marginBottom: 10 }}>
          LOCOL Workspace
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: colors.text, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, color: colors.dimSoft, lineHeight: 1.6, marginBottom: 20 }}>{body}</div>
        <button
          type="button"
          onClick={() => signOut()}
          style={{
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            padding: '8px 16px',
            borderRadius: '10px 3px 10px 3px',
            background: 'transparent',
            color: colors.dimSoft,
            border: `1px solid ${colors.lineHi}`,
            cursor: 'pointer',
          }}
        >
          ออกจากระบบ
        </button>
      </div>
    </FullScreen>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const { me, isLoading: memberLoading } = useMyTeamMember();

  if (loading) return <Loading label="Loading…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  // Wait for the team_member row before deciding (avoids a flash of the app for
  // pending users). Missing status (pre-migration 0020) resolves to 'active'.
  if (memberLoading) return <Loading label="Checking access…" />;

  const status = memberStatus(me);
  if (status === 'pending') {
    return (
      <GateCard
        tone={colors.warn}
        title="รออนุมัติการเข้าใช้งาน"
        body="เข้าระบบสำเร็จแล้ว แต่ยังรอให้ admin ของ LOCOL อนุมัติสิทธิ์ก่อน · แจ้ง admin ให้อนุมัติในหน้า Team ได้เลย"
      />
    );
  }
  if (status === 'disabled') {
    return (
      <GateCard
        tone={colors.danger}
        title="บัญชีถูกปิดการใช้งาน"
        body="สิทธิ์เข้าใช้งานของบัญชีนี้ถูกปิดโดย admin · ติดต่อ admin หากคิดว่าเป็นความผิดพลาด"
      />
    );
  }

  return <>{children}</>;
}
