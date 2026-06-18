import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpportunities } from '../../hooks/useOpportunities';
import { useContacts } from '../../hooks/useContacts';
import { useAllMilestones } from '../../hooks/useAllMilestones';
import { useAllOpenCommitments, useAllFutureNotes, useWideCalendarEvents } from '../../hooks/useCalendarData';
import { useAllTripStops } from '../../hooks/useTripStops';
import { useAuth } from '../../contexts/AuthContext';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { LCard, LH, LBtn, LIcon, LNote } from '../../components/primitives';
import { colors, z } from '../../styles/tokens';
import {
  aggregateCalendarItems,
  KIND_META,
  needsDecision,
  registrationClosing,
  applyDeadlinesSoon,
  contractsRenewing,
  thisWeekItems,
  thisMonthItems,
  detectConflicts,
  totalCost,
  formatCostMap,
  formatDateLong,
  formatDateShort,
  formatRelativeDate,
  daysFromToday,
  type CalendarItem,
  type CalendarItemKind,
} from './calendarUtils';
import { downloadICal } from './icalExport';
import { todayLocalISO, toLocalISO } from '../../lib/dateUtil';

type ViewMode = 'month' | 'agenda' | 'travel';
type Scope = 'all' | 'mine';
type SplitMode = 'all' | 'deadlines' | 'trips';

const KIND_FILTERS: { value: 'all' | CalendarItemKind | 'events' | 'deadlines'; label: string }[] = [
  { value: 'all',         label: 'ทั้งหมด' },
  { value: 'events',      label: '📅 Events' },
  { value: 'deadlines',   label: '⏰ Deadlines' },
  { value: 'meeting',     label: '🤝 Meetings' },
  { value: 'reminder',    label: '🔔 Reminders' },
  { value: 'milestone',   label: '🎯 Milestones' },
  { value: 'birthday',    label: '🎂 Birthdays' },
];

function matchKindFilter(item: CalendarItem, filter: typeof KIND_FILTERS[number]['value']): boolean {
  if (filter === 'all') return true;
  if (filter === 'events') return item.kind === 'event';
  if (filter === 'deadlines')
    return ['apply_deadline', 'registration_deadline', 'contract_renewal', 'due', 'commitment'].includes(item.kind);
  return item.kind === filter;
}

const DEADLINE_KINDS: CalendarItemKind[] = [
  'apply_deadline',
  'registration_deadline',
  'contract_renewal',
  'due',
  'commitment',
  'decision_date',
  'milestone',
];
// TRIPS & EVENTS = workspace items where team physically goes / attends.
// EXCLUDES `meeting` (personal Google Calendar) — those are not "team trips".
// `event` covers both track='event' opportunities AND track='trip' opportunities
// (calendarUtils.ts emits both as kind='event' for unified display).
const TRIP_EVENT_KINDS: CalendarItemKind[] = ['event'];

function matchSplit(item: CalendarItem, split: SplitMode): boolean {
  if (split === 'all') return true;
  if (split === 'deadlines') return DEADLINE_KINDS.includes(item.kind);
  // trips & events: kind='event' OR a trip-stop source (also surfaces as 'event'
  // but distinguishable by source.kind === 'trip_stop' OR opp.track === 'trip')
  if (TRIP_EVENT_KINDS.includes(item.kind)) return true;
  if (item.source.kind === 'trip_stop') return true;
  if (item.source.kind === 'opportunity' && item.source.opp.track === 'trip') return true;
  return false;
}

