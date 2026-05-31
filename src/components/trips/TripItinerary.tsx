import { useState, useEffect } from 'react';
import {
  useTripStops,
  useCreateTripStop,
  useUpdateTripStop,
  useDeleteTripStop,
  groupStopsByDay,
  STOP_TYPE_META,
  type TripStopRow,
  type TripStopUpdate,
  type StopType,
} from '../../hooks/useTripStops';
import {
  useOpportunityTeam,
  useCreateAssignment,
  useDeleteAssignment,
} from '../../hooks/useOpportunityTeam';
import { useTeamMembers, teamMemberInitials, teamMemberDisplayName } from '../../hooks/useTeamMembers';
import { LCard, LBtn, LIcon, LInput, LTextarea, LSelect, LLabel, LAvatar } from '../primitives';
import { colors } from '../../styles/tokens';
import { todayLocalISO } from '../../lib/dateUtil';
import { useConfirm } from '../modals/ConfirmProvider';

/** Google Maps deep link for a stop's place. Uses search query — falls back gracefully if location_name is empty. */
function googleMapsUrl(stop: TripStopRow): string | null {
  const parts = [stop.name, stop.location_name, stop.province].filter(Boolean);
  if (parts.length === 0) return null;
  const query = encodeURIComponent(parts.join(' '));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

interface TripItineraryProps {
  opportunityId: string;
}

export function TripItinerary({ opportunityId }: TripItineraryProps) {
  const { data: stops = [], isLoading } = useTripStops(opportunityId);
  const create = useCreateTripStop();
  const update = useUpdateTripStop();
  const confirm = useConfirm();
  const remove = useDeleteTripStop();
  const [editingStopId, setEditingStopId] = useState<string | null>(null);

  const grouped = groupStopsByDay(stops);

  /**
   * One-click "Add Field Visit" — creates a stop right away (date = today
   * by default · user can change it in the edit form) and opens edit mode.
   * No separate "add day" step.
   */
  const handleAddFieldVisit = () => {
    // Default to today; user edits the date inline if needed
    const today = todayLocalISO();
    create.mutate(
      {
        opportunity_id: opportunityId,
        day_date: today,
        sort_order: 0,
        stop_type: 'farm',
      },
      {
        onSuccess: (created) => setEditingStopId(created.id),
      },
    );
  };

  const handleAddStop = (dayDate: string) => {
    const dayStops = stops.filter((s) => s.day_date === dayDate);
    const maxSort = dayStops.length > 0 ? Math.max(...dayStops.map((s) => s.sort_order)) : -1;
    create.mutate(
      {
        opportunity_id: opportunityId,
        day_date: dayDate,
        sort_order: maxSort + 1,
        stop_type: 'farm',
      },
      {
        onSuccess: (created) => setEditingStopId(created.id),
      },
    );
  };

  if (isLoading) {
    return <div style={{ padding: 14, color: colors.dim, fontSize: 12 }}>กำลังโหลด itinerary…</div>;
  }

  return (
    <LCard padding={0}>
      <div
        style={{
          padding: '14px 18px',
          borderBottom: `1px solid ${colors.line}`,
          background: colors.bgSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: colors.olive, textTransform: 'uppercase' }}>
            <LIcon kind="plane" size={11} color={colors.olive} /> ITINERARY · แผนเดินทาง
          </div>
          <div style={{ fontSize: 11.5, color: colors.dimSoft, marginTop: 4 }}>
            {grouped.length === 0
              ? 'ยังไม่มีจุด — กด + Add Field Visit เพื่อเริ่ม'
              : `${grouped.length} วัน · ${stops.length} จุด`}
          </div>
        </div>
        <LBtn small primary onClick={handleAddFieldVisit} disabled={create.isPending}>
          <LIcon kind="plus" size={11} color={colors.bg} />{' '}
          {create.isPending ? 'กำลังเพิ่ม…' : 'Add Field Visit'}
        </LBtn>
      </div>

      {/* Days */}
      {grouped.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: colors.dim,
            fontSize: 13,
            background: colors.bgSoft,
          }}
        >
          🗓 ยังไม่มีจุด · กด <b style={{ color: colors.text }}>+ Add Field Visit</b> ด้านบนเพื่อเริ่ม
          <div style={{ marginTop: 8, fontSize: 11, color: colors.dim, lineHeight: 1.5 }}>
            (1 trip มีหลายวันก็ได้ · แต่ละวันมีหลายจุด · เปลี่ยนวันที่ในจุดเพื่อจัดกลุ่ม)
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {grouped.map(({ date, stops: dayStops }, dayIdx) => (
          <DaySection
            key={date}
            date={date}
            dayNumber={dayIdx + 1}
            opportunityId={opportunityId}
            stops={dayStops}
            editingStopId={editingStopId}
            onStartEdit={(id) => setEditingStopId(id)}
            onCancelEdit={() => setEditingStopId(null)}
            onSave={(stop, patch) => {
              update.mutate(
                { id: stop.id, opportunityId, patch },
                { onSuccess: () => setEditingStopId(null) },
              );
            }}
            onDelete={async (id) => {
              if (await confirm({ title: 'ลบจุดนี้?', danger: true })) {
                remove.mutate({ id, opportunityId });
                if (editingStopId === id) setEditingStopId(null);
              }
            }}
            onAddStop={() => handleAddStop(date)}
            saving={update.isPending}
            onReorder={(fromId, toId) => {
              const ids = dayStops.map((s) => s.id);
              const from = ids.indexOf(fromId);
              const to = ids.indexOf(toId);
              if (from < 0 || to < 0 || from === to) return;
              const reordered = [...dayStops];
              const [moved] = reordered.splice(from, 1);
              reordered.splice(to, 0, moved);
              // Persist the new sequence — update only the stops whose index changed.
              reordered.forEach((s, i) => {
                if (s.sort_order !== i) {
                  update.mutate({ id: s.id, opportunityId, patch: { sort_order: i } });
                }
              });
            }}
          />
        ))}
      </div>
    </LCard>
  );
}

