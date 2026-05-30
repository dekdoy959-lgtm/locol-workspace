import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpportunities } from '../../hooks/useOpportunities';
import { useContacts } from '../../hooks/useContacts';
import { useAllMilestones } from '../../hooks/useAllMilestones';
import { useTrackSettings, getStaleThreshold } from '../../hooks/useTrackSettings';
import { useAuth } from '../../contexts/AuthContext';
import { isStale, findTrack, type TrackKey } from '../../types/opportunity';
import { contactDisplayName, contactInitials, type ContactRow } from '../../types/contact';
import { LAvatar, LIcon } from '../primitives';
import { colors } from '../../styles/tokens';
import { todayLocalISO, addDaysISO } from '../../lib/dateUtil';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface Alert {
  id: string;
  kind: 'stale' | 'due' | 'cold' | 'birthday' | 'reminder';
  title: string;
  sub: string;
  href: string;
  meta?: string;
  contact?: ContactRow;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: opps = [] } = useOpportunities();
  const { data: contacts = [] } = useContacts();
  const { data: milestones = [] } = useAllMilestones();
  const { data: trackSettings = [] } = useTrackSettings();

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

  const alerts: Alert[] = useMemo(() => {
    const todayISO = todayLocalISO();
    const sevenDaysISO = addDaysISO(todayISO, 7);
    const list: Alert[] = [];

    // Stale opps owned by me
    for (const o of opps) {
      if (user && o.owner_id !== user.id && o.reviewer_id !== user.id) continue;
      if (isStale(o, getStaleThreshold(trackSettings, o.track as TrackKey))) {
        list.push({
          id: `stale-${o.id}`,
          kind: 'stale',
          title: o.title,
          sub: `Stale · ${findTrack(o.track).name}`,
          href: `/inbox/${o.id}`,
        });
      }
    }

    // Due in 7 days
    for (const o of opps) {
      if (user && o.owner_id !== user.id && o.reviewer_id !== user.id) continue;
      if (o.due_date && o.due_date >= todayISO && o.due_date <= sevenDaysISO) {
        list.push({
          id: `due-${o.id}`,
          kind: 'due',
          title: o.title,
          sub: `Due ${o.due_date} · ${findTrack(o.track).name}`,
          href: `/inbox/${o.id}`,
        });
      }
    }

    // Cold contacts (any ownership for now)
    for (const c of contacts) {
      if (!c.last_contact_date || !c.freq_days) continue;
      const days = (Date.now() - new Date(c.last_contact_date).getTime()) / MS_PER_DAY;
      if (days > c.freq_days) {
        list.push({
          id: `cold-${c.id}`,
          kind: 'cold',
          title: contactDisplayName(c),
          sub: `Cold · ${Math.floor(days)}d ไม่ได้ติดต่อ`,
          href: `/contacts/${c.id}`,
          contact: c,
        });
      }
    }

    // Birthdays in next 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const c of contacts) {
      if (!c.birthday || !c.birthday_notification_enabled) continue;
      const [, mm, dd] = c.birthday.split('-');
      if (!mm || !dd) continue;
      const thisYear = new Date(today.getFullYear(), Number(mm) - 1, Number(dd));
      const nextYear = new Date(today.getFullYear() + 1, Number(mm) - 1, Number(dd));
      const next = thisYear >= today ? thisYear : nextYear;
      const daysUntil = Math.round((next.getTime() - today.getTime()) / MS_PER_DAY);
      if (daysUntil >= 0 && daysUntil <= 7) {
        list.push({
          id: `birthday-${c.id}`,
          kind: 'birthday',
          title: contactDisplayName(c),
          sub: daysUntil === 0 ? '🎂 วันเกิดวันนี้!' : `🎂 ในอีก ${daysUntil} วัน`,
          href: `/contacts/${c.id}`,
          contact: c,
        });
      }
    }

    // Milestones due today
    for (const m of milestones) {
      if (m.date !== todayISO || m.achieved) continue;
      const contact = contacts.find((c) => c.id === m.contact_id);
      if (!contact) continue;
      list.push({
        id: `milestone-${m.id}`,
        kind: 'reminder',
        title: m.title,
        sub: `Milestone · ${contactDisplayName(contact)}`,
        href: `/contacts/${m.contact_id}`,
        contact,
      });
    }

    return list;
  }, [opps, contacts, milestones, trackSettings, user]);

  const count = alerts.length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Notifications${count ? ` (${count})` : ''}`}
        aria-label="Open notifications"
        aria-expanded={open}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LIcon kind="bell" size={16} color={count ? colors.green : colors.dimSoft} />
        {count > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 14,
              height: 14,
              padding: '0 4px',
              background: '#d96a66',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 7,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1.5px solid ${colors.bg}`,
              lineHeight: 1,
            }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 360,
            maxHeight: '70vh',
            background: colors.bgCard,
            border: `1px solid ${colors.lineHi}`,
            borderRadius: '14px 0 14px 0',
            boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'l-fade-in 120ms ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 14px',
              borderBottom: `1px solid ${colors.line}`,
              background: colors.bgSoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.2,
                color: colors.green,
                textTransform: 'uppercase',
              }}
            >
              Notifications · {count}
            </span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/inbox/summary');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.dimSoft,
                fontSize: 10.5,
                letterSpacing: 0.4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                fontWeight: 600,
                padding: 0,
              }}
            >
              View all →
            </button>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {count === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: colors.dim,
                  fontSize: 12.5,
                }}
              >
                🎉 ไม่มีอะไรต้องแจ้งเตือนตอนนี้
              </div>
            ) : (
              alerts.slice(0, 30).map((a) => (
                <AlertRow
                  key={a.id}
                  alert={a}
                  onClick={() => {
                    setOpen(false);
                    navigate(a.href);
                  }}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 14px',
              borderTop: `1px solid ${colors.line}`,
              fontSize: 10.5,
              color: colors.dim,
              textAlign: 'center',
              letterSpacing: 0.3,
            }}
          >
            ปรับการแจ้งเตือนได้ที่{' '}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.green,
                fontFamily: 'inherit',
                cursor: 'pointer',
                padding: 0,
                fontSize: 'inherit',
                textDecoration: 'underline',
              }}
            >
              Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert, onClick }: { alert: Alert; onClick: () => void }) {
  const icon = {
    stale: '🚩',
    due: '⏰',
    cold: '🥶',
    birthday: '🎂',
    reminder: '🔔',
  }[alert.kind];

  const color = {
    stale: '#d96a66',
    due: '#E8B923',
    cold: '#d99a66',
    birthday: colors.green,
    reminder: colors.green,
  }[alert.kind];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        width: '100%',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${colors.line}`,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        transition: 'background 100ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgSoft)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {alert.contact ? (
        <LAvatar initials={contactInitials(alert.contact)} size={28} />
      ) : (
        <span
          style={{
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            color: colors.text,
            fontWeight: 500,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {alert.title}
        </div>
        <div
          style={{
            fontSize: 10.5,
            color,
            marginTop: 2,
            fontWeight: 600,
            letterSpacing: 0.3,
          }}
        >
          {alert.sub}
        </div>
      </div>
    </button>
  );
}
