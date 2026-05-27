import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpportunities } from '../../hooks/useOpportunities';
import { useContacts } from '../../hooks/useContacts';
import { useAllMilestones } from '../../hooks/useAllMilestones';
import { useTeamMembers, teamMemberInitials } from '../../hooks/useTeamMembers';
import { useTrackSettings, getStaleThreshold } from '../../hooks/useTrackSettings';
import { useAuth } from '../../contexts/AuthContext';
import {
  findTrack,
  isStale,
  formatDueRelative,
  type OpportunityRow,
  type TrackKey,
} from '../../types/opportunity';
import {
  contactDisplayName,
  contactInitials,
  type ContactRow,
} from '../../types/contact';
import { LCard, LH, LBtn, LIcon, LNote, LAvatar, LPri } from '../../components/primitives';
import { colors } from '../../styles/tokens';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type ViewMode = 'me' | 'team';

export function BriefingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: opps = [] } = useOpportunities();
  const { data: contacts = [] } = useContacts();
  const { data: milestones = [] } = useAllMilestones();
  const { data: team = [] } = useTeamMembers();
  const { data: trackSettings = [] } = useTrackSettings();

  const [viewMode, setViewMode] = useState<ViewMode>('me');

  const myMember = team.find((t) => t.id === user?.id);
  const teamById = useMemo(() => Object.fromEntries(team.map((t) => [t.id, t])), [team]);
  const contactById = useMemo(() => Object.fromEntries(contacts.map((c) => [c.id, c])), [contacts]);

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const sevenDays = new Date(today.getTime() + 7 * MS_PER_DAY).toISOString().slice(0, 10);

  const isMine = viewMode === 'me' && !!user?.id;

  const buckets = useMemo(() => {
    // Filter opportunities by ownership
    const filteredOpps = isMine
      ? opps.filter((o) => o.owner_id === user!.id || o.reviewer_id === user!.id)
      : opps;

    // Filter contacts by ownership
    const filteredContacts = isMine
      ? contacts.filter((c) => c.owner_id === user!.id || c.reviewer_id === user!.id)
      : contacts;

    // Filter milestones by their contact's ownership, OR by created_by
    const filteredMilestones = isMine
      ? milestones.filter((m) => {
          if (m.created_by === user!.id) return true;
          const c = contactById[m.contact_id];
          return !!c && (c.owner_id === user!.id || c.reviewer_id === user!.id);
        })
      : milestones;

    const myStale = filteredOpps.filter((o) =>
      isStale(o, getStaleThreshold(trackSettings, o.track as TrackKey)),
    );
    const myUpcoming = filteredOpps
      .filter((o) => o.due_date && o.due_date >= todayISO && o.due_date <= sevenDays)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));

    // Cold contacts: last_contact_date + freq_days < today
    const coldContacts: ContactRow[] = [];
    for (const c of filteredContacts) {
      if (!c.last_contact_date || !c.freq_days) continue;
      const last = new Date(c.last_contact_date).getTime();
      const overdueBy = (Date.now() - last) / MS_PER_DAY - c.freq_days;
      if (overdueBy > 0) coldContacts.push(c);
    }
    coldContacts.sort((a, b) => (a.last_contact_date ?? '').localeCompare(b.last_contact_date ?? ''));

    // Today's milestones
    const todayMilestones = filteredMilestones.filter((m) => m.date === todayISO && !m.achieved);

    // Upcoming birthdays (next 14 days, with notification on)
    const upcomingBirthdays: ContactRow[] = [];
    for (const c of filteredContacts) {
      if (!c.birthday || !c.birthday_notification_enabled) continue;
      const [, mm, dd] = c.birthday.split('-');
      if (!mm || !dd) continue;
      const thisYear = new Date(today.getFullYear(), Number(mm) - 1, Number(dd));
      const nextYear = new Date(today.getFullYear() + 1, Number(mm) - 1, Number(dd));
      const next = thisYear >= today ? thisYear : nextYear;
      const daysAway = (next.getTime() - today.getTime()) / MS_PER_DAY;
      if (daysAway >= 0 && daysAway <= 14) upcomingBirthdays.push(c);
    }

    // Recent captures (last 48h) — team-wide always, since "what's new in workspace"
    // matters even when filtered to "my" view
    const cutoff = new Date(Date.now() - 2 * MS_PER_DAY).toISOString();
    const newCaptures = (isMine ? filteredOpps : opps).filter((o) => o.created_at > cutoff).slice(0, 6);

    return {
      myStale,
      myUpcoming,
      coldContacts: coldContacts.slice(0, 8),
      todayMilestones,
      upcomingBirthdays,
      newCaptures,
      // Diagnostic counts for empty-state hints
      _diag: {
        totalOpps: opps.length,
        myOpps: filteredOpps.length,
        totalContacts: contacts.length,
        myContacts: filteredContacts.length,
      },
    };
  }, [opps, contacts, milestones, user, todayISO, sevenDays, trackSettings, contactById, isMine]);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1500, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ marginBottom: 22 }}>
        <LNote>Daily Briefing</LNote>
        <div style={{ height: 10 }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <LH
            level={2}
            sub={`สวัสดี ${myMember?.full_name ?? user?.email?.split('@')[0] ?? ''} · ${today.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          >
            {viewMode === 'me' ? 'WHAT NEEDS ME TODAY' : 'WHAT NEEDS THE TEAM TODAY'}
          </LH>
          {/* View mode toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: colors.bgSoft,
              border: `1px solid ${colors.lineHi}`,
              borderRadius: '10px 0 10px 0',
              padding: 2,
            }}
          >
            <ViewModeBtn label="ของฉัน" sub="MINE" active={viewMode === 'me'} onClick={() => setViewMode('me')} />
            <ViewModeBtn label="ทั้งทีม" sub="TEAM" active={viewMode === 'team'} onClick={() => setViewMode('team')} />
          </div>
        </div>
        {/* Diagnostic hint when "Mine" but no opps assigned */}
        {isMine && buckets._diag.myOpps === 0 && buckets._diag.totalOpps > 0 && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              background: '#241a06',
              border: '1px solid #5a3f10',
              borderRadius: '10px 0 10px 0',
              fontSize: 12,
              color: '#E8B923',
              lineHeight: 1.5,
            }}
          >
            <LIcon kind="warn" size={11} color="#E8B923" /> ยังไม่มี opportunity ไหนที่ถูก assign ให้คุณ
            ({buckets._diag.totalOpps} total ในทีม) · เปิด opportunity แล้วเลือก{' '}
            <b style={{ color: colors.text }}>Owner = you</b> · หรือสลับไปดู{' '}
            <button
              type="button"
              onClick={() => setViewMode('team')}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.green,
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: 0,
                fontSize: 'inherit',
                textDecoration: 'underline',
              }}
            >
              ทั้งทีม
            </button>{' '}
            ก่อนได้
          </div>
        )}
      </div>

      {/* Quick capture */}
      <LCard padding={18} style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: colors.dim, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            QUICK ACTIONS
          </span>
          <span style={{ flex: 1 }} />
          <LBtn primary onClick={() => navigate('/inbox/new')}>
            <LIcon kind="plus" size={11} color={colors.bg} /> CAPTURE OPPORTUNITY
          </LBtn>
          <LBtn ghost onClick={() => navigate('/contacts/new')}>
            <LIcon kind="plus" size={11} color={colors.dimSoft} /> NEW CONTACT
          </LBtn>
          <LBtn ghost onClick={() => navigate('/inbox/summary')}>
            INBOX SUMMARY
          </LBtn>
        </div>
      </LCard>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Stale items (highlighted) */}
        <LCard padding={20} style={{ borderLeft: `3px solid #d96a66` }}>
          <SectionHeader
            accent="#d96a66"
            title="MY STALE ITEMS"
            count={buckets.myStale.length}
            sub="ของผม/ของฉัน ไม่ได้ update เกิน threshold ของ track นั้น — กดเพื่อเปิด + update ทันที"
          />
          {buckets.myStale.length === 0 ? (
            <EmptyState text="🎉 ไม่มี stale items! Update tracking ดีมาก" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {buckets.myStale.slice(0, 6).map((o) => (
                <OppRow key={o.id} opp={o} teamById={teamById} onClick={() => navigate(`/inbox/${o.id}`)} />
              ))}
            </div>
          )}
        </LCard>

        {/* Upcoming this week */}
        <LCard padding={20}>
          <SectionHeader
            accent="#E8B923"
            title="DUE THIS WEEK"
            count={buckets.myUpcoming.length}
            sub="งานที่ฉัน own + due ใน 7 วัน"
          />
          {buckets.myUpcoming.length === 0 ? (
            <EmptyState text="ไม่มี deadline ใน 7 วัน" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {buckets.myUpcoming.slice(0, 6).map((o) => (
                <OppRow key={o.id} opp={o} teamById={teamById} onClick={() => navigate(`/inbox/${o.id}`)} compact />
              ))}
            </div>
          )}
        </LCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Cold contacts */}
        <LCard padding={20}>
          <SectionHeader
            accent="#d99a66"
            title="GOING COLD"
            count={buckets.coldContacts.length}
            sub="ต้อง reconnect"
          />
          {buckets.coldContacts.length === 0 ? (
            <EmptyState text="ทุกคนยัง warm 🔥" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {buckets.coldContacts.map((c) => (
                <ContactRowItem
                  key={c.id}
                  contact={c}
                  onClick={() => navigate(`/contacts/${c.id}`)}
                  meta={c.last_contact_date ? `last: ${c.last_contact_date}` : '—'}
                />
              ))}
            </div>
          )}
        </LCard>

        {/* Birthdays */}
        <LCard padding={20}>
          <SectionHeader
            accent={colors.green}
            title="UPCOMING BIRTHDAYS"
            count={buckets.upcomingBirthdays.length}
            sub="14 วันข้างหน้า · มี notification เปิดไว้"
          />
          {buckets.upcomingBirthdays.length === 0 ? (
            <EmptyState text="ไม่มี" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {buckets.upcomingBirthdays.map((c) => (
                <ContactRowItem
                  key={c.id}
                  contact={c}
                  onClick={() => navigate(`/contacts/${c.id}`)}
                  meta={`🎂 ${c.birthday?.slice(5) ?? ''}`}
                />
              ))}
            </div>
          )}
        </LCard>

        {/* New captures */}
        <LCard padding={20}>
          <SectionHeader
            accent="#9aa56a"
            title="NEW CAPTURES · 48H"
            count={buckets.newCaptures.length}
            sub="สิ่งใหม่ที่จับเข้ามา"
          />
          {buckets.newCaptures.length === 0 ? (
            <EmptyState text="ไม่มี capture ใหม่" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {buckets.newCaptures.map((o) => (
                <OppRow key={o.id} opp={o} teamById={teamById} onClick={() => navigate(`/inbox/${o.id}`)} compact />
              ))}
            </div>
          )}
        </LCard>
      </div>

      {/* Today's milestones */}
      {buckets.todayMilestones.length > 0 && (
        <LCard padding={20}>
          <SectionHeader
            accent={colors.green}
            title="MILESTONES · DUE TODAY"
            count={buckets.todayMilestones.length}
            sub="เป้าหมายของ contacts ที่กำหนดวันนี้"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {buckets.todayMilestones.map((m) => {
              const contact = contactById[m.contact_id];
              if (!contact) return null;
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/contacts/${m.contact_id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: colors.bgSoft,
                    border: `1px solid ${colors.line}`,
                    borderRadius: '8px 0 8px 0',
                    cursor: 'pointer',
                  }}
                >
                  <LAvatar initials={contactInitials(contact)} size={22} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: colors.text, fontWeight: 500 }}>{m.title}</div>
                    <div style={{ fontSize: 10.5, color: colors.dimSoft, marginTop: 1 }}>
                      {contactDisplayName(contact)} · {m.side === 'them' ? 'ฝั่งเขา' : m.side === 'us' ? 'ฝั่งเรา' : 'ร่วมกัน'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </LCard>
      )}
    </div>
  );
}