export function CalendarPage() {
  const navigate = useNavigate();
  // Calendar items carry either an internal route or an external URL (Google
  // Calendar htmlLink). navigate() only handles internal paths — open external
  // links in a new tab instead of feeding an https:// URL to the router.
  const openItem = (href: string) => {
    if (!href || href === '#') return;
    if (/^https?:\/\//i.test(href)) window.open(href, '_blank', 'noopener,noreferrer');
    else navigate(href);
  };
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data: opportunities = [] } = useOpportunities();
  const { data: contacts = [] } = useContacts();
  const { data: milestones = [] } = useAllMilestones();
  const { data: commitments = [] } = useAllOpenCommitments();
  const { data: notes = [] } = useAllFutureNotes();
  const { data: gcalEvents = [], error: gcalError } = useWideCalendarEvents();
  const { data: tripStops = [] } = useAllTripStops();

  const [view, setView] = useState<ViewMode>('month');
  const [scope, setScope] = useState<Scope>('all');
  const [splitMode, setSplitMode] = useState<SplitMode>('all');
  const [kindFilter, setKindFilter] = useState<typeof KIND_FILTERS[number]['value']>('all');
  const [cursorMonth, setCursorMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() }; // 0-indexed
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ─── Aggregate everything ────────────────────────────────────
  const allItems = useMemo(
    () =>
      aggregateCalendarItems({
        opportunities,
        milestones,
        commitments,
        notes,
        contacts,
        calendarEvents: gcalEvents,
        tripStops,
        myUserId: user?.id ?? null,
      }),
    [opportunities, milestones, commitments, notes, contacts, gcalEvents, tripStops, user],
  );

  // Apply scope + split + kind filter (in that order)
  const items = useMemo(
    () =>
      allItems.filter((i) => {
        if (scope === 'mine' && !i.isMine) return false;
        if (!matchSplit(i, splitMode)) return false;
        return matchKindFilter(i, kindFilter);
      }),
    [allItems, scope, splitMode, kindFilter],
  );

  // Smart sections
  const decisionsNeeded = useMemo(() => needsDecision(allItems), [allItems]);
  const registrationsClosing = useMemo(() => registrationClosing(allItems), [allItems]);
  const applyDeadlines = useMemo(() => applyDeadlinesSoon(allItems), [allItems]);
  const contractsToRenew = useMemo(() => contractsRenewing(allItems), [allItems]);
  const weekItems = useMemo(() => thisWeekItems(items), [items]);
  const monthItems = useMemo(() => thisMonthItems(items), [items]);
  const conflicts = useMemo(() => detectConflicts(items), [items]);
  const monthCost = useMemo(() => formatCostMap(totalCost(monthItems.filter((i) => i.kind === 'event'))), [monthItems]);

  const exportableItems = items.filter((i) => !i.href.startsWith('#'));
  const handleExport = () => {
    downloadICal(exportableItems, `locol-calendar-${todayLocalISO()}.ics`);
  };

  return (
    <div style={{ padding: isMobile ? '14px 14px 24px' : '24px 28px', maxWidth: 1500, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ marginBottom: 18 }}>
        <LNote>Schedule · Events & Deadlines</LNote>
        <div style={{ height: 10 }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <LH
            level={2}
            sub={`${new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${allItems.length} items in workspace`}
          >
            CALENDAR
          </LH>
          <div style={{ display: 'flex', gap: 8 }}>
            <LBtn ghost onClick={handleExport} disabled={exportableItems.length === 0}>
              <LIcon kind="arrow-down" size={11} color={colors.dimSoft} /> EXPORT .ICS
            </LBtn>
          </div>
        </div>
      </div>

      {/* Prominent split toggle — choose context lens */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          marginBottom: 18,
          background: colors.bgSoft,
          border: `1px solid ${colors.lineHi}`,
          borderRadius: '12px 3px 12px 3px',
          padding: 4,
          overflow: 'hidden',
        }}
      >
        <SplitBtn
          icon="🌐"
          label="ALL"
          sub="ทุกอย่างใน workspace"
          active={splitMode === 'all'}
          onClick={() => setSplitMode('all')}
          accent={colors.green}
        />
        <SplitBtn
          icon="⏰"
          label="DEADLINES"
          sub="งานต้องเสร็จให้ทัน"
          active={splitMode === 'deadlines'}
          onClick={() => setSplitMode('deadlines')}
          accent={colors.warn}
        />
        <SplitBtn
          icon="📅"
          label="TRIPS & EVENTS"
          sub="งานที่ team มีออกไป (workspace only)"
          active={splitMode === 'trips'}
          onClick={() => setSplitMode('trips')}
          accent={colors.danger}
        />
      </div>

      {/* Stats banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <StatTile label="EVENTS THIS WEEK" value={weekItems.filter((i) => i.kind === 'event').length} accent={KIND_META.event.color} />
        <StatTile label="DEADLINES 14d" value={[...applyDeadlines, ...registrationsClosing].length} accent={colors.warn} />
        <StatTile label="NEEDS DECISION" value={decisionsNeeded.length} accent={colors.danger} />
        <StatTile label="MONTH BUDGET" value={monthCost} accent={colors.green} isText />
      </div>

      {/* Smart sections — only show those with items */}
      {(decisionsNeeded.length + registrationsClosing.length + applyDeadlines.length + contractsToRenew.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {decisionsNeeded.length > 0 && (
            <SmartSection
              title="🔥 NEEDS DECISION"
              sub="Events ใน 14 วัน ยังไม่ได้ตัดสินใจว่าไปหรือไม่ไป"
              accent={colors.danger}
              items={decisionsNeeded}
              onItemClick={(i) => navigate(i.href)}
            />
          )}
          {registrationsClosing.length > 0 && (
            <SmartSection
              title="⏰ REGISTRATION CLOSING"
              sub="ลงทะเบียนภายใน 7 วัน · ยังไม่ register"
              accent={colors.warn}
              items={registrationsClosing}
              onItemClick={(i) => navigate(i.href)}
            />
          )}
          {applyDeadlines.length > 0 && (
            <SmartSection
              title="📝 APPLY DEADLINES"
              sub="Grant/program ใกล้ปิดรับสมัคร"
              accent={colors.warn}
              items={applyDeadlines}
              onItemClick={(i) => navigate(i.href)}
            />
          )}
          {contractsToRenew.length > 0 && (
            <SmartSection
              title="🔄 CONTRACTS RENEWING"
              sub="สัญญาใกล้หมดอายุ — 90/30/7 d windows"
              accent={colors.olive}
              items={contractsToRenew}
              onItemClick={(i) => navigate(i.href)}
            />
          )}
        </div>
      )}

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        {/* View toggle */}
        <div
          style={{
            display: 'inline-flex',
            background: colors.bgSoft,
            border: `1px solid ${colors.lineHi}`,
            borderRadius: '8px 2px 8px 2px',
            padding: 2,
          }}
        >
          <ViewBtn label="Month" active={view === 'month'} onClick={() => setView('month')} />
          <ViewBtn label="Agenda" active={view === 'agenda'} onClick={() => setView('agenda')} />
          <ViewBtn label="Travel" active={view === 'travel'} onClick={() => setView('travel')} />
        </div>

        {/* Scope */}
        <div
          style={{
            display: 'inline-flex',
            background: colors.bgSoft,
            border: `1px solid ${colors.lineHi}`,
            borderRadius: '8px 2px 8px 2px',
            padding: 2,
          }}
        >
          <ViewBtn label="ทั้งทีม" active={scope === 'all'} onClick={() => setScope('all')} />
          <ViewBtn label="ของฉัน" active={scope === 'mine'} onClick={() => setScope('mine')} />
        </div>

        {/* Kind filter */}
        <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
          {KIND_FILTERS.map((f) => (
            <FilterChip key={f.value} active={kindFilter === f.value} onClick={() => setKindFilter(f.value)}>
              {f.label}
            </FilterChip>
          ))}
        </div>

        <span style={{ flex: 1 }} />
        <span className="l-hide-mobile" style={{ fontSize: 11, color: colors.dim, letterSpacing: 0.4 }}>
          {items.length} items shown
        </span>
      </div>

      {gcalError && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            background: colors.warnBg,
            border: `1px solid ${colors.warnDk}`,
            borderRadius: '6px 2px 6px 2px',
            fontSize: 11,
            color: colors.warn,
          }}
        >
          ⚠ Google Calendar access หมดอายุ — logout + login ใหม่ (meetings ส่วน Gmail/Calendar จะไม่แสดง)
        </div>
      )}

      {/* Main view */}
      {view === 'month' && (
        <MonthGrid
          items={items}
          cursorMonth={cursorMonth}
          conflicts={conflicts}
          onMonthChange={setCursorMonth}
          onDateClick={(d) => setSelectedDate(d)}
        />
      )}
      {view === 'agenda' && <AgendaView items={items} conflicts={conflicts} onClickItem={(i) => openItem(i.href)} />}
      {view === 'travel' && <TravelView items={items} onClickItem={(i) => openItem(i.href)} />}

      {/* Day panel (slide-in from right when date selected) */}
      {selectedDate && (
        <DayPanel
          date={selectedDate}
          items={items.filter((i) => i.date === selectedDate)}
          onClose={() => setSelectedDate(null)}
          onClickItem={(i) => {
            setSelectedDate(null);
            openItem(i.href);
          }}
        />
      )}
    </div>
  );
}

