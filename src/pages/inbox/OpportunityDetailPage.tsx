import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOpportunity, useUpdateOpportunity, useDuplicateOpportunity } from '../../hooks/useOpportunities';
import { useTeamMembers, teamMemberDisplayName, teamMemberInitials } from '../../hooks/useTeamMembers';
import { useTrackSettings, getStaleThreshold } from '../../hooks/useTrackSettings';
import { useDiscordInboxForOpportunity } from '../../hooks/useDiscordInbox';
import { useAuth } from '../../contexts/AuthContext';
import {
  findTrack,
  formatDueRelative,
  isStale,
  type TrackKey,
} from '../../types/opportunity';
import { LCard, LH, LBtn, LChip, LField, LIcon, LNote, LAvatar } from '../../components/primitives';
import { NoteComposer } from '../../components/notes/NoteComposer';
import { Timeline } from '../../components/notes/Timeline';
import { OpportunityPeopleSection } from '../../components/opportunities/OpportunityPeopleSection';
import { DiscordAttachment } from '../../components/discord/DiscordAttachment';
import { TeamAssignmentsSection } from '../../components/opportunities/TeamAssignmentsSection';
import { TripItinerary } from '../../components/trips/TripItinerary';
import { TripBudgetCard } from '../../components/trips/TripBudgetCard';
import { OpportunityDetailsView } from '../../components/opportunities/OpportunityDetailsView';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { colors } from '../../styles/tokens';
import { fireConfetti } from '../../lib/confetti';

