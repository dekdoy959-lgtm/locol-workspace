import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useOpportunity,
  useCreateOpportunity,
  useUpdateOpportunity,
  useDeleteOpportunity,
} from '../../hooks/useOpportunities';
import { useTeamMembers, teamMemberDropdownLabel } from '../../hooks/useTeamMembers';
import { findTrack, STATUS_OPTIONS, TRACKS, type TrackKey } from '../../types/opportunity';
import { PRIORITY_OPTIONS } from '../../types/contact';
import { LCard, LH, LBtn, LInput, LSelect, LLabel, LNote, LTextarea, LIcon } from '../../components/primitives';
import { FormSection } from '../../components/forms/FormSection';
import { OpportunityDetailsForm } from '../../components/opportunities/OpportunityDetailsForm';
import { LocalItineraryEditor, type LocalStop } from '../../components/trips/LocalItineraryEditor';
import { supabase } from '../../lib/supabase';
import { colors } from '../../styles/tokens';
import { useConfirm } from '../../components/modals/ConfirmProvider';

export function OpportunityFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Validate the ?track= URL param against known tracks — an unknown value
  // would otherwise flow into the form and be rejected by the DB enum on save.
  const trackParam = searchParams.get('track');
  const initialTrack: TrackKey = TRACKS.some((t) => t.key === trackParam)
    ? (trackParam as TrackKey)
    : 'apply';

  const { data: existing, isLoading } = useOpportunity(mode === 'edit' ? id : undefined);
  const { data: team = [] } = useTeamMembers();
  const create = useCreateOpportunity();
  const update = useUpdateOpportunity();
  const del = useDeleteOpportunity();
  const confirm = useConfirm();

  const [track, setTrack] = useState<TrackKey>(initialTrack);
  // Trip-only: in-memory stops collected before opp is created
  const [localStops, setLocalStops] = useState<LocalStop[]>([]);
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState(findTrack(initialTrack).defaultStage);
  const [status, setStatus] = useState('New');
  const [priority, setPriority] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const initializedIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only initialize form once per opportunity id — prevents form reset on refetch
    if (mode === 'edit' && existing && initializedIdRef.current !== existing.id) {
      initializedIdRef.current = existing.id;
      setTrack(existing.track as TrackKey);
      setTitle(existing.title);
      setStage(existing.stage);
      setStatus(existing.status);
      setPriority(existing.priority ?? '');
      setSourceUrl(existing.source_url ?? '');
      setDueDate(existing.due_date ?? '');
      setOwnerId(existing.owner_id ?? '');
      setReviewerId(existing.reviewer_id ?? '');
      setAiSummary(existing.ai_summary ?? '');
      setDetails(existing.details ?? {});
    }
  }, [mode, existing]);

  // Changing the track must reset the stage to that track's default — an old
  // stage from a different track is invalid for the new one and the DB enum
  // would reject it on save. Applies to BOTH create and edit (the edit init
  // effect above sets track+stage together, so it isn't affected).
  const handleTrackChange = (newTrack: TrackKey) => {
    setTrack(newTrack);
    setStage(findTrack(newTrack).defaultStage);
  };

  const trackMeta = findTrack(track);
  const stageOptions = trackMeta.stages.map((s) => ({ value: s, label: s }));
  const teamOptions = [
    { value: '', label: '— ไม่ระบุ —' },
    ...team.map((m) => ({ value: m.id, label: teamMemberDropdownLabel(m) })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('ต้องกรอก Title');
      return;
    }

    const needsReviewer = !trackMeta.noReviewerRequired;
    if (mode === 'create' && needsReviewer && (!ownerId || !reviewerId)) {
      setError('Owner + Reviewer ต้องระบุ (ยกเว้น track ที่ไม่ต้องมี reviewer)');
      return;
    }
    // Two-person rule — owner and reviewer must be different people
    if (needsReviewer && ownerId && reviewerId && ownerId === reviewerId) {
      setError('Owner กับ Reviewer ต้องเป็นคนละคน (two-person rule)');
      return;
    }

    const payload = {
      track,
      title: title.trim(),
      stage,
      status,
      priority: (priority as 'High' | 'Medium' | 'Low') || null,
      source_url: sourceUrl.trim() || null,
      due_date: dueDate || null,
      owner_id: ownerId || null,
      reviewer_id: reviewerId || null,
      ai_summary: aiSummary.trim() || null,
      details,
    };

    try {
      if (mode === 'create') {
        const created = await create.mutateAsync(payload);
        // If this is a trip with local stops, batch-insert them now that we have opp.id
        if (track === 'trip' && localStops.length > 0) {
          const inserts = localStops.map((s) => ({
            opportunity_id: created.id,
            day_date: s.day_date,
            sort_order: s.sort_order,
            stop_type: s.stop_type,
            start_time: s.start_time,
            end_time: s.end_time,
            name: s.name,
            province: s.province,
            location_name: s.location_name,
            owner_name: s.owner_name,
            owner_phone: s.owner_phone,
            purpose: s.purpose,
            agenda: s.agenda,
            emphasis: s.emphasis,
            notes: s.notes,
          }));
          const { error: stopsErr } = await supabase.from('trip_stops').insert(inserts as never);
          if (stopsErr) {
            console.error('Trip created but stops failed:', stopsErr);
            setError(`Trip ถูกสร้างแล้ว แต่ stops บางอันใส่ไม่สำเร็จ: ${stopsErr.message}`);
            // Still navigate so user can fix manually
          }
        }
        navigate(`/inbox/${created.id}`);
      } else if (id) {
        await update.mutateAsync({ id, patch: payload });
        navigate(`/inbox/${id}`);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      // Postgres enum/check violations leak internal type names — show a hint.
      setError(
        /invalid input value for enum|violates check constraint/i.test(raw)
          ? 'บันทึกไม่สำเร็จ: ค่าบางช่อง (เช่น stage/status) ไม่ถูกต้องสำหรับ track นี้ — ลองเลือกใหม่อีกครั้ง'
          : raw,
      );
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!(await confirm({ title: 'ลบ opportunity นี้?', danger: true }))) return;
    try {
      await del.mutateAsync(id);
      navigate('/inbox');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (mode === 'edit' && isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>;
  }

  const submitting = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} style={{ padding: '28px 36px', maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <LNote>{mode === 'create' ? 'NEW OPPORTUNITY' : 'EDIT OPPORTUNITY'}</LNote>
          <div style={{ height: 12 }} />
          <LH level={2}>{mode === 'create' ? 'จับโอกาสใหม่' : 'แก้ไข Opportunity'}</LH>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <LBtn ghost onClick={() => navigate(mode === 'edit' && id ? `/inbox/${id}` : '/inbox')}>
            ยกเลิก
          </LBtn>
          <LBtn primary type="submit" disabled={submitting}>
            {submitting ? 'กำลังบันทึก…' : mode === 'create' ? 'สร้าง' : 'บันทึก'}
          </LBtn>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            background: colors.dangerBg,
            border: '1px solid #5a1a18',
            borderRadius: '10px 0 10px 0',
            color: colors.danger,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <LCard padding={28}>
        <FormSection title="1 · เลือก Track">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {TRACKS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTrackChange(t.key)}
                style={{
                  padding: '12px 8px',
                  background: track === t.key ? t.color.soft : 'transparent',
                  border: `1px solid ${track === t.key ? t.color.chip : colors.line}`,
                  borderRadius: '10px 0 10px 0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'all 150ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 7, height: 7, background: t.color.ink, borderRadius: 99 }} />
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      color: track === t.key ? t.color.ink : colors.text,
                    }}
                  >
                    {t.name}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: colors.dim, lineHeight: 1.3 }}>{t.cadence}</div>
              </button>
            ))}
          </div>
        </FormSection>

        <FormSection title="2 · รายละเอียด">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            <div>
              <LLabel required>Title</LLabel>
              <LInput value={title} onChange={setTitle} placeholder="เช่น Climate Curve $200k methane prize" />
            </div>
            <div>
              <LLabel>Source URL</LLabel>
              <LInput value={sourceUrl} onChange={setSourceUrl} placeholder="https://..." />
            </div>
          </div>
          <div style={{ height: 14 }} />
          <div>
            <LLabel>AI Summary (paste / type)</LLabel>
            <LTextarea
              value={aiSummary}
              onChange={setAiSummary}
              placeholder="สรุปสั้นๆ ว่ามันคืออะไร · เรา fit ไหม"
              rows={3}
            />
          </div>
        </FormSection>

        <FormSection title="3 · Stage + Due">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <LLabel>Stage</LLabel>
              <LSelect value={stage} onChange={setStage} options={stageOptions} />
            </div>
            <div>
              <LLabel>Status</LLabel>
              <LSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            </div>
            <div>
              <LLabel>Priority</LLabel>
              <LSelect value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} placeholder="—" />
            </div>
          </div>
          <div style={{ height: 14 }} />
          <div style={{ maxWidth: 280 }}>
            <LLabel>Due Date</LLabel>
            <LInput type="date" value={dueDate} onChange={setDueDate} />
          </div>
        </FormSection>

        <FormSection
          title={`4 · ${trackMeta.name} Details`}
          description="ฟิลด์เฉพาะของ track นี้ — ใส่เท่าที่มี"
        >
          <OpportunityDetailsForm track={track} values={details} onChange={setDetails} />
        </FormSection>

        {/* Trip-only · in-form itinerary editor (create mode) */}
        {mode === 'create' && track === 'trip' && (
          <FormSection
            title="Itinerary · ที่ที่จะไป (ใส่ได้เลย ก่อนกดสร้าง)"
            description="แต่ละจุดมีวัน/เวลา/ฟาร์ม/วัตถุประสงค์ของตัวเอง · กรอกตอนนี้เลย ทุกอย่างถูกบันทึกพร้อมกันตอนคุณกด 'สร้าง'"
          >
            <LocalItineraryEditor stops={localStops} onChange={setLocalStops} />
          </FormSection>
        )}

        <FormSection
          title={trackMeta.noReviewerRequired ? '5 · Filer (Watch track)' : '5 · Owner + Reviewer'}
          description={
            trackMeta.noReviewerRequired
              ? 'Watch track ไม่ต้องมี Reviewer'
              : 'Two-person rule: ทุก item ต้องมี Owner + Reviewer ก่อนออกจาก Triage'
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <LLabel required={!trackMeta.noReviewerRequired}>Owner</LLabel>
              <LSelect value={ownerId} onChange={setOwnerId} options={teamOptions} />
            </div>
            {!trackMeta.noReviewerRequired && (
              <div>
                <LLabel required>Reviewer</LLabel>
                <LSelect value={reviewerId} onChange={setReviewerId} options={teamOptions} />
              </div>
            )}
          </div>
        </FormSection>

        {mode === 'edit' && (
          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: `1px solid ${colors.line}`,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={handleDelete}
              disabled={del.isPending}
              style={{
                background: 'transparent',
                color: colors.danger,
                border: `1px solid #5a1a18`,
                padding: '8px 16px',
                borderRadius: '10px 0 10px 0',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              <LIcon kind="warn" size={11} color="#d96a66" /> ลบ Opportunity
            </button>
          </div>
        )}
      </LCard>
    </form>
  );
}