// ─── Stat tile ──────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  accent,
  isText = false,
}: {
  label: string;
  value: number | string;
  accent: string;
  isText?: boolean;
}) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: colors.bgCard,
        border: `1px solid ${colors.line}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: '12px 3px 12px 3px',
      }}
    >
      <div style={{ fontSize: 10, color: colors.dim, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: isText ? 18 : 26,
          color: accent,
          fontWeight: 700,
          marginTop: 4,
          fontFamily: isText ? 'inherit' : "'IBM Plex Mono', monospace",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Smart section ──────────────────────────────────────────────────
function SmartSection({
  title,
  sub,
  accent,
  items,
  onItemClick,
}: {
  title: string;
  sub: string;
  accent: string;
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
}) {
  return (
    <LCard padding={0}>
      <div
        style={{
          padding: '8px 14px',
          borderBottom: `1px solid ${colors.line}`,
          background: `${accent}15`,
          borderLeft: `3px solid ${accent}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: 1, textTransform: 'uppercase' }}>
            {title}
          </span>
          <span style={{ fontSize: 11, color: colors.dimSoft, fontFamily: "'IBM Plex Mono', monospace" }}>
            · {items.length}
          </span>
        </div>
        <div style={{ fontSize: 11, color: colors.dim, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.slice(0, 5).map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => onItemClick(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
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
            <div style={{ minWidth: 72 }}>
              <div style={{ fontSize: 12, color: colors.text, fontWeight: 600 }}>{formatDateShort(i.date)}</div>
              <div style={{ fontSize: 10, color: colors.dim, marginTop: 1 }}>{formatRelativeDate(i.date)}</div>
            </div>
            <div style={{ flex: 1, fontSize: 13, color: colors.text, fontWeight: 500 }}>
              {i.title}
              {i.location && (
                <div style={{ fontSize: 11, color: colors.dimSoft, marginTop: 2 }}><LIcon kind="pin" size={10} color={colors.dimSoft} /> {i.location}</div>
              )}
            </div>
            <span style={{ color: colors.dim }}>
              <LIcon kind="arrow-r" size={12} color={colors.dim} />
            </span>
          </button>
        ))}
      </div>
    </LCard>
  );
}