export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: opp, isLoading } = useOpportunity(id);
  const { data: team = [] } = useTeamMembers();
  const { data: trackSettings = [] } = useTrackSettings();
  const { data: discordSource } = useDiscordInboxForOpportunity(id);
  const { user } = useAuth();
  const update = useUpdateOpportunity();
  const duplicate = useDuplicateOpportunity();

  const handleDuplicate = () => {
    if (!opp) return;
    const ans = window.prompt(
      `📋 Duplicate "${opp.title}"\n\n` +
        `จะคัดลอก opp + trip stops ทั้งหมด\n` +
        `ใส่ตัวเลขเพื่อเลื่อนวันที่ (กด OK = ไม่เลื่อน · ใส่ 7 = +7 วัน · ใส่ 30 = +30 วัน):`,
      '0',
    );
    if (ans === null) return; // cancelled
    const shiftDays = Number(ans) || 0;
    duplicate.mutate(
      { sourceId: opp.id, shiftDays },
      {
        onSuccess: (newOpp) => navigate(`/inbox/${newOpp.id}`),
        onError: (e) => alert(`Duplicate failed: ${(e as Error).message}`),
      },
    );
  };
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  // NOTE: every hook must run before the early returns below — otherwise the
  // hook count changes between the loading render and the loaded render, which
  // crashes React ("Rendered more hooks…") and blanks the page on first open.
  const teamById = useMemo(() => Object.fromEntries(team.map((m) => [m.id, m])), [team]);

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>;
  }

  if (!opp) {
    return (
      <div style={{ padding: 40 }}>
        <LCard padding={24} bg={colors.dangerBg} border={colors.dangerDk}>
          <div style={{ color: colors.danger, marginBottom: 16 }}>ไม่พบ opportunity</div>
          <LBtn ghost onClick={() => navigate('/inbox')}>← กลับ</LBtn>
        </LCard>
      </div>
    );
  }

  const meta = findTrack(opp.track as TrackKey);
  const owner = opp.owner_id ? teamById[opp.owner_id] : null;
  const reviewer = opp.reviewer_id ? teamById[opp.reviewer_id] : null;
  const staleThreshold = getStaleThreshold(trackSettings, opp.track as TrackKey);
  const stale = isStale(opp, staleThreshold);

  const ageDays = Math.floor((Date.now() - new Date(opp.last_update_at).getTime()) / (1000 * 60 * 60 * 24));

  const handleStageChange = (newStage: string) => {
    update.mutate({ id: opp.id, patch: { stage: newStage } });
    // Signature celebration: reaching 'Won' (grants/competitions are rare wins).
    if (newStage === 'Won' && opp.stage !== 'Won') fireConfetti();
  };

  const handleCancel = () => {
    update.mutate(
      { id: opp.id, patch: { archived_at: new Date().toISOString(), archived_reason: 'Cancelled', status: 'Cancelled' } },
      { onSuccess: () => navigate('/inbox') },
    );
  };

  const handleArchive = () => {
    update.mutate(
      { id: opp.id, patch: { archived_at: new Date().toISOString(), archived_reason: 'Archived from detail' } },
      { onSuccess: () => navigate('/inbox') },
    );
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
              {opp.due_date && (
                <LChip
                  ink={colors.text}
                  bg={colors.bgSoft}
                  border={colors.lineHi}
                >
                  <LIcon kind="cal" size={10} color={colors.text} />
                  {opp.due_date} · {formatDueRelative(opp.due_date)}
                </LChip>
              )}
              {opp.priority && (
                <LChip
                  ink={opp.priority === 'High' ? colors.danger : colors.dimSoft}
                  bg={opp.priority === 'High' ? colors.dangerBg : 'transparent'}
                  border={opp.priority === 'High' ? colors.dangerDk : colors.lineHi}
                >
                  <LIcon
                    kind="flag"
                    size={10}
                    color={opp.priority === 'High' ? colors.danger : colors.dimSoft}
                  />
                  {opp.priority.toUpperCase()}
                </LChip>
              )}
              {discordSource && (
                <LChip ink={colors.discord} bg="#5865F215" border="#5865F240">
                  DISCORD
                </LChip>
              )}
              {stale && (
                <LChip ink={colors.danger} bg={colors.dangerBg} border={colors.dangerDk}>
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
                  {(() => {
                    const u = opp.source_url.replace(/^https?:\/\//, '');
                    return u.length > 60 ? u.slice(0, 60) + '…' : u;
                  })()}
                </a>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <LBtn primary onClick={() => navigate(`/inbox/${opp.id}/edit`)}>
                แก้ไข
              </LBtn>
              <LBtn ghost onClick={handleDuplicate} disabled={duplicate.isPending}>
                {duplicate.isPending ? 'กำลังคัดลอก…' : '📋 DUPLICATE'}
              </LBtn>
              <LBtn ghost onClick={() => navigate(`/inbox/${opp.id}/brief`)}>
                📄 BRIEF / PDF
              </LBtn>
              <LBtn ghost onClick={() => setShowArchiveConfirm(true)}>
                ARCHIVE
              </LBtn>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px 0 8px 0',
                  border: `1px solid ${colors.dangerDk}`,
                  background: '#1e0a0a',
                  color: colors.danger,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: 0.5,
                }}
              >
                ยกเลิก / CANCEL
              </button>
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

          {/* Discord source */}
          {discordSource && (
            <LCard padding={20} style={{ borderLeft: '3px solid #5865F2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, letterSpacing: 1.2, color: colors.discord, fontWeight: 700 }}>
                    DISCORD SOURCE
                  </span>
                  <span style={{ fontSize: 11, color: colors.dim }}>
                    @{discordSource.author_name} · {new Date(discordSource.created_at).toLocaleDateString('th-TH')}
                  </span>
                </div>
                <a href="/discord-inbox" style={{ fontSize: 11, color: colors.discord, textDecoration: 'none' }}>
                  ดู inbox →
                </a>
              </div>
              {discordSource.original_text && (
                <div
                  style={{
                    fontSize: 13,
                    color: colors.surface,
                    lineHeight: 1.55,
                    background: colors.bgSoft,
                    border: `1px solid ${colors.lineHi}`,
                    borderRadius: '8px 0 8px 0',
                    padding: '10px 14px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}
                >
                  {discordSource.original_text}
                </div>
              )}
              {Array.isArray(discordSource.attachment_paths) && discordSource.attachment_paths.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {discordSource.attachment_paths.map((a, i) => (
                    <DiscordAttachment key={i} storagePath={a.storage_path} filename={a.filename} />
                  ))}
                </div>
              )}
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

          {/* Trip itinerary — only for track='trip' */}
          {opp.track === 'trip' && <TripItinerary opportunityId={opp.id} />}

          {/* Budget tracking — relevant for events + trips */}
          {(opp.track === 'event' || opp.track === 'trip') && <TripBudgetCard opp={opp} />}

          {/* Team — who's doing what */}
          <TeamAssignmentsSection opportunityId={opp.id} />

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
              {/* Segmented pipeline — shows the full stage journey with progress. */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }} role="group" aria-label="Stage">
                {meta.stages.map((s, i) => {
                  const currentIdx = meta.stages.indexOf(opp.stage);
                  const done = i <= currentIdx;
                  const isCurrent = s === opp.stage;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStageChange(s)}
                      aria-current={isCurrent ? 'step' : undefined}
                      style={{
                        flex: '1 1 auto',
                        minWidth: 0,
                        padding: '7px 6px',
                        fontSize: 10.5,
                        fontWeight: isCurrent ? 700 : 500,
                        letterSpacing: 0.2,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        color: isCurrent ? colors.bg : done ? colors.green : colors.dimSoft,
                        background: isCurrent ? colors.green : done ? colors.greenBg : 'transparent',
                        border: `1px solid ${done ? colors.greenDk : colors.lineHi}`,
                        borderRadius:
                          i === 0 ? '8px 0 0 0' : i === meta.stages.length - 1 ? '0 8px 0 8px' : '0',
                        transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: colors.dim, marginTop: 4, letterSpacing: 0.3 }}>
                คลิกเพื่อเปลี่ยน stage · update timestamp อัตโนมัติ
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

      {showCancelConfirm && (
        <ConfirmModal
          title="ยกเลิก opportunity นี้?"
          body="Opportunity จะถูก archive และตั้งสถานะเป็น Cancelled ไม่แสดงใน inbox อีกต่อไป"
          confirmLabel="ยืนยันยกเลิก"
          danger
          isLoading={update.isPending}
          onConfirm={handleCancel}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}

      {showArchiveConfirm && (
        <ConfirmModal
          title="Archive opportunity นี้?"
          body="Opportunity จะถูกย้ายไปที่ archive สามารถดูได้ในภายหลัง"
          confirmLabel="Archive"
          isLoading={update.isPending}
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveConfirm(false)}
        />
      )}
    </div>
  );
}
