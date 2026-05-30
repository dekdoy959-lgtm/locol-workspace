import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpportunities } from '../../hooks/useOpportunities';
import { useTeamMembers, teamMemberInitials } from '../../hooks/useTeamMembers';
import { useTrackSettings, getStaleThreshold } from '../../hooks/useTrackSettings';
import {
  TRACKS,
  findTrack,
  isStale,
  formatDueRelative,
  type OpportunityRow,
  type TrackKey,
} from '../../types/opportunity';
import { LCard, LH, LBtn, LIcon, LPri, LAvatar, LNote, LChip } from '../../components/primitives';
import { colors } from '../../styles/tokens';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  // Week starts Monday
  const x = startOfDay(d);
  const day = x.getDay() || 7; // Sun = 0 → 7
  x.setDate(x.getDate() - (day - 1));
  return x;
}

export function InboxSummaryPage() {
  const navigate = useNavigate();
  const { data: opps = [], isLoading } = useOpportunities();
  const { data: team = [] } = useTeamMembers();
  const { data: trackSettings = [] } = useTrackSettings();
  const teamById = useMemo(() => Object.fromEntries(team.map((t) => [t.id, t])), [team]);

  const today = startOfDay(new Date());
  const thisWeekStart = startOfWeek(today);
  const nextWeekStart = new Date(thisWeekStart.getTime() + 7 * MS_PER_DAY);
  const weekAfterStart = new Date(thisWeekStart.getTime() + 14 * MS_PER_DAY);

  const buckets = useMemo(() => {
    const upcomingEventsThis: OpportunityRow[] = [];
    const upcomingEventsNext: OpportunityRow[] = [];
    const upcomingEventsLater: OpportunityRow[] = [];
    const applying: OpportunityRow[] = [];
    const awaitingDecision: OpportunityRow[] = [];
    const wonRecently: OpportunityRow[] = [];
    const lostRecently: OpportunityRow[] = [];
    const upcomingTrips: OpportunityRow[] = [];
    const stale: OpportunityRow[] = [];

    for (const opp of opps) {
      if (isStale(opp, getStaleThreshold(trackSettings, opp.track as TrackKey))) stale.push(opp);

      // Events bucketed by due_date
      if (opp.track === 'event' && opp.due_date) {
        const due = startOfDay(new Date(opp.due_date));
        if (due >= thisWeekStart && due < nextWeekStart) upcomingEventsThis.push(opp);
        else if (due >= nextWeekStart && due < weekAfterStart) upcomingEventsNext.push(opp);
        else if (due >= weekAfterStart) upcomingEventsLater.push(opp);
      }

      // Apply track
      if (opp.track === 'apply') {
        if (opp.stage === 'Submitted') awaitingDecision.push(opp);
        else if (opp.stage === 'Won') wonRecently.push(opp);
        else if (opp.stage === 'Lost') lostRecently.push(opp);
        else applying.push(opp);
      }

      // Trips
      if (opp.track === 'trip' && ['Planned', 'Confirmed'].includes(opp.stage)) {
        upcomingTrips.push(opp);
      }
    }

    return {
      upcomingEventsThis,
      upcomingEventsNext,
      upcomingEventsLater,
      applying,
      awaitingDecision,
      wonRecently,
      lostRecently,
      upcomingTrips,
      stale,
    };
  }, [opps, thisWeekStart, nextWeekStart, weekAfterStart, trackSettings]);

  if (isLoading) {
    return <div style={{ padding: 40, color: colors.dim, textAlign: 'center' }}>กำลังโหลด…</div>;
  }

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <LNote>Opportunity Layer · Summary</LNote>
          <div style={{ height: 10 }} />
          <LH level={3} sub="ภาพรวม Inbox — แบ่งตามประเภท + timeline">
            INBOX SUMMARY
          </LH>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <LBtn ghost onClick={() => navigate('/inbox')}>
            ← KANBAN VIEW
          </LBtn>
          <LBtn primary onClick={() => navigate('/inbox/new')}>
            <LIcon kind="plus" size={12} color={colors.bg} /> CAPTURE
          </LBtn>
        </div>
      </div>

      {/* Big stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        <BigStat label="Total Open" value={opps.length} />
        <BigStat
          label="Stale ⚠"
          value={buckets.stale.length}
          color={buckets.stale.length > 0 ? '#d96a66' : colors.text}
        />
        <span style={{ display: 'none' }}>{TRACKS.length}</span>
        <BigStat label="Events Soon" value={buckets.upcomingEventsThis.length + buckets.upcomingEventsNext.length} color="#d96a66" />
        <BigStat label="Applying" value={buckets.applying.length} color="#E8B923" />
        <BigStat label="Awaiting Decision" value={buckets.awaitingDecision.length} color="#E8B923" />
        <BigStat label="Upcoming Trips" value={buckets.upcomingTrips.length} color="#9aa56a" />
      </div>

      {/* Stale banner */}
      {buckets.stale.length > 0 && (
        <SectionCard
          title="STALE · ต้อง update ด่วน"
          subtitle={`${buckets.stale.length} item ไม่ได้ update เกิน threshold (per-track)`}
          accent="#d96a66"
          opps={buckets.stale}
          teamById={teamById}
          onClick={(id) => navigate(`/inbox/${id}`)}
        />
      )}

      {/* Upcoming events */}
      <div style={{ marginBottom: 18 }}>
        <SectionHeader
          accent="#d96a66"
          title="UPCOMING EVENTS · งานที่จะไป"
          subtitle="แบ่งตามสัปดาห์"
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <WeekColumn
            label="THIS WEEK"
            sublabel={`${thisWeekStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} →`}
            opps={buckets.upcomingEventsThis}
            teamById={teamById}
            onClick={(id) => navigate(`/inbox/${id}`)}
            emphasized
          />
          <WeekColumn
            label="NEXT WEEK"
            sublabel={`${nextWeekStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} →`}
            opps={buckets.upcomingEventsNext}
            teamById={teamById}
            onClick={(id) => navigate(`/inbox/${id}`)}
          />
          <WeekColumn
            label="LATER"
            sublabel={`from ${weekAfterStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`}
            opps={buckets.upcomingEventsLater}
            teamById={teamById}
            onClick={(id) => navigate(`/inbox/${id}`)}
          />
        </div>
      </div>

      {/* Apply track sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
        <SectionCard
          title="APPLYING · กำลังสมัคร"
          accent="#E8B923"
          opps={buckets.applying}
          teamById={teamById}
          onClick={(id) => navigate(`/inbox/${id}`)}
          compact
        />
        <SectionCard
          title="AWAITING DECISION · รอผล"
          accent="#E8B923"
          opps={buckets.awaitingDecision}
          teamById={teamById}
          onClick={(id) => navigate(`/inbox/${id}`)}
          compact
        />
        <SectionCard
          title="DECIDED · ผล"
          accent={colors.green}
          opps={[...buckets.wonRecently, ...buckets.lostRecently]}
          teamById={teamById}
          onClick={(id) => navigate(`/inbox/${id}`)}
          compact
          showStage
        />
      </div>

      {/* Upcoming trips */}
      {buckets.upcomingTrips.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionCard
            title="UPCOMING TRIPS · ลงพื้นที่"
            subtitle="งานที่ team จะออกไปฟาร์ม / ภาคสนาม"
            accent="#9aa56a"
            opps={buckets.upcomingTrips}
            teamById={teamById}
            onClick={(id) => navigate(`/inbox/${id}`)}
            compact
            showStage
          />
        </div>
      )}

      {/* Track distribution */}
      <LCard padding={20}>
        <LH level={5} accent={false} color={colors.green}>
          BY TRACK
        </LH>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 10 }}>
          {TRACKS.map((t) => {
            const count = opps.filter((o) => o.track === t.key).length;
            return (
              <div
                key={t.key}
                onClick={() => navigate('/inbox')}
                style={{
                  padding: '14px 12px',
                  background: t.color.soft,
                  border: `1px solid ${t.color.chip}`,
                  borderRadius: '12px 0 12px 0',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, background: t.color.ink, borderRadius: 99 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.color.ink, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                    {t.name}
                  </span>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 700, color: colors.text }}>
                  {count}
                </div>
                <div style={{ fontSize: 10, color: colors.dim, marginTop: 4, letterSpacing: 0.3 }}>{t.cadence}</div>
              </div>
            );
          })}
        </div>
      </LCard>
    </div>
  );
}

function BigStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <LCard padding={16}>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 700,
          fontSize: 32,
          letterSpacing: -1,
          color: color ?? colors.text,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: colors.dim, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6 }}>
        {label}
      </div>
    </LCard>
  );
}

function SectionHeader({ title, subtitle, accent }: { title: string; subtitle?: string; accent: string }) {
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
      </div>
      {subtitle && <div style={{ fontSize: 11, color: colors.dim, marginTop: 4, marginLeft: 16 }}>{subtitle}</div>}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  accent,
  opps,
  teamById,
  onClick,
  compact = false,
  showStage = false,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  opps: OpportunityRow[];
  teamById: Record<string, ReturnType<typeof useTeamMembers>['data'] extends (infer T)[] | undefined ? T : never>;
  onClick: (id: string) => void;
  compact?: boolean;
  showStage?: boolean;
}) {
  return (
    <LCard padding={16}>
      <SectionHeader title={title} subtitle={subtitle} accent={accent} />
      {opps.length === 0 ? (
        <div style={{ padding: 12, color: colors.dim, fontSize: 12, textAlign: 'center' }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {opps.slice(0, compact ? 5 : 100).map((o) => (
            <MiniOppRow key={o.id} opp={o} teamById={teamById} onClick={() => onClick(o.id)} showStage={showStage} />
          ))}
          {compact && opps.length > 5 && (
            <div style={{ fontSize: 11, color: colors.dim, padding: '4px 6px', letterSpacing: 0.3 }}>
              + อีก {opps.length - 5} อัน
            </div>
          )}
        </div>
      )}
    </LCard>
  );
}

function WeekColumn({
  label,
  sublabel,
  opps,
  teamById,
  onClick,
  emphasized = false,
}: {
  label: string;
  sublabel?: string;
  opps: OpportunityRow[];
  teamById: Record<string, ReturnType<typeof useTeamMembers>['data'] extends (infer T)[] | undefined ? T : never>;
  onClick: (id: string) => void;
  emphasized?: boolean;
}) {
  return (
    <LCard padding={14} bg={emphasized ? '#1f1108' : colors.bgCard}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: emphasized ? '#d96a66' : colors.text,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 10, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>{sublabel}</span>
      </div>
      {opps.length === 0 ? (
        <div style={{ padding: 8, color: colors.dim, fontSize: 11.5, textAlign: 'center' }}>ไม่มี event</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {opps.map((o) => (
            <MiniOppRow key={o.id} opp={o} teamById={teamById} onClick={() => onClick(o.id)} showDue />
          ))}
        </div>
      )}
    </LCard>
  );
}

function MiniOppRow({
  opp,
  teamById,
  onClick,
  showStage = false,
  showDue = false,
}: {
  opp: OpportunityRow;
  teamById: Record<string, ReturnType<typeof useTeamMembers>['data'] extends (infer T)[] | undefined ? T : never>;
  onClick: () => void;
  showStage?: boolean;
  showDue?: boolean;
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
        padding: '7px 9px',
        background: colors.bgSoft,
        border: `1px solid ${colors.line}`,
        borderRadius: '8px 0 8px 0',
        cursor: 'pointer',
        transition: 'border-color 150ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = meta.color.chip)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = colors.line)}
    >
      <LPri level={pri as 'hi' | 'med' | 'low'} />
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
        {showStage && (
          <div style={{ fontSize: 10, color: meta.color.ink, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {opp.stage}
          </div>
        )}
      </div>
      {showDue && opp.due_date && (
        <LChip ink={meta.color.ink} border={meta.color.chip}>
          {formatDueRelative(opp.due_date)}
        </LChip>
      )}
      {owner && <LAvatar initials={teamMemberInitials(owner)} size={18} />}
    </div>
  );
}
