import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useOpportunities, useUpdateOpportunity } from '../../hooks/useOpportunities';
import { useTeamMembers, teamMemberInitials } from '../../hooks/useTeamMembers';
import { useTrackSettings, getStaleThreshold } from '../../hooks/useTrackSettings';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { TRACKS, findTrack, formatDueRelative, isStale, type TrackKey, type OpportunityRow } from '../../types/opportunity';
import { LCard, LBtn, LIcon, LPri, LAvatar, LH, LNote, LSelect } from '../../components/primitives';
import { PullToRefreshIndicator } from '../../components/layout/PullToRefreshIndicator';
import { colors } from '../../styles/tokens';

type Tab = 'all' | TrackKey;

type SortKey = 'newest' | 'oldest' | 'due-soon' | 'priority' | 'stale-first' | 'title';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'ใหม่สุดก่อน' },
  { value: 'oldest', label: 'เก่าสุดก่อน' },
  { value: 'due-soon', label: 'Due ใกล้ที่สุด' },
  { value: 'priority', label: 'Priority สูงก่อน' },
  { value: 'stale-first', label: 'Stale ก่อน' },
  { value: 'title', label: 'ชื่อ A–Z' },
];

const PRIORITY_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

function sortOpps(
  opps: OpportunityRow[],
  sort: SortKey,
  trackSettings: ReturnType<typeof useTrackSettings>['data'] extends infer T ? T : never,
): OpportunityRow[] {
  const arr = [...opps];
  const cmp: Record<SortKey, (a: OpportunityRow, b: OpportunityRow) => number> = {
    newest: (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''),
    oldest: (a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''),
    'due-soon': (a, b) => {
      // null due dates go to the end
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    },
    priority: (a, b) =>
      (PRIORITY_RANK[b.priority ?? 'Low'] ?? 0) - (PRIORITY_RANK[a.priority ?? 'Low'] ?? 0),
    'stale-first': (a, b) => {
      const aStale = isStale(a, getStaleThreshold(trackSettings ?? [], a.track as TrackKey)) ? 1 : 0;
      const bStale = isStale(b, getStaleThreshold(trackSettings ?? [], b.track as TrackKey)) ? 1 : 0;
      return bStale - aStale;
    },
    title: (a, b) => a.title.localeCompare(b.title, 'th'),
  };
  arr.sort(cmp[sort]);
  return arr;
}

