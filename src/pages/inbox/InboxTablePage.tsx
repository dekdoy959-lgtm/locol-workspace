import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOpportunities } from '../../hooks/useOpportunities';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useAllOpportunityTeam, type TeamRole, type TeamAssignmentRow } from '../../hooks/useOpportunityTeam';
import { useAllOpportunityPeople } from '../../hooks/useOpportunityPeople';
import { useContacts } from '../../hooks/useContacts';
import { useOrganizations } from '../../hooks/useOrganizations';
import { contactDisplayName, type ContactRow } from '../../types/contact';
import { TRACKS, findTrack, type TrackKey, type OpportunityRow } from '../../types/opportunity';
import { LCard, LH, LBtn, LIcon, LNote, LInput, LSelect } from '../../components/primitives';
import { colors } from '../../styles/tokens';
import { todayLocalISO } from '../../lib/dateUtil';
import type { OppPersonRow } from '../../types/opportunityPeople';

interface SummaryRow {
  opp: OpportunityRow;
  organizers: string[]; // names of external organizers (from opportunity_people)
  docLeads: string[];
  coordinators: string[];
  travelers: string[];
  owners: string[];
  reviewers: string[];
  // Dates extracted from details
  openDate: string | null;
  closeDate: string | null;
  docDueDate: string | null;
  announcementDate: string | null;
  eventDate: string | null;
}

type SortField = 'title' | 'track' | 'stage' | 'priority' | 'dueDate' | 'eventDate' | 'created';
type SortDir = 'asc' | 'desc';

function buildSummaryRows(
  opps: OpportunityRow[],
  teamAssignments: TeamAssignmentRow[],
  oppPeople: OppPersonRow[],
  teamById: Record<string, { full_name: string | null; email: string } | undefined>,
  contactById: Record<string, ContactRow | undefined>,
  orgById: Record<string, { name: string } | undefined>,
): SummaryRow[] {
  // Group team assignments by opp
  const teamByOpp = new Map<string, TeamAssignmentRow[]>();
  for (const a of teamAssignments) {
    const arr = teamByOpp.get(a.opportunity_id) ?? [];
    arr.push(a);
    teamByOpp.set(a.opportunity_id, arr);
  }
  // Group people by opp
  const peopleByOpp = new Map<string, OppPersonRow[]>();
  for (const p of oppPeople) {
    const arr = peopleByOpp.get(p.opportunity_id) ?? [];
    arr.push(p);
    peopleByOpp.set(p.opportunity_id, arr);
  }

  const memberName = (id: string) => {
    const m = teamById[id];
    if (!m) return '?';
    return m.full_name ?? m.email.split('@')[0];
  };
  const personName = (p: OppPersonRow): string => {
    if (p.contact_id) return contactById[p.contact_id] ? contactDisplayName(contactById[p.contact_id]!) : '?';
    if (p.org_id) return orgById[p.org_id]?.name ?? '?';
    return '?';
  };

  return opps
    .filter((o) => !o.archived_at)
    .map((opp) => {
      const team = teamByOpp.get(opp.id) ?? [];
      const people = peopleByOpp.get(opp.id) ?? [];

      const byRole = (role: TeamRole) => team.filter((t) => t.role === role).map((t) => memberName(t.team_member_id));

      const organizers = people.filter((p) => p.role === 'organizer').map(personName);

      const details = (opp.details ?? {}) as Record<string, unknown>;
      const asStr = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

      // Pull all date fields (different tracks have different ones)
      const openDate = asStr(details.registration_open) ?? opp.created_at.slice(0, 10);
      const closeDate = asStr(details.registration_deadline);
      const docDueDate = asStr(details.application_deadline) ?? opp.due_date;
      const announcementDate = asStr(details.decision_date);
      const eventDate =
        asStr(details.event_date_start) ??
        asStr(details.trip_date_start) ??
        asStr(details.effective_date);

      return {
        opp,
        organizers,
        docLeads: byRole('document_lead'),
        coordinators: byRole('coordinator'),
        travelers: byRole('traveler'),
        owners: opp.owner_id ? [memberName(opp.owner_id)] : byRole('owner'),
        reviewers: opp.reviewer_id ? [memberName(opp.reviewer_id)] : byRole('reviewer'),
        openDate,
        closeDate,
        docDueDate,
        announcementDate,
        eventDate,
      };
    });
}