function ViewModeBtn({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        background: active ? colors.green : 'transparent',
        color: active ? colors.bg : colors.dimSoft,
        border: 'none',
        borderRadius: '8px 0 8px 0',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: 0.4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        minWidth: 80,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontSize: 8.5,
          letterSpacing: 1.2,
          opacity: 0.7,
        }}
      >
        {sub}
      </span>
    </button>
  );
}

function SectionHeader({
  title,
  count,
  sub,
  accent,
}: {
  title: string;
  count?: number;
  sub?: string;
  accent: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, background: accent, borderRadius: 99 }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: accent,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
        {count !== undefined && (
          <span style={{ fontSize: 11, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
            · {count}
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 11, color: colors.dim, marginTop: 4, marginLeft: 16 }}>{sub}</div>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 16,
        background: colors.bgSoft,
        border: `1px dashed ${colors.line}`,
        borderRadius: '10px 0 10px 0',
        color: colors.dim,
        fontSize: 12,
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  );
}

function OppRow({
  opp,
  teamById,
  onClick,
  compact = false,
}: {
  opp: OpportunityRow;
  teamById: Record<string, ReturnType<typeof useTeamMembers>['data'] extends (infer T)[] | undefined ? T : never>;
  onClick: () => void;
  compact?: boolean;
}) {
  const meta = findTrack(opp.track);
  const owner = opp.owner_id ? teamById[opp.owner_id] : null;
  const pri = opp.priority === 'High' ? 'hi' : opp.priority === 'Medium' ? 'med' : 'low';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        background: colors.bgSoft,
        border: `1px solid ${colors.line}`,
        borderRadius: '8px 0 8px 0',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = meta.color.chip)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = colors.line)}
    >
      <LPri level={pri as 'hi' | 'med' | 'low'} />
      <span
        style={{
          fontSize: 9.5,
          color: meta.color.ink,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {meta.name}
      </span>
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
          {opp.title}
        </div>
        {!compact && (
          <div style={{ fontSize: 10.5, color: colors.dim, marginTop: 1, letterSpacing: 0.3 }}>
            {opp.stage} {opp.due_date && `· ${formatDueRelative(opp.due_date)}`}
          </div>
        )}
      </div>
      {owner && <LAvatar initials={teamMemberInitials(owner)} size={18} />}
    </div>
  );
}

function ContactRowItem({
  contact,
  onClick,
  meta,
}: {
  contact: ContactRow;
  onClick: () => void;
  meta?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 10px',
        background: colors.bgSoft,
        border: `1px solid ${colors.line}`,
        borderRadius: '8px 0 8px 0',
        cursor: 'pointer',
      }}
    >
      {contact.avatar_url ? (
        <img
          src={contact.avatar_url}
          alt=""
          style={{
            width: 24,
            height: 24,
            objectFit: 'cover',
            border: `1px solid ${colors.lineHi}`,
            borderRadius: '6px 0 6px 0',
          }}
        />
      ) : (
        <LAvatar initials={contactInitials(contact)} size={22} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: colors.text, fontWeight: 500 }}>{contactDisplayName(contact)}</div>
        {meta && <div style={{ fontSize: 10.5, color: colors.dimSoft, marginTop: 1 }}>{meta}</div>}
      </div>
    </div>
  );
}
