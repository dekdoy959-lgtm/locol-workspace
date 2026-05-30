import { useState } from 'react';
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
import { LCard, LBtn, LIcon, LInput, LTextarea, LSelect, LLabel } from '../primitives';
import { colors } from '../../styles/tokens';

interface TripItineraryProps {
  opportunityId: string;
}

export function TripItinerary({ opportunityId }: TripItineraryProps) {
  const { data: stops = [], isLoading } = useTripStops(opportunityId);
  const create = useCreateTripStop();
  const update = useUpdateTripStop();
  const remove = useDeleteTripStop();
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [addingDay, setAddingDay] = useState(false);
  const [newDayDate, setNewDayDate] = useState('');

  const grouped = groupStopsByDay(stops);

  const handleAddDay = () => {
    if (!newDayDate) return;
    // Add an empty placeholder stop for the new day (user will edit it)
    create.mutate(
      {
        opportunity_id: opportunityId,
        day_date: newDayDate,
        sort_order: 0,
        stop_type: 'farm',
      },
      {
        onSuccess: (created) => {
          setEditingStopId(created.id);
          setAddingDay(false);
          setNewDayDate('');
        },
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
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#9aa56a', textTransform: 'uppercase' }}>
            ✈ ITINERARY · แผนเดินทาง
          </div>
          <div style={{ fontSize: 11.5, color: colors.dimSoft, marginTop: 4 }}>
            {grouped.length === 0
              ? 'ยังไม่มีแผน · เพิ่มวันแรกด้านล่าง'
              : `${grouped.length} วัน · ${stops.length} จุด`}
          </div>
        </div>
        <LBtn small primary onClick={() => setAddingDay(true)} disabled={addingDay}>
          <LIcon kind="plus" size={11} color={colors.bg} /> เพิ่มวัน
        </LBtn>
      </div>

      {/* Add day form */}
      {addingDay && (
        <div
          style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${colors.line}`,
            background: '#1d1f12',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: colors.dimSoft }}>วันที่:</span>
          <div style={{ minWidth: 180 }}>
            <LInput type="date" value={newDayDate} onChange={setNewDayDate} />
          </div>
          <LBtn small primary onClick={handleAddDay} disabled={!newDayDate || create.isPending}>
            {create.isPending ? 'กำลังเพิ่ม…' : 'เพิ่มวัน + จุดแรก'}
          </LBtn>
          <LBtn
            small
            ghost
            onClick={() => {
              setAddingDay(false);
              setNewDayDate('');
            }}
          >
            ยกเลิก
          </LBtn>
        </div>
      )}

      {/* Days */}
      {grouped.length === 0 && !addingDay && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: colors.dim,
            fontSize: 13,
            background: colors.bgSoft,
          }}
        >
          🗓 ยังไม่มี itinerary · กด <b style={{ color: colors.text }}>เพิ่มวัน</b> เพื่อเริ่ม
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {grouped.map(({ date, stops: dayStops }, dayIdx) => (
          <DaySection
            key={date}
            date={date}
            dayNumber={dayIdx + 1}
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
            onDelete={(id) => {
              if (confirm('ลบจุดนี้?')) {
                remove.mutate({ id, opportunityId });
                if (editingStopId === id) setEditingStopId(null);
              }
            }}
            onAddStop={() => handleAddStop(date)}
            saving={update.isPending}
          />
        ))}
      </div>
    </LCard>
  );
}

function DaySection({
  date,
  dayNumber,
  stops,
  editingStopId,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onAddStop,
  saving,
}: {
  date: string;
  dayNumber: number;
  stops: TripStopRow[];
  editingStopId: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSave: (stop: TripStopRow, patch: TripStopUpdate) => void;
  onDelete: (id: string) => void;
  onAddStop: () => void;
  saving: boolean;
}) {
  const dateObj = new Date(date);
  const weekday = dateObj.toLocaleDateString('th-TH', { weekday: 'long' });
  const niceDate = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ borderBottom: `1px solid ${colors.line}` }}>
      {/* Day header */}
      <div
        style={{
          padding: '10px 18px',
          background: '#1d1f12',
          borderBottom: `1px solid ${colors.line}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            background: '#9aa56a',
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
        <span style={{ fontSize: 11, color: colors.dim }}>{stops.length} จุด</span>
      </div>

      {/* Stops */}
      <div>
        {stops.map((stop) => (
          <StopRow
            key={stop.id}
            stop={stop}
            editing={editingStopId === stop.id}
            onStartEdit={() => onStartEdit(stop.id)}
            onCancelEdit={onCancelEdit}
            onSave={(patch) => onSave(stop, patch)}
            onDelete={() => onDelete(stop.id)}
            saving={saving}
          />
        ))}
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
            e.currentTarget.style.color = '#9aa56a';
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
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  saving,
}: {
  stop: TripStopRow;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: TripStopUpdate) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<TripStopUpdate>({});

  // When entering edit mode, seed draft from current row
  const startEdit = () => {
    setDraft({
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
    onStartEdit();
  };

  const meta = STOP_TYPE_META[stop.stop_type];

  if (editing) {
    return (
      <div style={{ padding: '14px 18px', background: '#161812' }}>
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
            placeholder="09:00 ตรวจวัว\n10:00 พูดคุยเจ้าของฟาร์ม\n10:30 ถ่ายรูป"
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
              border: '1px solid #5a1a18',
              color: '#d96a66',
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

  return (
    <div
      onClick={startEdit}
      style={{
        padding: '12px 18px',
        borderBottom: `1px solid ${colors.line}`,
        cursor: 'pointer',
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
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
        </div>
        {stop.owner_name && (
          <div style={{ fontSize: 11.5, color: colors.dimSoft, marginTop: 2 }}>
            👤 {stop.owner_name}
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
              color: '#9aa56a',
              marginTop: 4,
              padding: '2px 8px',
              background: '#1d1f12',
              border: '1px solid #3a3f1f',
              borderRadius: '4px 0 4px 0',
              display: 'inline-block',
            }}
          >
            ⭐ {stop.emphasis}
          </div>
        )}
      </div>
      <span style={{ color: colors.dim, fontSize: 11, flexShrink: 0, paddingTop: 4 }}>คลิกแก้</span>
    </div>
  );
}