// ─── CSV export ──────────────────────────────────────────────────────
function rowsToCSV(rows: SummaryRow[]): string {
  const header = [
    'Title',
    'Track',
    'Stage',
    'Status',
    'Priority',
    'Owner',
    'Reviewer',
    'ผู้จัด',
    'Document Lead',
    'Coordinator',
    'Traveler',
    'Open Date',
    'Close Date',
    'Doc Due',
    'Announcement',
    'Event/Trip Date',
    'Created',
  ];
  const escape = (v: string | null | undefined) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    const t = findTrack(r.opp.track as TrackKey);
    lines.push(
      [
        escape(r.opp.title),
        escape(t.name),
        escape(r.opp.stage),
        escape(r.opp.status),
        escape(r.opp.priority ?? ''),
        escape(r.owners.join('; ')),
        escape(r.reviewers.join('; ')),
        escape(r.organizers.join('; ')),
        escape(r.docLeads.join('; ')),
        escape(r.coordinators.join('; ')),
        escape(r.travelers.join('; ')),
        escape(r.openDate),
        escape(r.closeDate),
        escape(r.docDueDate),
        escape(r.announcementDate),
        escape(r.eventDate),
        escape(r.opp.created_at.slice(0, 10)),
      ].join(','),
    );
  }
  return lines.join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Page ────────────────────────────────────────────────────────────
