/**
 * Printable Brief page for an opportunity.
 *
 * Designed for Marketing team to:
 *   1. Open /inbox/:id/brief
 *   2. Click Print → save as PDF
 *   3. Share with content team / partners
 *
 * Pulls all the marketing-relevant fields (agenda, goals, ideas, shot list,
 * social plan, hashtags, credit, etc.) + people assignments + (for trips)
 * the full itinerary table.
 *
 * Print styles hide navigation chrome.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useOpportunity } from '../../hooks/useOpportunities';
import { useTripStops, groupStopsByDay, STOP_TYPE_META, type StopType } from '../../hooks/useTripStops';
import { useOpportunityTeam, TEAM_ROLE_META, type TeamRole } from '../../hooks/useOpportunityTeam';
import { useTeamMembers, teamMemberDisplayName } from '../../hooks/useTeamMembers';
import { findTrack, type TrackKey } from '../../types/opportunity';
import { LBtn } from '../../components/primitives';
import { colors } from '../../styles/tokens';

export function OpportunityBriefPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: opp, isLoading } = useOpportunity(id);
  const { data: stops = [] } = useTripStops(id);
  const { data: assignments = [] } = useOpportunityTeam(id);
  const { data: team = [] } = useTeamMembers();
  const teamById = Object.fromEntries(team.map((t) => [t.id, t]));

  if (isLoading) return <div style={{ padding: 40, color: colors.dim }}>กำลังโหลด…</div>;
  if (!opp) return <div style={{ padding: 40, color: colors.dim }}>ไม่พบ opportunity</div>;

  const meta = findTrack(opp.track as TrackKey);
  const details = (opp.details ?? {}) as Record<string, unknown>;
  const grouped = groupStopsByDay(stops);

  const roleNames = (role: TeamRole): string[] =>
    assignments
      .filter((a) => a.role === role && !a.trip_stop_id)
      .map((a) => teamById[a.team_member_id])
      .filter(Boolean)
      .map((m) => teamMemberDisplayName(m!));

  const v = (k: string): string => {
    const raw = details[k];
    if (raw == null) return '';
    if (typeof raw === 'string') return raw;
    return String(raw);
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .brief-no-print { display: none !important; }
          .brief-page { background: white !important; color: black !important; padding: 0 !important; max-width: none !important; }
          .brief-card { background: white !important; border-color: #ccc !important; box-shadow: none !important; }
          .brief-text { color: black !important; }
          .brief-muted { color: #555 !important; }
          .brief-divider { border-color: #ccc !important; }
          .brief-accent { color: #1a5800 !important; }
          a { color: #0066cc !important; text-decoration: underline !important; }
          h1, h2, h3 { color: black !important; page-break-after: avoid; }
          .brief-section { page-break-inside: avoid; }
          /* Keep individual itinerary rows from splitting across a page break. */
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
        @page { margin: 1.5cm; size: A4; }
      `}</style>

      <div className="brief-page" style={{ padding: '28px 36px', maxWidth: 900, margin: '0 auto', background: colors.bg, color: colors.text }}>
        {/* Toolbar (hidden when printing) */}
        <div
          className="brief-no-print"
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 20,
            paddingBottom: 14,
            borderBottom: `1px solid ${colors.line}`,
          }}
        >
          <LBtn ghost onClick={() => navigate(`/inbox/${opp.id}`)}>
            ← Back to detail
          </LBtn>
          <span style={{ flex: 1 }} />
          <LBtn primary onClick={() => window.print()}>
            🖨 Print / Save as PDF
          </LBtn>
        </div>

        {/* Header */}
        <div className="brief-section" style={{ marginBottom: 24 }}>
          <div className="brief-muted" style={{ fontSize: 12, letterSpacing: 2, color: colors.dim, textTransform: 'uppercase', marginBottom: 6 }}>
            LOCOL · {meta.nameEn} BRIEF
          </div>
          <h1 className="brief-text" style={{ fontSize: 28, fontWeight: 700, color: colors.text, margin: '0 0 10px', lineHeight: 1.2 }}>
            {opp.title}
          </h1>
          <div className="brief-muted" style={{ fontSize: 13, color: colors.dimSoft, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>📂 <b style={{ color: colors.text }}>Track:</b> {meta.name}</span>
            <span>🎯 <b style={{ color: colors.text }}>Stage:</b> {opp.stage}</span>
            {opp.priority && <span>🔥 <b style={{ color: colors.text }}>Priority:</b> {opp.priority}</span>}
            {opp.due_date && <span>📅 <b style={{ color: colors.text }}>Due:</b> {opp.due_date}</span>}
          </div>
        </div>

        {/* Key dates */}
        <Section title="📅 KEY DATES">
          <KeyValueList
            items={[
              // Show only the date rows that belong to this track — avoids a
              // trip brief listing "Event date" (and the trip_date duplicating
              // the itinerary table, which is the canonical trip schedule).
              ...(opp.track === 'event'
                ? ([
                    ['วันจัดงาน · Event date', v('event_date_start') + (v('event_date_end') ? ` → ${v('event_date_end')}` : '')],
                    ['เวลา · Time', v('event_time')],
                    ['Registration deadline', v('registration_deadline')],
                  ] as [string, string][])
                : []),
              ...(opp.track === 'apply'
                ? ([
                    ['Application deadline', v('application_deadline')],
                    ['Decision date', v('decision_date')],
                    ['Effective date (สัญญา)', v('effective_date')],
                    ['Renewal date (สัญญา)', v('renewal_date')],
                  ] as [string, string][])
                : []),
              ...(opp.track === 'trip'
                ? ([['Trip start', v('trip_date_start') + (v('trip_date_end') ? ` → ${v('trip_date_end')}` : '')]] as [string, string][])
                : []),
            ].filter(([, val]) => val)}
          />
        </Section>

        {/* Place / venue */}
        <Section title="📍 PLACE / VENUE">
          <KeyValueList
            items={[
              ['Location / Venue', v('location')],
              ['Format', v('format')],
              ['Region', v('jurisdiction')],
              ['Cost per person', v('cost') ? `${v('cost')} ${v('currency') || 'THB'}` : ''],
              ['Capacity', v('capacity')],
              ['Dress code', v('dress_code')],
              ['RSVP / Register', v('rsvp_url')],
              ['Organizer', v('organizer')],
              ['Farm / สถานที่', v('farm_name')],
              ['จังหวัด', v('province')],
              ['อำเภอ / ที่อยู่', v('location_name')],
              ['Farm owner', v('farm_owner_name') + (v('farm_owner_phone') ? ` · ${v('farm_owner_phone')}` : '')],
            ].filter(([, val]) => val)}
          />
        </Section>

        {/* Team */}
        <Section title="👥 TEAM · ใครรับผิดชอบอะไร">
          <KeyValueList
            items={(['owner', 'reviewer', 'document_lead', 'coordinator', 'traveler', 'support'] as TeamRole[])
              .map((r) => [TEAM_ROLE_META[r].label, roleNames(r).join(', ')] as [string, string])
              .filter(([, val]) => val)}
          />
        </Section>

        {/* Marketing brief (event) */}
        {(opp.track === 'event' || opp.track === 'trip') && (
          <Section title="🎨 MARKETING BRIEF">
            <KeyValueList
              items={[
                ['📋 Agenda', v('agenda')],
                ['🎯 สิ่งที่ LOCOL ต้องทำ', v('locol_responsibilities')],
                ['🚀 เป้าหมาย', v('goals')],
                ['💡 Idea ที่คิดไว้', v('ideas')],
                ['⭐ สิ่งที่อยากเน้น', v('emphasis')],
                ['🎬 Storytelling angle', v('storytelling_angle')],
                ['📸 Shot list', v('shot_list')],
                ['🎨 Content assets needed', v('content_assets_needed')],
                ['📱 Social media plan', v('social_media_plan')],
                ['#️⃣ Hashtags + mentions', v('hashtags')],
                ['🙏 ต้องให้เครดิตไหม', v('credit_required')],
                ['🙏 เครดิตให้ใคร', v('credit_to')],
                ['✅ Consent status', v('consent_status')],
              ].filter((entry): entry is [string, string] => Boolean(entry[1]))}
              vertical
            />
          </Section>
        )}

        {/* Logistics (trips) */}
        {opp.track === 'trip' && (
          <Section title="🚗 LOGISTICS">
            <KeyValueList
              items={[
                ['🚗 Transport', v('transport')],
                ['🏨 ที่พัก', v('accommodation')],
                ['💰 Estimated cost', v('estimated_cost') ? `${v('estimated_cost')} ${v('currency') || 'THB'}` : ''],
                ['💵 Actual cost', v('actual_cost') ? `${v('actual_cost')} ${v('currency') || 'THB'}` : ''],
                ['🎒 Equipment list', v('equipment_list')],
                ['📝 Notes', v('notes')],
              ].filter((entry): entry is [string, string] => Boolean(entry[1]))}
              vertical
            />
          </Section>
        )}

        {/* Itinerary (trips) */}
        {opp.track === 'trip' && grouped.length > 0 && (
          <Section title="✈ ITINERARY · แผนเดินทาง">
            {grouped.map(({ date, stops: dayStops }, idx) => (
              <div key={date} className="brief-section" style={{ marginBottom: 18 }}>
                <div
                  className="brief-accent"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#9aa56a',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  DAY {idx + 1} · {new Date(date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <table
                  className="brief-card"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    background: colors.bgSoft,
                    border: `1px solid ${colors.line}`,
                  }}
                >
                  <thead>
                    <tr style={{ background: colors.bgRaise }}>
                      <Th>Time</Th>
                      <Th>Type</Th>
                      <Th>Place</Th>
                      <Th>Owner</Th>
                      <Th>Purpose</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayStops.map((s) => {
                      // Travelers assigned to this stop
                      const stopTravelers = assignments
                        .filter((a) => a.trip_stop_id === s.id)
                        .map((a) => teamById[a.team_member_id])
                        .filter(Boolean)
                        .map((m) => teamMemberDisplayName(m!));

                      const time = [s.start_time, s.end_time].filter(Boolean).join('–');
                      const place = [s.name, s.province, s.location_name].filter(Boolean).join(' · ');
                      return (
                        <tr key={s.id} style={{ borderTop: `1px solid ${colors.line}` }}>
                          <Td>{time || '—'}</Td>
                          <Td>{STOP_TYPE_META[s.stop_type as StopType]?.icon} {STOP_TYPE_META[s.stop_type as StopType]?.label ?? s.stop_type}</Td>
                          <Td>
                            <div className="brief-text" style={{ fontWeight: 600 }}>{place || '—'}</div>
                            {stopTravelers.length > 0 && (
                              <div className="brief-muted" style={{ fontSize: 11, color: '#9aa56a', marginTop: 3 }}>
                                ✈ {stopTravelers.join(', ')}
                              </div>
                            )}
                          </Td>
                          <Td>
                            {s.owner_name || '—'}
                            {s.owner_phone && (
                              <div className="brief-muted" style={{ fontSize: 11, color: colors.dimSoft }}>
                                {s.owner_phone}
                              </div>
                            )}
                          </Td>
                          <Td>{s.purpose || '—'}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </Section>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 14,
            borderTop: `1px solid ${colors.line}`,
            fontSize: 11,
            color: colors.dim,
            textAlign: 'center',
          }}
          className="brief-divider"
        >
          Generated from LOCOL Workspace · {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="brief-section" style={{ marginBottom: 24 }}>
      <h2
        className="brief-accent"
        style={{
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: colors.green,
          textTransform: 'uppercase',
          margin: '0 0 10px',
          paddingBottom: 4,
          borderBottom: `1px solid ${colors.line}`,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function KeyValueList({ items, vertical = false }: { items: (readonly [string, string] | string[])[]; vertical?: boolean }) {
  if (items.length === 0) {
    return <div className="brief-muted" style={{ fontSize: 12, color: colors.dim, fontStyle: 'italic' }}>(ยังไม่มีข้อมูล)</div>;
  }
  if (vertical) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(([k, val]) => (
          <div key={k}>
            <div className="brief-muted" style={{ fontSize: 11, color: colors.dim, letterSpacing: 0.5, marginBottom: 3 }}>{k}</div>
            <div className="brief-text" style={{ fontSize: 13, color: colors.text, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{val}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {items.map(([k, val]) => (
          <tr key={k}>
            <td
              className="brief-muted"
              style={{
                padding: '5px 12px 5px 0',
                fontSize: 12,
                color: colors.dim,
                letterSpacing: 0.4,
                verticalAlign: 'top',
                width: 220,
              }}
            >
              {k}
            </td>
            <td
              className="brief-text"
              style={{
                padding: '5px 0',
                fontSize: 13,
                color: colors.text,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.55,
              }}
            >
              {val}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="brief-muted"
      style={{
        padding: '8px 10px',
        fontSize: 10,
        fontWeight: 600,
        textAlign: 'left',
        color: colors.dim,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      className="brief-text"
      style={{
        padding: '8px 10px',
        fontSize: 12,
        color: colors.text,
        verticalAlign: 'top',
      }}
    >
      {children}
    </td>
  );
}