// ─── Month grid ─────────────────────────────────────────────────────
function MonthGrid({
  items,
  cursorMonth,
  conflicts,
  onMonthChange,
  onDateClick,
}: {
  items: CalendarItem[];
  cursorMonth: { year: number; month: number };
  conflicts: Set<string>;
  onMonthChange: (m: { year: number; month: number }) => void;
  onDateClick: (dateISO: string) => void;
}) {
  const { year, month } = cursorMonth;
  const today = todayLocalISO();

  // Build cells for the month grid (always 6 rows = 42 cells)
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=Sun
  const cells: { date: Date; iso: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, i - startOffset + 1);
    cells.push({
      date: d,
      iso: toLocalISO(d),
      inMonth: d.getMonth() === month,
    });
  }

  // Group items by date
  const itemsByDate = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const i of items) {
      const arr = m.get(i.date) ?? [];
      arr.push(i);
      m.set(i.date, arr);
    }
    return m;
  }, [items]);

  const monthLabel = new Date(year, month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  return (
    <LCard padding={0}>
      {/* Month header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.line}`,
          gap: 12,
        }}
      >
        <button type="button" onClick={() => onMonthChange({ year: month === 0 ? year - 1 : year, month: (month + 11) % 12 })} style={navBtnStyle}>
          ‹
        </button>
        <button
          type="button"
          onClick={() => {
            const t = new Date();
            onMonthChange({ year: t.getFullYear(), month: t.getMonth() });
          }}
          style={{ ...navBtnStyle, padding: '4px 12px', fontSize: 11 }}
        >
          TODAY
        </button>
        <button type="button" onClick={() => onMonthChange({ year: month === 11 ? year + 1 : year, month: (month + 1) % 12 })} style={navBtnStyle}>
          ›
        </button>
        <span style={{ fontSize: 16, color: colors.text, fontWeight: 600, marginLeft: 8, letterSpacing: 0.5 }}>
          {monthLabel}
        </span>
      </div>

      {/* Weekday labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${colors.line}` }}>
        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (
          <div
            key={d}
            style={{
              padding: '8px 6px',
              textAlign: 'center',
              fontSize: 10.5,
              color: i === 0 || i === 6 ? colors.dimSoft : colors.dim,
              letterSpacing: 1,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((cell, idx) => {
          const cellItems = itemsByDate.get(cell.iso) ?? [];
          const isToday = cell.iso === today;
          const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onDateClick(cell.iso)}
              style={{
                minHeight: 96,
                padding: 6,
                background: isToday ? colors.greenBg : isWeekend ? colors.bg : 'transparent',
                border: 'none',
                borderRight: (idx + 1) % 7 === 0 ? 'none' : `1px solid ${colors.line}`,
                borderBottom: idx < 35 ? `1px solid ${colors.line}` : 'none',
                cursor: 'pointer',
                opacity: cell.inMonth ? 1 : 0.4,
                fontFamily: 'inherit',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                transition: 'background 100ms',
              }}
              onMouseEnter={(e) => {
                // Today gets a hover state too (a lighter green), instead of
                // being the one cell that doesn't react to the pointer.
                e.currentTarget.style.background = isToday ? '#22310d' : colors.bgSoft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isToday ? colors.greenBg : isWeekend ? colors.bg : 'transparent';
              }}
            >
              <div
                className={isToday ? 'l-pulse-ring' : undefined}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isToday ? colors.green : isWeekend ? colors.dimSoft : colors.text,
                  fontFamily: "'IBM Plex Mono', monospace",
                  ...(isToday
                    ? {
                        alignSelf: 'flex-start',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 18,
                        height: 18,
                        padding: '0 4px',
                        borderRadius: '50%',
                        border: `1px solid ${colors.greenDk}`,
                      }
                    : {}),
                }}
              >
                {cell.date.getDate()}
              </div>
              {cellItems.slice(0, 3).map((i) => {
                const meta = KIND_META[i.kind];
                const isConflict = conflicts.has(i.id);
                return (
                  <div
                    key={i.id}
                    title={i.title}
                    style={{
                      fontSize: 9.5,
                      color: meta.color,
                      background: meta.bg,
                      border: `1px solid ${isConflict ? colors.danger : meta.border}`,
                      borderRadius: '4px 1px 4px 1px',
                      padding: '1px 4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      letterSpacing: 0.2,
                    }}
                  >
                    {isConflict && '⚠ '}
                    {meta.icon} {i.title.slice(0, 18)}
                  </div>
                );
              })}
              {cellItems.length > 3 && (
                <div style={{ fontSize: 9.5, color: colors.dim, padding: '0 4px' }}>
                  +{cellItems.length - 3} more
                </div>
              )}
            </button>
          );
        })}
      </div>
    </LCard>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  padding: 0,
  background: colors.bgSoft,
  border: `1px solid ${colors.lineHi}`,
  borderRadius: '6px 2px 6px 2px',
  color: colors.text,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// ─── Agenda view ────────────────────────────────────────────────────
function AgendaView({
  items,
  conflicts,
  onClickItem,
}: {
  items: CalendarItem[];
  conflicts: Set<string>;
  onClickItem: (item: CalendarItem) => void;
}) {
  const today = todayLocalISO();
  const upcoming = items.filter((i) => i.date >= today);

  // Group by relative bucket
  const groups = useMemo(() => {
    const byBucket: Record<string, CalendarItem[]> = {
      TODAY: [],
      TOMORROW: [],
      'THIS WEEK': [],
      'NEXT WEEK': [],
      LATER: [],
    };
    for (const i of upcoming) {
      const d = daysFromToday(i.date);
      if (d === 0) byBucket.TODAY.push(i);
      else if (d === 1) byBucket.TOMORROW.push(i);
      else if (d <= 7) byBucket['THIS WEEK'].push(i);
      else if (d <= 14) byBucket['NEXT WEEK'].push(i);
      else byBucket.LATER.push(i);
    }
    return byBucket;
  }, [upcoming]);

  if (upcoming.length === 0) {
    return (
      <LCard padding={40}>
        <div style={{ textAlign: 'center', color: colors.dim, fontSize: 13 }}>🎉 ไม่มีอะไรกำหนดไว้</div>
      </LCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {Object.entries(groups).map(([bucket, list]) =>
        list.length > 0 ? (
          <div key={bucket}>
            <div
              style={{
                fontSize: 11,
                color: bucket === 'TODAY' ? colors.green : colors.dim,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: 8,
                paddingLeft: 4,
              }}
            >
              {bucket} · {list.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.map((i) => (
                <AgendaRow key={i.id} item={i} isConflict={conflicts.has(i.id)} onClick={() => onClickItem(i)} />
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}

function AgendaRow({ item, isConflict, onClick }: { item: CalendarItem; isConflict: boolean; onClick: () => void }) {
  const meta = KIND_META[item.kind];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 14px',
        background: colors.bgCard,
        border: `1px solid ${isConflict ? colors.dangerDk : colors.line}`,
        borderLeft: `3px solid ${meta.color}`,
        borderRadius: '8px 2px 8px 2px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        transition: 'border-color 100ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = meta.border)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = isConflict ? colors.dangerDk : colors.line)}
    >
      <div style={{ minWidth: 70 }}>
        <div style={{ fontSize: 12, color: colors.text, fontWeight: 600 }}>{formatDateShort(item.date)}</div>
        {item.time && (
          <div style={{ fontSize: 10, color: colors.dim, marginTop: 1, fontFamily: "'IBM Plex Mono', monospace" }}>
            {item.time}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span
            style={{
              fontSize: 9.5,
              padding: '1px 6px',
              background: meta.bg,
              color: meta.color,
              border: `1px solid ${meta.border}`,
              borderRadius: '4px 1px 4px 1px',
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            {meta.icon} {meta.label}
          </span>
          {isConflict && (
            <span style={{ fontSize: 9.5, color: colors.danger, fontWeight: 700, letterSpacing: 0.5 }}>⚠ CONFLICT</span>
          )}
          {item.status && (
            <span style={{ fontSize: 10, color: colors.dim, letterSpacing: 0.3 }}>· {item.status}</span>
          )}
        </div>
        <div style={{ fontSize: 13.5, color: colors.text, fontWeight: 500, lineHeight: 1.3 }}>{item.title}</div>
        {(item.location || item.cost) && (
          <div style={{ fontSize: 11, color: colors.dimSoft, marginTop: 3, display: 'flex', gap: 10 }}>
            {item.location && <span><LIcon kind="pin" size={10} color={colors.dimSoft} /> {item.location}</span>}
            {item.cost && (
              <span>
                💸 {item.cost.amount.toLocaleString()} {item.cost.currency}
              </span>
            )}
          </div>
        )}
      </div>
      <LIcon kind="arrow-r" size={12} color={colors.dim} />
    </button>
  );
}

// ─── Travel view ────────────────────────────────────────────────────
function TravelView({ items, onClickItem }: { items: CalendarItem[]; onClickItem: (item: CalendarItem) => void }) {
  const eventsWithLoc = items.filter((i) => i.kind === 'event' && i.location);
  const grouped = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const i of eventsWithLoc) {
      const loc = (i.location ?? 'Unknown').trim();
      const arr = m.get(loc) ?? [];
      arr.push(i);
      m.set(loc, arr);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [eventsWithLoc]);

  if (grouped.length === 0) {
    return (
      <LCard padding={40}>
        <div style={{ textAlign: 'center', color: colors.dim, fontSize: 13 }}>
          ยังไม่มี event ที่มี location field — ไป Inbox → event → ใส่ location ใน details
        </div>
      </LCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {grouped.map(([location, locItems]) => {
        const isOnline = /online|virtual|zoom|meet|teams|ออนไลน์|ทางไกล/i.test(location);
        return (
          <LCard key={location} padding={0}>
            <div
              style={{
                padding: '10px 14px',
                borderBottom: `1px solid ${colors.line}`,
                background: colors.bgSoft,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: colors.text, fontWeight: 600 }}>
                  {isOnline ? '💻' : '📍'} {location}
                </div>
                <div style={{ fontSize: 11, color: colors.dim, marginTop: 2 }}>{locItems.length} events</div>
              </div>
              {!isOnline && (
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 10.5,
                    color: colors.green,
                    textDecoration: 'none',
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  MAPS ↗
                </a>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {locItems.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => onClickItem(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${colors.line}`,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgSoft)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ minWidth: 70 }}>
                    <div style={{ fontSize: 12, color: colors.text, fontWeight: 600 }}>{formatDateShort(i.date)}</div>
                    {i.time && (
                      <div style={{ fontSize: 10, color: colors.dim, marginTop: 1, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {i.time}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: colors.text, fontWeight: 500 }}>
                    {i.title}
                    {i.cost && (
                      <div style={{ fontSize: 11, color: colors.dimSoft, marginTop: 2 }}>
                        💸 {i.cost.amount.toLocaleString()} {i.cost.currency}
                      </div>
                    )}
                  </div>
                  <LIcon kind="arrow-r" size={12} color={colors.dim} />
                </button>
              ))}
            </div>
          </LCard>
        );
      })}
    </div>
  );
}

// ─── Day panel (slide-in) ───────────────────────────────────────────
function DayPanel({
  date,
  items,
  onClose,
  onClickItem,
}: {
  date: string;
  items: CalendarItem[];
  onClose: () => void;
  onClickItem: (item: CalendarItem) => void;
}) {
  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: z.modalBackdrop,
          animation: 'l-fade-in 150ms ease-out',
        }}
      />
      {/* sheet */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(420px, 100%)',
          background: colors.bgCard,
          border: `1px solid ${colors.lineHi}`,
          borderRadius: '14px 0 0 14px',
          zIndex: z.modal,
          overflowY: 'auto',
          animation: 'l-slide-right 200ms ease-out',
          boxShadow: '-12px 0 32px rgba(0,0,0,0.55)',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${colors.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: colors.bgCard,
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: colors.dim, letterSpacing: 1, textTransform: 'uppercase' }}>
              {formatRelativeDate(date)}
            </div>
            <div style={{ fontSize: 14, color: colors.text, fontWeight: 600, marginTop: 2 }}>
              {formatDateLong(date)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              background: 'transparent',
              border: `1px solid ${colors.lineHi}`,
              borderRadius: '6px 2px 6px 2px',
              color: colors.dim,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 14 }}>
          {items.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: colors.dim, fontSize: 12.5 }}>
              ไม่มีอะไรในวันนี้
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((i) => {
                const meta = KIND_META[i.kind];
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => onClickItem(i)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      padding: '10px 12px',
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                      borderLeft: `3px solid ${meta.color}`,
                      borderRadius: '8px 2px 8px 2px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: meta.color, fontWeight: 700, letterSpacing: 0.5 }}>
                        {meta.icon} {meta.label}
                      </span>
                      {i.time && (
                        <span style={{ fontSize: 10, color: colors.dimSoft, fontFamily: "'IBM Plex Mono', monospace" }}>
                          · {i.time}
                        </span>
                      )}
                      {i.status && <span style={{ fontSize: 10, color: colors.dim }}>· {i.status}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: colors.text, fontWeight: 500, lineHeight: 1.3 }}>{i.title}</div>
                    {i.location && (
                      <div style={{ fontSize: 11, color: colors.dimSoft }}><LIcon kind="pin" size={10} color={colors.dimSoft} /> {i.location}</div>
                    )}
                    {i.cost && (
                      <div style={{ fontSize: 11, color: colors.dimSoft }}>
                        💸 {i.cost.amount.toLocaleString()} {i.cost.currency}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes l-slide-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        /* Defined here too (not only in BottomNav, which is absent on desktop)
           so the DayPanel backdrop fade works on every breakpoint. */
        @keyframes l-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── Toolbar bits ───────────────────────────────────────────────────
function SplitBtn({
  icon,
  label,
  sub,
  active,
  onClick,
  accent,
}: {
  icon: string;
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 14px',
        background: active ? accent : 'transparent',
        color: active ? colors.bg : colors.text,
        border: 'none',
        borderRadius: '10px 3px 10px 3px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        transition: 'background 120ms, color 120ms',
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = colors.bgRaise;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: active ? colors.bg : colors.dimSoft,
            opacity: active ? 0.7 : 1,
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub}
        </div>
      </span>
    </button>
  );
}

function ViewBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px',
        background: active ? colors.green : 'transparent',
        color: active ? colors.bg : colors.dimSoft,
        border: 'none',
        borderRadius: '6px 2px 6px 2px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: 0.4,
      }}
    >
      {label}
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 10px',
        background: active ? colors.green : 'transparent',
        color: active ? colors.bg : colors.dimSoft,
        border: `1px solid ${active ? colors.green : colors.lineHi}`,
        borderRadius: '6px 2px 6px 2px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.3,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}