export function InboxTablePage() {
  const navigate = useNavigate();
  const { data: opps = [] } = useOpportunities();
  const { data: team = [] } = useTeamMembers();
  const { data: assignments = [] } = useAllOpportunityTeam();
  const { data: people = [] } = useAllOpportunityPeople();
  const { data: contacts = [] } = useContacts();
  const { data: orgs = [] } = useOrganizations();

  const teamById = useMemo(() => Object.fromEntries(team.map((t) => [t.id, t])), [team]);
  const contactById = useMemo(() => Object.fromEntries(contacts.map((c) => [c.id, c])), [contacts]);
  const orgById = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);

  const allRows = useMemo(
    () => buildSummaryRows(opps, assignments, people, teamById, contactById, orgById),
    [opps, assignments, people, teamById, contactById, orgById],
  );

  // Filters
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState<'all' | TrackKey>('all');
  const [sortField, setSortField] = useState<SortField>('eventDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  // Client-side pagination (#26) — render in pages of 50.
  const PAGE = 50;
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(() => {
    let result = allRows;
    if (trackFilter !== 'all') result = result.filter((r) => r.opp.track === trackFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => {
        const hay = [
          r.opp.title,
          ...r.organizers,
          ...r.docLeads,
          ...r.coordinators,
          ...r.travelers,
          ...r.owners,
          r.opp.stage,
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title': cmp = a.opp.title.localeCompare(b.opp.title, 'th'); break;
        case 'track': cmp = a.opp.track.localeCompare(b.opp.track); break;
        case 'stage': cmp = a.opp.stage.localeCompare(b.opp.stage); break;
        case 'priority':
          {
            const rank = { High: 3, Medium: 2, Low: 1 } as Record<string, number>;
            cmp = (rank[b.opp.priority ?? ''] ?? 0) - (rank[a.opp.priority ?? ''] ?? 0);
            // priority always wants High first → invert for asc
            if (sortDir === 'asc') cmp = -cmp;
          }
          return cmp;
        case 'dueDate':
          cmp = (a.opp.due_date ?? 'zzz').localeCompare(b.opp.due_date ?? 'zzz'); break;
        case 'eventDate':
          cmp = (a.eventDate ?? 'zzz').localeCompare(b.eventDate ?? 'zzz'); break;
        case 'created':
          cmp = a.opp.created_at.localeCompare(b.opp.created_at); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [allRows, trackFilter, search, sortField, sortDir]);

  useEffect(() => setVisible(PAGE), [trackFilter, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleExport = () => {
    const csv = rowsToCSV(filtered);
    // Include time so multiple exports on the same day don't collide.
    const hhmmss = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    const filename = `locol-summary-${todayLocalISO()}-${hhmmss}.csv`;
    downloadCSV(csv, filename);
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '100%', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <LNote>Summary · Tabular view</LNote>
          <div style={{ height: 10 }} />
          <LH level={3} sub="ทุก opportunity ในรูปแบบตาราง · sortable · CSV export · เหมาะกับ overview ทีม">
            SUMMARY TABLE
          </LH>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <LBtn ghost onClick={() => navigate('/inbox')}>
            <LIcon kind="arrow-r" size={11} color={colors.dimSoft} /> KANBAN VIEW
          </LBtn>
          <LBtn ghost onClick={() => navigate('/inbox/summary')}>
            <LIcon kind="arrow-r" size={11} color={colors.dimSoft} /> CARDS VIEW
          </LBtn>
          <LBtn primary onClick={handleExport}>
            <LIcon kind="arrow-down" size={11} color={colors.bg} /> EXPORT CSV
          </LBtn>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 240, flex: 1, maxWidth: 360, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <LIcon kind="search" size={12} color={colors.dim} />
          </span>
          <LInput
            value={search}
            onChange={setSearch}
            placeholder="ค้นหา title · คน · stage"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <LSelect
            value={trackFilter}
            onChange={(v) => setTrackFilter(v as 'all' | TrackKey)}
            options={[
              { value: 'all', label: 'ทุก track' },
              ...TRACKS.map((t) => ({ value: t.key, label: `${t.name} · ${t.nameEn}` })),
            ]}
          />
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: colors.dim, letterSpacing: 0.5 }}>
          {filtered.length} / {allRows.length} items
        </span>
      </div>

      {/* Table */}
      <LCard padding={0}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1400 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.line}`, background: colors.bgSoft }}>
                <Th sortKey="title" current={sortField} dir={sortDir} onSort={toggleSort}>Title</Th>
                <Th sortKey="track" current={sortField} dir={sortDir} onSort={toggleSort}>Track</Th>
                <Th sortKey="stage" current={sortField} dir={sortDir} onSort={toggleSort}>Stage</Th>
                <Th sortKey="priority" current={sortField} dir={sortDir} onSort={toggleSort}>Pri</Th>
                <Th>Owner</Th>
                <Th>👑 Reviewer</Th>
                <Th><LIcon kind="doc" size={10} color={colors.dim} /> ผู้จัด</Th>
                <Th>📝 ผู้ทำเอกสาร</Th>
                <Th>🤝 ผู้ประสาน</Th>
                <Th><LIcon kind="plane" size={10} color={colors.dim} /> ผู้ไป</Th>
                <Th>เปิดรับ</Th>
                <Th>ปิดรับ</Th>
                <Th>ส่งเอกสาร</Th>
                <Th>ประกาศผล</Th>
                <Th sortKey="eventDate" current={sortField} dir={sortDir} onSort={toggleSort}>วันที่ไป/งาน</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={15} style={{ padding: 40, textAlign: 'center', color: colors.dim }}>
                    ไม่พบ items ตามที่ filter
                  </td>
                </tr>
              )}
              {filtered.slice(0, visible).map((r) => {
                const t = findTrack(r.opp.track as TrackKey);
                return (
                  <tr
                    key={r.opp.id}
                    onClick={() => navigate(`/inbox/${r.opp.id}`)}
                    style={{
                      borderBottom: `1px solid ${colors.line}`,
                      cursor: 'pointer',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgSoft)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle({ minWidth: 220, maxWidth: 320 })}>
                      <div style={{ fontWeight: 500, color: colors.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {r.opp.title}
                      </div>
                    </td>
                    <td style={tdStyle()}>
                      <span
                        style={{
                          fontSize: 10.5,
                          color: t.color.ink,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          padding: '2px 7px',
                          background: t.color.soft,
                          border: `1px solid ${t.color.chip}`,
                          borderRadius: '4px 1px 4px 1px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.name}
                      </span>
                    </td>
                    <td style={tdStyle()}>
                      <span style={{ color: colors.dimSoft }}>{r.opp.stage}</span>
                    </td>
                    <td style={tdStyle()}>
                      <PriorityChip pri={r.opp.priority} />
                    </td>
                    <td style={tdStyle()}><PeopleList names={r.owners} /></td>
                    <td style={tdStyle()}><PeopleList names={r.reviewers} /></td>
                    <td style={tdStyle()}><PeopleList names={r.organizers} /></td>
                    <td style={tdStyle()}><PeopleList names={r.docLeads} /></td>
                    <td style={tdStyle()}><PeopleList names={r.coordinators} /></td>
                    <td style={tdStyle()}><PeopleList names={r.travelers} highlight /></td>
                    <td style={tdStyle()}><DateCell date={r.openDate} /></td>
                    <td style={tdStyle()}><DateCell date={r.closeDate} accent={colors.warn} /></td>
                    <td style={tdStyle()}><DateCell date={r.docDueDate} accent={colors.warn} /></td>
                    <td style={tdStyle()}><DateCell date={r.announcementDate} accent={colors.olive} /></td>
                    <td style={tdStyle()}><DateCell date={r.eventDate} accent={colors.danger} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > visible && (
          <div style={{ padding: 14, textAlign: 'center', borderTop: `1px solid ${colors.line}` }}>
            <LBtn ghost onClick={() => setVisible((v) => v + PAGE)}>
              แสดงเพิ่ม · เหลืออีก {filtered.length - visible}
            </LBtn>
          </div>
        )}
      </LCard>

      <div style={{ marginTop: 12, fontSize: 11, color: colors.dim }}>
        💡 คลิก column header เพื่อ sort · คลิก row เพื่อเปิด detail · ปุ่ม EXPORT CSV ดาวน์โหลดข้อมูลที่กรอง ({filtered.length} rows)
      </div>
    </div>
  );
}

// ─── Cell helpers ────────────────────────────────────────────────────

function tdStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: '8px 10px',
    verticalAlign: 'top',
    fontSize: 12,
    ...extra,
  };
}

function Th({
  children,
  sortKey,
  current,
  dir,
  onSort,
}: {
  children: React.ReactNode;
  sortKey?: SortField;
  current?: SortField;
  dir?: SortDir;
  onSort?: (k: SortField) => void;
}) {
  const sortable = !!sortKey && !!onSort;
  const active = sortable && current === sortKey;
  return (
    <th
      onClick={sortable && sortKey ? () => onSort!(sortKey) : undefined}
      style={{
        padding: '10px',
        textAlign: 'left',
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: active ? colors.green : colors.dim,
        whiteSpace: 'nowrap',
        cursor: sortable ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {children}
      {active && <span style={{ marginLeft: 4 }}>{dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}

function PeopleList({ names, highlight = false }: { names: string[]; highlight?: boolean }) {
  if (names.length === 0) return <span style={{ color: colors.dim, opacity: 0.5 }}>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {names.map((n, i) => (
        <span
          key={i}
          style={{
            color: highlight ? colors.danger : colors.surface,
            fontWeight: highlight ? 600 : 400,
            fontSize: 11.5,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 140,
          }}
        >
          {n}
        </span>
      ))}
    </div>
  );
}

function DateCell({ date, accent }: { date: string | null; accent?: string }) {
  if (!date) return <span style={{ color: colors.dim, opacity: 0.5 }}>—</span>;
  const d = new Date(date);
  const short = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  const yr = d.getFullYear() % 100;
  return (
    <span style={{ color: accent ?? colors.surface, fontWeight: 500, whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
      {short} '{String(yr).padStart(2, '0')}
    </span>
  );
}

function PriorityChip({ pri }: { pri: string | null }) {
  if (!pri) return <span style={{ color: colors.dim, opacity: 0.5 }}>—</span>;
  const colorMap: Record<string, string> = {
    High: colors.danger,
    Medium: colors.warn,
    Low: colors.dim,
  };
  return (
    <span
      title={pri}
      style={{
        fontSize: 10.5,
        color: colorMap[pri] ?? colors.dim,
        fontWeight: 700,
        letterSpacing: 0.4,
      }}
    >
      {pri[0]}
    </span>
  );
}
