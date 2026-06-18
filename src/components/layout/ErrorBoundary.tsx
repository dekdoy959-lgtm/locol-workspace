import { Component, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { colors } from '../../styles/tokens';

interface Props {
  children: ReactNode;
  /** When this changes, a caught error is cleared (e.g. pass the route path). */
  resetKey?: string;
}
interface State {
  error: Error | null;
}

/**
 * Catches render errors anywhere in the tree so a single page crash shows a
 * recoverable card instead of blanking the whole app to a black screen.
 * Resets automatically when `resetKey` changes (we feed it the route path), so
 * navigating away clears the error without a manual reload.
 */
class ErrorBoundaryInner extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surface the real error in the console for diagnosis.
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            maxWidth: 520,
            width: '100%',
            background: colors.bgCard,
            border: `1px solid ${colors.lineHi}`,
            borderRadius: '16px 4px 16px 4px',
            padding: 28,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: colors.danger,
              marginBottom: 10,
            }}
          >
            ⚠ เกิดข้อผิดพลาดในหน้านี้
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 8 }}>
            หน้านี้แสดงผลไม่สำเร็จ
          </div>
          <div style={{ fontSize: 13, color: colors.dimSoft, marginBottom: 18, lineHeight: 1.55 }}>
            ลองกดใหม่อีกครั้ง หรือกลับไปหน้า Inbox · ถ้ายังเจออยู่ แจ้งทีมพร้อมข้อความด้านล่างได้เลย
          </div>
          <pre
            style={{
              fontSize: 11,
              color: colors.dim,
              background: colors.bg,
              border: `1px solid ${colors.line}`,
              borderRadius: '8px 2px 8px 2px',
              padding: 10,
              marginBottom: 18,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 120,
              overflow: 'auto',
            }}
          >
            {error.message}
          </pre>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              style={{
                fontFamily: 'inherit',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                padding: '8px 16px',
                borderRadius: '10px 3px 10px 3px',
                background: colors.green,
                color: colors.bg,
                border: `1px solid ${colors.green}`,
                cursor: 'pointer',
              }}
            >
              ลองใหม่
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/inbox';
              }}
              style={{
                fontFamily: 'inherit',
                fontWeight: 600,
                fontSize: 13,
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
              กลับ Inbox
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/** Wraps the class boundary and feeds it the current route path as the reset key. */
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <ErrorBoundaryInner resetKey={location.pathname}>{children}</ErrorBoundaryInner>;
}
