import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LAvatar, LIcon } from '../primitives';
import { colors, z } from '../../styles/tokens';

interface UserMenuProps {
  initials: string;
}

export function UserMenu({ initials }: UserMenuProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/login');
  };

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null;
  const email = user?.email ?? '';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Profile menu"
        aria-label="Open profile menu"
        aria-expanded={open}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          display: 'inline-flex',
        }}
      >
        <LAvatar initials={initials} ring />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            minWidth: 240,
            background: colors.bgOverlay,
            border: `1px solid ${colors.lineHi}`,
            borderRadius: '12px 3px 12px 3px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
            zIndex: z.dropdown,
            overflow: 'hidden',
            animation: 'l-fade-in 120ms ease-out',
          }}
        >
          {/* User info header */}
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.line}` }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: fullName ? 6 : 0,
              }}
            >
              <LAvatar initials={initials} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {fullName && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.text,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fullName}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    color: colors.dimSoft,
                    marginTop: fullName ? 2 : 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {email}
                </div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <MenuItem icon="users" label="ทีม · Team management" onClick={() => go('/team')} />
          <MenuItem icon="settings" label="ตั้งค่า · Settings" onClick={() => go('/settings')} />
          <MenuItem
            icon="user"
            label="My alerts preferences"
            sub="Email notification toggles"
            onClick={() => go('/settings#alerts')}
          />
          <div style={{ height: 1, background: colors.line, margin: '4px 0' }} />
          <MenuItem
            icon="palette"
            label={theme === 'dark' ? 'ธีม · สลับเป็นสว่าง (Light)' : 'ธีม · สลับเป็นมืด (Dark)'}
            sub={theme === 'dark' ? 'ตอนนี้: มืด (Dark)' : 'ตอนนี้: สว่าง (Light)'}
            onClick={toggle}
          />
          <div style={{ height: 1, background: colors.line, margin: '4px 0' }} />
          <MenuItem
            icon="close"
            label="Sign out"
            danger
            onClick={handleSignOut}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  sub,
  onClick,
  danger = false,
}: {
  icon: 'settings' | 'user' | 'users' | 'close' | 'palette';
  label: string;
  sub?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        width: '100%',
        background: 'transparent',
        border: 'none',
        color: danger ? colors.danger : colors.text,
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        transition: 'background 100ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? colors.dangerBg : colors.bgSoft;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <LIcon kind={icon} size={14} color={danger ? colors.danger : colors.dimSoft} />
      <div style={{ flex: 1 }}>
        <div>{label}</div>
        {sub && (
          <div
            style={{
              fontSize: 10.5,
              color: colors.dim,
              marginTop: 1,
              fontWeight: 400,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </button>
  );
}
