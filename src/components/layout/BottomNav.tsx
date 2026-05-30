import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { colors, layout } from '../../styles/tokens';
import { LIcon } from '../primitives/LIcon';
import type { IconKind } from '../primitives/LIcon';
import { useAuth } from '../../contexts/AuthContext';

interface NavTab {
  to: string;
  label: string;
  icon: IconKind;
}

// 4 primary tabs + More (5 total slots)
const PRIMARY_TABS: NavTab[] = [
  { to: '/briefing', label: 'Briefing', icon: 'home' },
  { to: '/inbox', label: 'Inbox', icon: 'inbox' },
  { to: '/calendar', label: 'Calendar', icon: 'cal' },
  { to: '/contacts', label: 'Contacts', icon: 'user' },
];

const MORE_ITEMS: NavTab[] = [
  { to: '/discord-inbox', label: 'Discord Inbox', icon: 'inbox' },
  { to: '/milestones', label: 'Goals', icon: 'target' },
  { to: '/organizations', label: 'Organizations', icon: 'building' },
  { to: '/groups', label: 'Groups', icon: 'folder' },
  { to: '/relationships', label: 'Network', icon: 'graph' },
  { to: '/team', label: 'Team', icon: 'users' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

interface BottomNavProps {
  onSearchOpen: () => void;
}

export function BottomNav({ onSearchOpen }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Close drawer when navigating
  useEffect(() => {
    const handler = () => setMoreOpen(false);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const handleSignOut = async () => {
    setMoreOpen(false);
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* The bottom tab bar */}
      <nav
        className="safe-bottom"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: layout.bottomNavHeight,
          background: colors.bg,
          borderTop: `1px solid ${colors.line}`,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-around',
          zIndex: 100,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {PRIMARY_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              color: isActive ? colors.green : colors.dimSoft,
              borderTop: `2px solid ${isActive ? colors.green : 'transparent'}`,
              padding: '6px 0 4px',
              textDecoration: 'none',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            })}
          >
            {({ isActive }) => (
              <>
                <LIcon kind={tab.icon} size={20} color={isActive ? colors.green : colors.dimSoft} />
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* MORE button — opens drawer */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            color: moreOpen ? colors.green : colors.dimSoft,
            borderTop: `2px solid ${moreOpen ? colors.green : 'transparent'}`,
            padding: '6px 0 4px',
            background: 'transparent',
            border: 'none',
            borderTopWidth: 2,
            borderTopStyle: 'solid',
            borderTopColor: moreOpen ? colors.green : 'transparent',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            fontFamily: 'inherit',
          }}
        >
          <LIcon kind="menu" size={20} color={moreOpen ? colors.green : colors.dimSoft} />
          <span>More</span>
        </button>
      </nav>

      {/* MORE drawer (slides up from bottom) */}
      {moreOpen && (
        <>
          {/* backdrop */}
          <div
            onClick={() => setMoreOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 200,
              animation: 'l-fade-in 150ms ease-out',
            }}
          />
          {/* sheet */}
          <div
            className="safe-bottom"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: colors.bgCard,
              borderTop: `1px solid ${colors.lineHi}`,
              borderRadius: '20px 0 0 0',
              zIndex: 201,
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '8px 0 16px',
              animation: 'l-slide-up 200ms ease-out',
            }}
          >
            {/* Grab handle */}
            <div
              style={{
                width: 40,
                height: 4,
                background: colors.line,
                borderRadius: 2,
                margin: '6px auto 14px',
              }}
            />

            {/* Header */}
            <div style={{ padding: '0 20px 12px', borderBottom: `1px solid ${colors.line}` }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, color: colors.dim, fontWeight: 700, textTransform: 'uppercase' }}>
                MORE
              </div>
            </div>

            {/* Items */}
            <div style={{ padding: '4px 0' }}>
              {MORE_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 20px',
                    color: isActive ? colors.green : colors.text,
                    fontSize: 15,
                    fontWeight: 500,
                    textDecoration: 'none',
                    borderLeft: `3px solid ${isActive ? colors.green : 'transparent'}`,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <LIcon kind={item.icon} size={20} color={isActive ? colors.green : colors.dimSoft} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ padding: '8px 20px', borderTop: `1px solid ${colors.line}`, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onSearchOpen();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 0',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <LIcon kind="search" size={20} color={colors.dimSoft} />
                <span>Search</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  navigate('/inbox/new');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 0',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: colors.green,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <LIcon kind="plus" size={20} color={colors.green} />
                <span>Capture Opportunity</span>
              </button>
            </div>

            {/* User + sign out */}
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.line}`, marginTop: 4 }}>
              <div style={{ fontSize: 11, color: colors.dim, marginBottom: 4, letterSpacing: 0.5 }}>
                Signed in as
              </div>
              <div style={{ fontSize: 13, color: colors.text, fontWeight: 600, marginBottom: 12, wordBreak: 'break-all' }}>
                {user?.email}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: `1px solid ${colors.lineHi}`,
                  borderRadius: '10px 0 10px 0',
                  color: colors.dimSoft,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes l-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes l-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