export function InboxPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data: opps = [], isLoading } = useOpportunities();
  const { data: team = [] } = useTeamMembers();
  const { data: trackSettings = [] } = useTrackSettings();
  const update = useUpdateOpportunity();
  const [tab, setTab] = useState<Tab>('all');
  const [dragOverTrack, setDragOverTrack] = useState<TrackKey | null>(null);
  const [sort, setSort] = useState<SortKey>('newest');
  const [groupByStage, setGroupByStage] = useState(true);

  // Pull-to-refresh on mobile
  const ptr = usePullToRefresh(
    async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['opportunities'] }),
        qc.invalidateQueries({ queryKey: ['track-settings'] }),
        qc.invalidateQueries({ queryKey: ['team-members'] }),
      ]);
    },
    { disabled: !isMobile },
  );

  const handleDropOn = (newTrack: TrackKey, oppId: string) => {
    setDragOverTrack(null);
    const opp = opps.find((o) => o.id === oppId);
    if (!opp || opp.track === newTrack) return;
    // Move to new track → reset stage to that track's default
    const newStage = findTrack(newTrack).defaultStage;
    update.mutate({ id: oppId, patch: { track: newTrack, stage: newStage } });
  };

  const teamById = useMemo(() => {
    const m: Record<string, typeof team[0]> = {};
    for (const t of team) m[t.id] = t;
    return m;
  }, [team]);

  const oppsByTrack = useMemo(() => {
    const m: Record<TrackKey, OpportunityRow[]> = {
      apply: [],
      act: [],
      watch: [],
      contract: [],
      event: [],
    };
    for (const o of opps) m[o.track as TrackKey]?.push(o);
    // Apply sort to each track
    for (const k of Object.keys(m) as TrackKey[]) {
      m[k] = sortOpps(m[k], sort, trackSettings);
    }
    return m;
  }, [opps, sort, trackSettings]);

  const filtered = tab === 'all' ? sortOpps(opps, sort, trackSettings) : oppsByTrack[tab];

  // For single-track view: group by stage
  const stagedGroups = useMemo(() => {
    if (tab === 'all' || !groupByStage) return null;
    const track = findTrack(tab);
    const groups: { stage: string; items: OpportunityRow[] }[] = track.stages.map((stage) => ({
      stage,
      items: [],
    }));
    const unknown: OpportunityRow[] = [];
    for (const o of filtered) {
      const g = groups.find((x) => x.stage === o.stage);
      if (g) g.items.push(o);
      else unknown.push(o);
    }
    if (unknown.length) groups.push({ stage: 'อื่นๆ', items: unknown });
    return { track, groups };
  }, [tab, groupByStage, filtered]);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1680, margin: '0 auto' }}>
      <PullToRefreshIndicator distance={ptr.distance} refreshing={ptr.refreshing} ready={ptr.ready} />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <LNote>Opportunity Layer · Inbox</LNote>
          <div style={{ height: 10 }} />
          <LH level={3} sub="หน้าหลัก · 5 tracks · drag การ์ดข้าม column เพื่อเปลี่ยน track">
            INBOX
          </LH>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <LBtn ghost onClick={() => navigate('/inbox/summary')}>
            SUMMARY
          </LBtn>
          <LBtn primary onClick={() => navigate('/inbox/new')}>
            <LIcon kind="plus" size={12} color={colors.bg} /> CAPTURE
          </LBtn>
        </div>
      </div>

      {/* Track tabs — horizontally scrollable on mobile */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderBottom: `1px solid ${colors.line}`,
          marginBottom: 18,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        className="l-tabs-row"
      >
        <TabBtn
          label="ALL"
          count={opps.length}
          active={tab === 'all'}
          onClick={() => setTab('all')}
          color={colors.green}
        />
        {TRACKS.map((t) => (
          <TabBtn
            key={t.key}
            label={t.name}
            count={oppsByTrack[t.key].length}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
            color={t.color.ink}
          />
        ))}
        <span style={{ flex: 1 }} />
      </div>

      {/* Sort + group controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              color: colors.dim,
              letterSpacing: 1,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            <LIcon kind="arrow-down" size={10} color={colors.dim} /> Sort
          </span>
          <div style={{ minWidth: 160 }}>
            <LSelect
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        {tab !== 'all' && (
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontSize: 11.5,
              color: colors.dimSoft,
              letterSpacing: 0.3,
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={groupByStage}
              onChange={(e) => setGroupByStage(e.target.checked)}
              style={{ accentColor: colors.green, cursor: 'pointer' }}
            />
            Group by stage
          </label>
        )}

        <span style={{ flex: 1 }} />
        <span
          className="l-hide-mobile"
          style={{ color: colors.dim, fontSize: 11, letterSpacing: 0.5, whiteSpace: 'nowrap' }}
        >
          {filtered.length} items · BI-WEEKLY REVIEW · NEXT TUE
        </span>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>
      ) : tab === 'all' ? (
        /* All-tracks kanban: 5-col grid on desktop, horizontal snap-scroll on mobile */
        <div
          className={isMobile ? 'l-scroll-x' : undefined}
          style={
            isMobile
              ? {
                  display: 'flex',
                  gap: 12,
                  paddingBottom: 8,
                  marginLeft: -14,
                  marginRight: -14,
                  paddingLeft: 14,
                  paddingRight: 14,
                }
              : {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                  gap: 12,
                }
          }
        >
          {TRACKS.map((t) => (
            <div
              key={t.key}
              style={
                isMobile
                  ? { flex: '0 0 85vw', maxWidth: 360, minWidth: 0 }
                  : { minWidth: 0 }
              }
            >
              <TrackColumn
                track={t.key}
                opps={oppsByTrack[t.key]}
                teamById={teamById}
                staleThreshold={getStaleThreshold(trackSettings, t.key)}
                onCardClick={(id) => navigate(`/inbox/${id}`)}
                onAddClick={() => navigate(`/inbox/new?track=${t.key}`)}
                isDragOver={dragOverTrack === t.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverTrack(t.key);
                }}
                onDragLeave={() => {
                  if (dragOverTrack === t.key) setDragOverTrack(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/opportunity-id');
                  if (id) handleDropOn(t.key, id);
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Single-track list — with optional stage grouping */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {filtered.length === 0 ? (
            <LCard padding={40}>
              <div style={{ textAlign: 'center', color: colors.dim, fontSize: 13 }}>
                ยังไม่มี opportunity ใน track นี้
              </div>
              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <LBtn primary onClick={() => navigate(`/inbox/new?track=${tab}`)}>
                  <LIcon kind="plus" size={11} color={colors.bg} /> CAPTURE
                </LBtn>
              </div>
            </LCard>
          ) : stagedGroups ? (
            // Grouped by stage
            stagedGroups.groups
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <StageSection
                  key={g.stage}
                  stage={g.stage}
                  trackInk={stagedGroups.track.color.ink}
                  trackSoft={stagedGroups.track.color.soft}
                  items={g.items}
                  teamById={teamById}
                  staleThreshold={getStaleThreshold(trackSettings, tab as TrackKey)}
                  onCardClick={(id) => navigate(`/inbox/${id}`)}
                />
              ))
          ) : (
            // Flat list
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((o) => (
                <OpportunityCard
                  key={o.id}
                  opp={o}
                  teamById={teamById}
                  staleThreshold={getStaleThreshold(trackSettings, o.track as TrackKey)}
                  onClick={() => navigate(`/inbox/${o.id}`)}
                  wide
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StageSection({
  stage,
  trackInk,
  trackSoft,
  items,
  teamById,
  staleThreshold,
  onCardClick,
}: {
  stage: string;
  trackInk: string;
  trackSoft: string;
  items: OpportunityRow[];
  teamById: Record<string, ReturnType<typeof useTeamMembers>['data'] extends (infer T)[] | undefined ? T : never>;
  staleThreshold: number | null;
  onCardClick: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '8px 12px',
          background: trackSoft,
          border: `1px solid ${trackInk}40`,
          borderRadius: '10px 0 10px 0',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          marginBottom: 8,
        }}
      >
        <span style={{ width: 8, height: 8, background: trackInk, borderRadius: 99 }} />
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: trackInk,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {stage}
        </span>
        <span style={{ fontSize: 11, color: colors.dimSoft, fontFamily: "'IBM Plex Mono', monospace" }}>
          · {items.length}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ color: colors.dim, transition: 'transform 150ms', transform: collapsed ? 'rotate(-90deg)' : 'none' }}>
          <LIcon kind="arrow-down" size={11} color={colors.dim} />
        </span>
      </button>
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((o) => (
            <OpportunityCard
              key={o.id}
              opp={o}
              teamById={teamById}
              staleThreshold={staleThreshold}
              onClick={() => onCardClick(o.id)}
              wide
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '12px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? color : 'transparent'}`,
        color: active ? colors.text : colors.dimSoft,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ width: 7, height: 7, background: color, borderRadius: 99 }} />
      {label}
      <span style={{ fontSize: 10.5, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>{count}</span>
    </button>
  );
}

function TrackColumn({
  track,
  opps,
  teamById,
  staleThreshold,
  onCardClick,
  onAddClick,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  track: TrackKey;
  opps: OpportunityRow[];
  teamById: Record<string, ReturnType<typeof useTeamMembers>['data'] extends (infer T)[] | undefined ? T : never>;
  staleThreshold: number | null;
  onCardClick: (id: string) => void;
  onAddClick: () => void;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const meta = findTrack(track);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 0,
        background: isDragOver ? meta.color.soft : 'transparent',
        border: `1px dashed ${isDragOver ? meta.color.ink : 'transparent'}`,
        borderRadius: '14px 0 14px 0',
        padding: 4,
        margin: -4,
        transition: 'background 100ms',
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column header */}
      <div
        style={{
          padding: '10px 12px',
          background: meta.color.soft,
          border: `1px solid ${meta.color.chip}`,
          borderRadius: '12px 0 12px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: meta.color.ink,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
            }}
          >
            {meta.name}
          </span>
          <span style={{ fontSize: 11.5, color: colors.dimSoft, fontFamily: "'IBM Plex Mono', monospace" }}>
            {opps.length}
          </span>
        </div>
        <div style={{ fontSize: 10, color: colors.dimSoft, marginTop: 3, letterSpacing: 0.3 }}>{meta.cadence}</div>
      </div>

      {/* Lifecycle micro-bar */}
      <div style={{ display: 'flex', gap: 2 }}>
        {meta.stages.slice(0, 5).map((s) => {
          const filled = opps.some((o) => meta.stages.indexOf(o.stage) >= meta.stages.indexOf(s));
          return (
            <span
              key={s}
              title={s}
              style={{
                flex: 1,
                height: 4,
                background: filled ? meta.color.ink : 'transparent',
                border: `1px solid ${meta.color.chip}`,
                opacity: filled ? 0.9 : 0.3,
              }}
            />
          );
        })}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200 }}>
        {opps.map((o) => (
          <OpportunityCard key={o.id} opp={o} teamById={teamById} staleThreshold={staleThreshold} onClick={() => onCardClick(o.id)} />
        ))}
        <button
          type="button"
          onClick={onAddClick}
          style={{
            padding: 10,
            background: 'transparent',
            border: `1px dashed ${colors.line}`,
            color: colors.dim,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            borderRadius: '12px 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'color 150ms, border-color 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = meta.color.ink;
            e.currentTarget.style.borderColor = meta.color.chip;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.dim;
            e.currentTarget.style.borderColor = colors.line;
          }}
        >
          <LIcon kind="plus" size={10} color="currentColor" />
          new {meta.name}
        </button>
      </div>
    </div>
  );
}

function OpportunityCard({
  opp,
  teamById,
  staleThreshold,
  onClick,
  wide = false,
}: {
  opp: OpportunityRow;
  teamById: Record<string, ReturnType<typeof useTeamMembers>['data'] extends (infer T)[] | undefined ? T : never>;
  staleThreshold: number | null;
  onClick: () => void;
  wide?: boolean;
}) {
  const meta = findTrack(opp.track);
  const owner = opp.owner_id ? teamById[opp.owner_id] : null;
  const reviewer = opp.reviewer_id ? teamById[opp.reviewer_id] : null;
  const stale = isStale(opp, staleThreshold);
  const pri = opp.priority === 'High' ? 'hi' : opp.priority === 'Medium' ? 'med' : 'low';

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/opportunity-id', opp.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      style={{
        padding: 12,
        background: colors.bgCard,
        border: `1px solid ${stale ? '#5a1a18' : colors.lineHi}`,
        borderRadius: '14px 0 14px 0',
        cursor: 'grab',
        transition: 'border-color 150ms',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!stale) e.currentTarget.style.borderColor = meta.color.chip;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = stale ? '#5a1a18' : colors.lineHi;
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <LPri level={pri as 'hi' | 'med' | 'low'} />
        <span
          style={{
            fontSize: 10,
            color: meta.color.ink,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {opp.stage}
        </span>
        {stale && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: '#d96a66',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            STALE
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: wide ? 14.5 : 13,
          lineHeight: 1.3,
          color: colors.text,
          marginBottom: 8,
          fontWeight: 500,
          display: '-webkit-box',
          WebkitLineClamp: wide ? 3 : 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {opp.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            color: colors.dimSoft,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <LIcon
            kind={opp.track === 'event' ? 'cal' : opp.track === 'contract' ? 'money' : opp.track === 'apply' ? 'doc' : 'clock'}
            size={11}
            color={colors.dimSoft}
          />
          {formatDueRelative(opp.due_date)}
        </span>
        <span style={{ display: 'inline-flex', gap: 3 }}>
          {owner && <LAvatar initials={teamMemberInitials(owner)} size={20} />}
          {reviewer && opp.track !== 'watch' && (
            <LAvatar initials={teamMemberInitials(reviewer)} size={20} color={meta.color.ink} />
          )}
        </span>
      </div>
    </div>
  );
}