function DaySection({
  date,
  dayNumber,
  opportunityId,
  stops,
  editingStopId,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onAddStop,
  saving,
  onReorder,
}: {
  date: string;
  dayNumber: number;
  opportunityId: string;
  stops: TripStopRow[];
  editingStopId: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSave: (stop: TripStopRow, patch: TripStopUpdate) => void;
  onDelete: (id: string) => void;
  onAddStop: () => void;
  saving: boolean;
  onReorder: (fromId: string, toId: string) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dateObj = new Date(date);
  const weekday = dateObj.toLocaleDateString('th-TH', { weekday: 'long' });
  const niceDate = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  // Flag time overlaps between stops in this day (both need start + end times).
  const hasConflict = (() => {
    const timed = stops.filter((s) => s.start_time && s.end_time);
    for (let i = 0; i < timed.length; i++) {
      for (let j = i + 1; j < timed.length; j++) {
        if (timed[i].start_time! < timed[j].end_time! && timed[j].start_time! < timed[i].end_time!) {
          return true;
        }
      }
    }
    return false;
  })();

  return (
    <div style={{ borderBottom: `1px solid ${colors.line}` }}>
      {/* Day header */}
      <div
        style={{
          padding: '10px 18px',
          background: colors.oliveBg,
          borderBottom: `1px solid ${colors.line}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            background: colors.olive,
            color: colors.bg,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            borderRadius: '6px 0 6px 0',
          }}
        >
          DAY {dayNumber}
        </span>
        <span style={{ fontSize: 13, color: colors.text, fontWeight: 600 }}>{niceDate}</span>
        <span style={{ fontSize: 11, color: colors.dimSoft }}>· {weekday}</span>
        <span style={{ flex: 1 }} />
        {hasConflict && (
          <span
            title="มี stop ที่ช่วงเวลาชนกันในวันนี้"
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: colors.danger,
              letterSpacing: 0.4,
              background: '#2a1212',
              border: `1px solid ${colors.dangerDk}`,
              borderRadius: '5px 0 5px 0',
              padding: '2px 7px',
            }}
          >
            ⚠ เวลาชนกัน
          </span>
        )}
        <span style={{ fontSize: 11, color: colors.dim }}>{stops.length} จุด</span>
      </div>

      {/* Stops */}
      <div>
        {stops.map((stop) => {
          const isEditingThis = editingStopId === stop.id;
          return (
            <div
              key={stop.id}
              // Drag to reorder stops within the day (disabled while editing a row).
              draggable={!isEditingThis}
              onDragStart={(e) => {
                setDraggedId(stop.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                if (draggedId && draggedId !== stop.id) {
                  e.preventDefault();
                  setOverId(stop.id);
                }
              }}
              onDragLeave={() => setOverId((cur) => (cur === stop.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedId && draggedId !== stop.id) onReorder(draggedId, stop.id);
                setDraggedId(null);
                setOverId(null);
              }}
              onDragEnd={() => {
                setDraggedId(null);
                setOverId(null);
              }}
              style={{
                opacity: draggedId === stop.id ? 0.4 : 1,
                borderTop: overId === stop.id ? `2px solid ${colors.green}` : '2px solid transparent',
                cursor: isEditingThis ? 'default' : 'grab',
                transition: 'opacity 120ms ease',
              }}
            >
              <StopRow
                stop={stop}
                opportunityId={opportunityId}
                editing={isEditingThis}
                onStartEdit={() => onStartEdit(stop.id)}
                onCancelEdit={onCancelEdit}
                onSave={(patch) => onSave(stop, patch)}
                onDelete={() => onDelete(stop.id)}
                saving={saving}
              />
            </div>
          );
        })}
        {/* Add stop in this day */}
        <button
          type="button"
          onClick={onAddStop}
          style={{
            width: '100%',
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderTop: `1px dashed ${colors.line}`,
            color: colors.dim,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 11.5,
            letterSpacing: 0.4,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'color 100ms, background 100ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.olive;
            e.currentTarget.style.background = colors.bgSoft;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.dim;
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LIcon kind="plus" size={11} color="currentColor" /> เพิ่มจุดในวันนี้
        </button>
      </div>
    </div>
  );
}

function StopRow({
  stop,
  opportunityId,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  saving,
}: {
  stop: TripStopRow;
  opportunityId: string;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: TripStopUpdate) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<TripStopUpdate>({});

  // Seed draft from current row whenever we enter edit mode (covers both
  // "user clicked existing row" and "new row just created and auto-opened")
  useEffect(() => {
    if (!editing) return;
    setDraft({
      day_date: stop.day_date,
      start_time: stop.start_time,
      end_time: stop.end_time,
      stop_type: stop.stop_type,
      name: stop.name,
      province: stop.province,
      location_name: stop.location_name,
      owner_name: stop.owner_name,
      owner_phone: stop.owner_phone,
      purpose: stop.purpose,
      agenda: stop.agenda,
      emphasis: stop.emphasis,
      notes: stop.notes,
    });
    // Only re-seed when toggling edit mode on, or moving to a different stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, stop.id]);

  const startEdit = () => onStartEdit();

  const meta = STOP_TYPE_META[stop.stop_type];

  if (editing) {
    return (
      <div style={{ padding: '14px 18px', background: '#161812' }}>
        {/* Date — top of the form (changes which day this stop belongs to) */}
        <div style={{ marginBottom: 10 }}>
          <LLabel><LIcon kind="cal" size={10} color={colors.dim} /> วันที่ (เปลี่ยนได้เพื่อย้ายไปอีกวัน)</LLabel>
          <div style={{ maxWidth: 200 }}>
            <LInput
              type="date"
              value={draft.day_date ?? ''}
              onChange={(v) => setDraft({ ...draft, day_date: v || draft.day_date })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <LLabel>เริ่ม</LLabel>
            <LInput
              value={draft.start_time ?? ''}
              onChange={(v) => setDraft({ ...draft, start_time: v || null })}
              placeholder="09:00"
            />
          </div>
          <div>
            <LLabel>สิ้นสุด</LLabel>
            <LInput
              value={draft.end_time ?? ''}
              onChange={(v) => setDraft({ ...draft, end_time: v || null })}
              placeholder="11:00"
            />
          </div>
          <div>
            <LLabel>ประเภท</LLabel>
            <LSelect
              value={draft.stop_type ?? 'farm'}
              onChange={(v) => setDraft({ ...draft, stop_type: v as StopType })}
              options={Object.entries(STOP_TYPE_META).map(([value, m]) => ({
                value,
                label: `${m.icon} ${m.label}`,
              }))}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <LLabel>ชื่อ (ฟาร์ม / สถานที่)</LLabel>
            <LInput
              value={draft.name ?? ''}
              onChange={(v) => setDraft({ ...draft, name: v || null })}
              placeholder="ฟาร์ม ก. · บ้านวัวดอย · ฯลฯ"
            />
          </div>
          <div>
            <LLabel>จังหวัด</LLabel>
            <LInput
              value={draft.province ?? ''}
              onChange={(v) => setDraft({ ...draft, province: v || null })}
              placeholder="เชียงราย"
            />
          </div>
          <div>
            <LLabel>อำเภอ / ที่อยู่</LLabel>
            <LInput
              value={draft.location_name ?? ''}
              onChange={(v) => setDraft({ ...draft, location_name: v || null })}
              placeholder="อ.เชียงดาว"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <LLabel>ชื่อเจ้าของ / contact</LLabel>
            <LInput
              value={draft.owner_name ?? ''}
              onChange={(v) => setDraft({ ...draft, owner_name: v || null })}
              placeholder="คุณ ก"
            />
          </div>
          <div>
            <LLabel>เบอร์</LLabel>
            <LInput
              type="tel"
              value={draft.owner_phone ?? ''}
              onChange={(v) => setDraft({ ...draft, owner_phone: v || null })}
              placeholder="08x-xxx-xxxx"
            />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <LLabel>วัตถุประสงค์ที่จุดนี้</LLabel>
          <LTextarea
            value={draft.purpose ?? ''}
            onChange={(v) => setDraft({ ...draft, purpose: v || null })}
            placeholder="ทำอะไรที่นี่ · เก็บข้อมูลอะไร"
            rows={2}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <LLabel>Agenda</LLabel>
          <LTextarea
            value={draft.agenda ?? ''}
            onChange={(v) => setDraft({ ...draft, agenda: v || null })}
            placeholder={'09:00 ตรวจวัว\n10:00 พูดคุยเจ้าของฟาร์ม\n10:30 ถ่ายรูป'}
            rows={3}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <LLabel>สิ่งที่อยากเน้น (marketing)</LLabel>
            <LTextarea
              value={draft.emphasis ?? ''}
              onChange={(v) => setDraft({ ...draft, emphasis: v || null })}
              placeholder="methane reduction · cocoa-fed"
              rows={2}
            />
          </div>
          <div>
            <LLabel>หมายเหตุ</LLabel>
            <LTextarea
              value={draft.notes ?? ''}
              onChange={(v) => setDraft({ ...draft, notes: v || null })}
              placeholder="หมายเหตุอื่น ๆ"
              rows={2}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={onDelete}
            style={{
              padding: '5px 12px',
              background: 'transparent',
              border: `1px solid ${colors.dangerDk}`,
              color: colors.danger,
              borderRadius: '6px 0 6px 0',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ลบจุดนี้
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <LBtn small ghost onClick={onCancelEdit}>
              ยกเลิก
            </LBtn>
            <LBtn small primary onClick={() => onSave(draft)} disabled={saving}>
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </LBtn>
          </div>
        </div>
      </div>
    );
  }

  // View mode
  const timeStr = [stop.start_time, stop.end_time].filter(Boolean).join(' – ') || '—';
  const placeStr = [stop.name, stop.province, stop.location_name].filter(Boolean).join(' · ') || '(ยังไม่ได้กรอก)';
  const mapUrl = googleMapsUrl(stop);

  return (
    <div
      style={{
        padding: '12px 18px',
        borderBottom: `1px solid ${colors.line}`,
        transition: 'background 100ms',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgSoft)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        style={{
          minWidth: 78,
          fontSize: 12,
          color: colors.dimSoft,
          fontFamily: "'IBM Plex Mono', monospace",
          flexShrink: 0,
          paddingTop: 2,
        }}
      >
        {timeStr}
      </div>
      <div onClick={startEdit} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16 }}>{meta.icon}</span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: colors.text }}>{placeStr}</span>
          <span
            style={{
              fontSize: 9.5,
              color: colors.dim,
              border: `1px solid ${colors.lineHi}`,
              padding: '1px 6px',
              borderRadius: '4px 0 4px 0',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {meta.label}
          </span>
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 10.5,
                color: colors.olive,
                textDecoration: 'none',
                padding: '1px 6px',
                background: colors.oliveBg,
                border: `1px solid ${colors.oliveDk}`,
                borderRadius: '4px 0 4px 0',
                letterSpacing: 0.4,
                fontWeight: 600,
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = colors.green)}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = colors.olive)}
              title="เปิดใน Google Maps"
            >
              <LIcon kind="pin" size={10} color={colors.olive} /> MAP ↗
            </a>
          )}
        </div>
        {stop.owner_name && (
          <div style={{ fontSize: 11.5, color: colors.dimSoft, marginTop: 2 }}>
            <LIcon kind="user" size={10} color={colors.dimSoft} /> {stop.owner_name}
            {stop.owner_phone && <span style={{ marginLeft: 6 }}>· {stop.owner_phone}</span>}
          </div>
        )}
        {stop.purpose && (
          <div style={{ fontSize: 12, color: colors.surface, marginTop: 4, lineHeight: 1.4 }}>
            {stop.purpose}
          </div>
        )}
        {stop.emphasis && (
          <div
            style={{
              fontSize: 11,
              color: colors.olive,
              marginTop: 4,
              padding: '2px 8px',
              background: colors.oliveBg,
              border: `1px solid ${colors.oliveDk}`,
              borderRadius: '4px 0 4px 0',
              display: 'inline-block',
            }}
          >
            ⭐ {stop.emphasis}
          </div>
        )}
      </div>
      <PerStopTravelers opportunityId={opportunityId} stop={stop} />
      <span style={{ color: colors.dim, fontSize: 11, flexShrink: 0, paddingTop: 4 }}>คลิกแก้</span>
    </div>
  );
}

/** Compact per-stop traveler picker. Only stores role='traveler' for now. */
function PerStopTravelers({
  opportunityId,
  stop,
}: {
  opportunityId: string;
  stop: TripStopRow;
}) {
  const { data: assignments = [] } = useOpportunityTeam(opportunityId);
  const { data: team = [] } = useTeamMembers();
  const create = useCreateAssignment();
  const remove = useDeleteAssignment();
  const [picking, setPicking] = useState(false);

  const teamById = Object.fromEntries(team.map((t) => [t.id, t]));
  const myStopAssignments = assignments.filter(
    (a) => a.trip_stop_id === stop.id && a.role === 'traveler',
  );
  const availableMembers = team.filter(
    (m) => !myStopAssignments.some((a) => a.team_member_id === m.id),
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0,
        minWidth: 120,
        maxWidth: 200,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 9, color: colors.dim, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>
        <LIcon kind="plane" size={9} color={colors.dim} /> ใครไปจุดนี้
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {myStopAssignments.map((a) => {
          const m = teamById[a.team_member_id];
          if (!m) return null;
          return (
            <div
              key={a.id}
              title={teamMemberDisplayName(m)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                background: colors.bgRaise,
                border: `1px solid ${colors.lineHi}`,
                borderRadius: '5px 0 5px 0',
                padding: '1px 3px 1px 1px',
                fontSize: 10,
              }}
            >
              <LAvatar initials={teamMemberInitials(m)} size={16} />
              <button
                type="button"
                onClick={() => remove.mutate({ id: a.id, opportunityId })}
                title="ลบ"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.dim,
                  cursor: 'pointer',
                  padding: '0 2px',
                  fontSize: 11,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        {!picking && availableMembers.length > 0 && (
          <button
            type="button"
            onClick={() => setPicking(true)}
            style={{
              background: 'transparent',
              border: `1px dashed ${colors.lineHi}`,
              color: colors.dim,
              padding: '1px 5px',
              fontSize: 10,
              borderRadius: '5px 0 5px 0',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            + assign
          </button>
        )}
        {picking && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
            {availableMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  create.mutate(
                    {
                      opportunity_id: opportunityId,
                      team_member_id: m.id,
                      role: 'traveler',
                      trip_stop_id: stop.id,
                    },
                    {
                      onSuccess: () => {
                        if (availableMembers.length === 1) setPicking(false);
                      },
                    },
                  );
                }}
                style={{
                  background: colors.bgRaise,
                  border: `1px solid ${colors.green}`,
                  color: colors.text,
                  padding: '2px 6px',
                  fontSize: 10,
                  borderRadius: '5px 0 5px 0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                + {m.full_name?.split(' ')[0] ?? m.email.split('@')[0]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPicking(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.dim,
                fontSize: 10,
                padding: '2px 6px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              done
            </button>
          </div>
        )}
        {myStopAssignments.length === 0 && !picking && availableMembers.length === 0 && (
          <span style={{ fontSize: 10, color: colors.dim, fontStyle: 'italic' }}>ไม่มี team</span>
        )}
      </div>
    </div>
  );
}
