import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LChrome, LBtn, LIcon } from '../primitives';
import { GlobalSearch } from '../search/GlobalSearch';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { colors, layout, z } from '../../styles/tokens';
import { BottomNav } from './BottomNav';
import { InstallPrompt } from './InstallPrompt';
import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';

const navItems = [
  { to: '/briefing', label: 'Briefing' },
  { to: '/inbox', label: 'Inbox' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/discord-inbox', label: 'Discord' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/organizations', label: 'Orgs' },
  { to: '/groups', label: 'Groups' },
  { to: '/relationships', label: 'Network' },
  { to: '/milestones', label: 'Goals' },
  { to: '/settings', label: 'Settings' },
];

export function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useIsMobile();

  // Realtime sync — live updates across tabs/team members
  useRealtimeSync();

  // Global keyboard shortcut: Cmd+K / Ctrl+K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === '/' && document.activeElement === document.body) {
        // Type "/" anywhere (when not in an input) to open
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const initials =
    user?.user_metadata?.full_name
      ?.split(' ')
      .map((s: string) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? 'ME';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bg }}>
      {/* Mobile: slim top bar with brand + search */}
      {isMobile ? (
        <header
          className="safe-top"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: `1px solid ${colors.line}`,
            background: colors.bg,
            position: 'sticky',
            top: 0,
            zIndex: z.header,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <img src="/brand/LOCOL_Logo_White.svg" alt="LOCOL" style={{ height: 16, width: 'auto' }} />
            <span style={{ fontWeight: 600, letterSpacing: 1, fontSize: 11, color: colors.dimSoft }}>
              · Workspace
            </span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              style={{
                width: 36,
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: colors.bgSoft,
                border: `1px solid ${colors.lineHi}`,
                borderRadius: '10px 3px 10px 3px',
                color: colors.dimSoft,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <LIcon kind="search" size={16} color={colors.dimSoft} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/inbox/new')}
              aria-label="Capture"
              style={{
                width: 36,
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: colors.green,
                border: `1px solid ${colors.greenDk}`,
                borderRadius: '10px 3px 10px 3px',
                color: colors.bg,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <LIcon kind="plus" size={16} color={colors.bg} />
            </button>
          </div>
        </header>
      ) : (
        <LChrome
          title="OPPORTUNITY WORKSPACE"
          breadcrumbs={
            <nav style={{ display: 'flex', gap: 4, marginLeft: 14 }}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    padding: '6px 12px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    color: isActive ? colors.green : colors.dimSoft,
                    borderBottom: `2px solid ${isActive ? colors.green : 'transparent'}`,
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          }
          right={
            <>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                title="Search · ⌘K"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: colors.bgSoft,
                  border: `1px solid ${colors.lineHi}`,
                  borderRadius: '10px 3px 10px 3px',
                  padding: '5px 10px 5px 12px',
                  color: colors.dimSoft,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  letterSpacing: 0.2,
                }}
              >
                <LIcon kind="search" size={12} color={colors.dimSoft} />
                <span style={{ color: colors.dim }}>ค้นหา...</span>
                <kbd
                  style={{
                    padding: '1px 5px',
                    background: colors.bg,
                    border: `1px solid ${colors.line}`,
                    borderRadius: 3,
                    color: colors.dimSoft,
                    fontSize: 9.5,
                    fontFamily: "'IBM Plex Mono', monospace",
                    letterSpacing: 0.5,
                    marginLeft: 4,
                  }}
                >
                  ⌘K
                </kbd>
              </button>
              <LBtn primary onClick={() => navigate('/inbox/new')}>
                <LIcon kind="plus" size={12} color={colors.bg} /> CAPTURE
              </LBtn>
              <NotificationBell />
              <UserMenu initials={initials} />
            </>
          }
        />
      )}

      <main
        style={{
          flex: 1,
          position: 'relative',
          // Bottom padding on mobile leaves room for the bottom nav
          paddingBottom: isMobile ? layout.bottomNavHeight : 0,
        }}
      >
        <Outlet />
      </main>

      {isMobile && <BottomNav onSearchOpen={() => setSearchOpen(true)} />}
      {isMobile && <InstallPrompt />}

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
