import { useNavigate, useParams } from 'react-router-dom';
import { useOpportunity, useUpdateOpportunity } from '../../hooks/useOpportunities';
import { useTeamMembers, teamMemberDisplayName, teamMemberInitials } from '../../hooks/useTeamMembers';
import { useTrackSettings, getStaleThreshold } from '../../hooks/useTrackSettings';
import { useAuth } from '../../contexts/AuthContext';
import {
  findTrack,
  formatDueRelative,
  isStale,
  type TrackKey,
} from '../../types/opportunity';
import { LCard, LH, LBtn, LChip, LField, LIcon, LNote, LAvatar, LSelect } from '../../components/primitives';
import { NoteComposer } from '../../components/notes/NoteComposer';
import { Timeline } from '../../components/notes/Timeline';
import { OpportunityPeopleSection } from '../../components/opportunities/OpportunityPeopleSection';
import { OpportunityDetailsView } from '../../components/opportunities/OpportunityDetailsView';
import { colors } from '../../styles/tokens';

export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: opp, isLoading } = useOpportunity(id);
  const { data: team = [] } = useTeamMembers();
  const { data: trackSettings = [] } = useTrackSettings();
  const { user } = useAuth();
  const update = useUpdateOpportunity();

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>;
  }

  if (!opp) {
    return (
      <div style={{ padding: 40 }}>
        <LCard padding={24} bg="#241010" border="#5a1a18">
          <div style={{ color: '#d96a66', marginBottom: 16 }}>ไม่พบ opportunity</div>
          <LBtn ghost onClick={() => navigate('/inbox')}>← กลับ</LBtn>
        </LCard>
      </div>
    );
  }

  const meta = findTrack(opp.track as TrackKey);
  const teamById = Object.fromEntries(team.map((m) => [m.id, m]));
  const owner = opp.owner_id ? teamById[opp.owner_id] : null;
  const reviewer = opp.reviewer_id ? teamById[opp.reviewer_id] : null;
  const staleThreshold = getStaleThreshold(trackSettings, opp.track as TrackKey);
  const stale = isStale(opp, staleThreshold);

  const ageDays = Math.floor((Date.now() - new Date(opp.last_update_at).getTime()) / (1000 * 60 * 60 * 24));

  const handleStageChange = (newStage: string) => {
    update.mutate({ id: opp.id, patch: { stage: newStage } });
  };

  const handleArchive = () => {
    if (!confirm('Archive opportunity นี้?')) return;
    update.mutate({
      id: opp.id,
      patch: { archived_at: new Date().toISOString(), archived_reason: 'Archived from detail' },
    });
    navigate('/inbox');
  };

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1400, margin: '0 auto' }}>
      <button
        onClick={() => navigate('/inbox')}
        style={{
          background: 'transparent',
          border: 'none',
          color: colors.dim,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 11.5,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          padding: 0,
          marginBottom: 18,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <LIcon kind="arrow-r" size={11} color={colors.dim} /> Inbox
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 24 }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Header */}
          <LCard padding={24}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <LChip ink={meta.color.ink} bg={meta.color.soft} border={meta.color.chip} big>
                {meta.name.toUpperCase()}
              </LChip>
              <LChip ink={colors.surface}>{opp.status}</LChip>
              {opp.priority && (
                <LChip
                  ink={opp.priority === 'High' ? '#d96a66' : colors.dimSoft}
                  bg={opp.priority === 'High' ? '#241010' : 'transparent'}
                  border={opp.priority === 'High' ? '#5a1a18' : colors.lineHi}
                >
                  <LIcon
                    kind="flag"
                    size={10}
                    color={opp.priority === 'High' ? '#d96a66' : colors.dimSoft}
                  />
                  {opp.priority.toUpperCase()}
                </LChip>
              )}
              {stale && (
                <LChip ink="#d96a66" bg="#241010" border="#5a1a18">
                  STALE {ageDays}d
                </LChip>
              )}
            </div>

            <div
              style={{
                fontWeight: 700,
                fontSize: 32,
                lineHeight: 1.1,
                letterSpacing: -0.5,
                color: colors.text,
                marginBottom: 10,
                textTransform: 'uppercase',
              }}
            >
              {opp.title}
            </div>

            {opp.source_url && (
              <div style={{ fontSize: 12.5, color: colors.dimSoft, marginBottom: 18, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <LIcon kind="link" size={11} color={colors.dimSoft} />
                <a
                  href={opp.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: colors.dimSoft, textDecoration: 'underline' }}
                >
                  {opp.source_url.replace(/^https?:\/\//, '').slice(0, 60)}
                </a>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <LBtn primary onClick={() => navigate(`/inbox/${opp.id}/edit`)}>
                แก้ไข
              </LBtn>
              <LBtn ghost onClick={handleArchive}>
                ARCHIVE
              </LBtn>
            </div>
          </LCard>

          {/* AI Summary */}
          {opp.ai_summary && (
            <LCard padding={20} style={{ borderLeft: `3px solid ${colors.green}` }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  color: colors.green,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                AI SUMMARY
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: colors.surface, lineHeight: 1.55 }}>
                {opp.ai_summary}
              </p>
            </LCard>
          )}

          {/* Per-track details */}
          <LCard padding={20}>
            <LH
              level={5}
              accent={false}
              color={colors.green}
              sub={`ข้อมูลเฉพาะ ${meta.name} track`}
            >
              {meta.name.toUpperCase()} DETAILS
            </LH>
            <div style={{ height: 8 }} />
            <OpportunityDetailsView track={opp.track as TrackKey} details={opp.details} />
          </LCard>

          {/* People (Organizers + Attendees) */}
          <LCard padding={20}>
            <LH
              level={5}
              accent={false}
              color={colors.green}
              sub="Organizers (คนจัด) + Attendees (ผู้เข้าร่วม) ต่อ Contact หรือ Org · ใส่ได้หลายคน"
            >
              PEOPLE
            </LH>
            <div style={{ height: 8 }} />
            <OpportunityPeopleSection opportunityId={opp.id} />
          </LCard>

          {/* Notes + Timeline */}
          <LCard padding={20}>
            <LH
              level={5}
              accent={false}
              color={colors.green}
              sub="Notes บนตัว opportunity นี้"
            >
              NOTES &amp; TIMELINE
            </LH>
            <div style={{ marginBottom: 18 }}>
              <NoteComposer scope="opportunity" targetId={opp.id} currentUserId={user?.id} />
            </div>
            <Timeline scope="opportunity" targetId={opp.id} />
          </LCard>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <LCard padding={22}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <LNote>RECORD</LNote>
              <span style={{ fontSize: 10.5, color: colors.dim, letterSpacing: 0.8 }}>
                อัปเดต {ageDays}d ago
              </span>
            </div>

            {/* Stage inline editor */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 10,
                  color: colors.dim,
                  letterSpacing: 1.1,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Stage
              </div>
              <LSelect
                value={opp.stage}
                onChange={handleStageChange}
                options={meta.stages.map((s) => ({ value: s, label: s }))}
              />
              <div style={{ fontSize: 10, color: colors.dim, marginTop: 4, letterSpacing: 0.3 }}>
                เปลี่ยน stage = update timestamp อัตโนมัติ
              </div>
            </div>

            <LField label="Due Date" value={opp.due_date ? `${opp.due_date} (${formatDueRelative(opp.due_date)})` : undefined} />
            <LField label="Priority" value={opp.priority ?? undefined} />
            <LField label="Track" value={meta.name} />

            <div style={{ height: 8, borderBottom: `1px solid ${colors.line}`, marginBottom: 14 }} />

            <div
              style={{
                fontSize: 10,
                color: colors.dim,
                letterSpacing: 1.1,
                textTransform: 'uppercase',
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              Team
            </div>
            {owner && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <LAvatar initials={teamMemberInitials(owner)} size={26} ring />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
                    {teamMemberDisplayName(owner)}
                  </div>
                  <div style={{ fontSize: 10, color: colors.green, letterSpacing: 0.5 }}>OWNER</div>
                </div>
              </div>
            )}
            {reviewer && opp.track !== 'watch' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LAvatar initials={teamMemberInitials(reviewer)} size={26} color={meta.color.ink} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
                    {teamMemberDisplayName(reviewer)}
                  </div>
                  <div style={{ fontSize: 10, color: meta.color.ink, letterSpacing: 0.5 }}>REVIEWER</div>
                </div>
              </div>
            )}
            {!owner && !reviewer && (
              <div style={{ color: colors.dim, fontSize: 12 }}>ยังไม่ระบุทีม</div>
            )}
          </LCard>
        </div>
      </div>
    </div>
  );
}
