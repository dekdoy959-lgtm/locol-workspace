/**
 * LocalItineraryEditor — like <TripItinerary> but operates on in-memory state
 * instead of persisting to DB. Used inside the "Create Trip" form so the user
 * can add days/stops BEFORE clicking Save.
 *
 * On form submit, parent reads localStops, creates the opportunity, then
 * batch-inserts stops with the new opp_id.
 */

import { useEffect, useState } from 'react';
import { STOP_TYPE_META, type StopType } from '../../hooks/useTripStops';
import { LCard, LBtn, LIcon, LInput, LTextarea, LSelect, LLabel } from '../primitives';
import { colors } from '../../styles/tokens';
import { todayLocalISO } from '../../lib/dateUtil';

/** A stop row before persistence — no opportunity_id yet, has client-side temp_id */
export interface LocalStop {
  temp_id: string;
  day_date: string;
  sort_order: number;
  stop_type: StopType;
  start_time: string | null;
  end_time: string | null;
  name: string | null;
  province: string | null;
  location_name: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  purpose: string | null;
  agenda: string | null;
  emphasis: string | null;
  notes: string | null;
}

function makeTempId(): string {
  return `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function makeBlankStop(day_date: string, sort_order: number): LocalStop {
  return {
    temp_id: makeTempId(),
    day_date,
    sort_order,
    stop_type: 'farm',
    start_time: null,
    end_time: null,
    name: null,
    province: null,
    location_name: null,
    owner_name: null,
    owner_phone: null,
    purpose: null,
    agenda: null,
    emphasis: null,
    notes: null,
  };
}

function groupLocalByDay(stops: LocalStop[]): { date: string; stops: LocalStop[] }[] {
  const map = new Map<string, LocalStop[]>();
  for (const s of stops) {
    const arr = map.get(s.day_date) ?? [];
    arr.push(s);
    map.set(s.day_date, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      stops: items.sort((a, b) => a.sort_order - b.sort_order),
    }));
}

interface LocalItineraryEditorProps {
  stops: LocalStop[];
  onChange: (stops: LocalStop[]) => void;
}

export function LocalItineraryEditor({ stops, onChange }: LocalItineraryEditorProps) {
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const grouped = groupLocalByDay(stops);

  const today = () => todayLocalISO();

  const handleAdd = () => {
    const date = today();
    const dayStops = stops.filter((s) => s.day_date === date);
    const maxSort = dayStops.length > 0 ? Math.max(...dayStops.map((s) => s.sort_order)) : -1;
    const fresh = makeBlankStop(date, maxSort + 1);
    onChange([...stops, fresh]);
    setEditingTempId(fresh.temp_id);
  };

  const handleAddInDay = (date: string) => {
    const dayStops = stops.filter((s) => s.day_date === date);
    const maxSort = dayStops.length > 0 ? Math.max(...dayStops.map((s) => s.sort_order)) : -1;
    const fresh = makeBlankStop(date, maxSort + 1);
    onChange([...stops, fresh]);
    setEditingTempId(fresh.temp_id);
  };

  const handleSave = (tempId: string, patch: Partial<LocalStop>) => {
    onChange(stops.map((s) => (s.temp_id === tempId ? { ...s, ...patch } : s)));
    setEditingTempId(null);
  };

  const handleDelete = (tempId: string) => {
    onChange(stops.filter((s) => s.temp_id !== tempId));
    if (editingTempId === tempId) setEditingTempId(null);
  };

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
            ✈ ITINERARY · แผนเดินทาง
          </div>
          <div style={{ fontSize: 11.5, color: colors.dimSoft, marginTop: 4 }}>
            {grouped.length === 0
              ? 'กรอกที่จะไปได้เลย ก่อนกด "สร้าง" ด้านล่าง'
              : `${grouped.length} วัน · ${stops.length} จุด · เปลี่ยนวันที่ในจุดเพื่อจัดกลุ่ม`}
          </div>
        </div>
        <LBtn small primary onClick={handleAdd}>
          <LIcon kind="plus" size={11} color={colors.bg} /> Add Field Visit
        </LBtn>
      </div>

      {grouped.length === 0 && (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: colors.dim,
            fontSize: 12.5,
            background: colors.bgSoft,
          }}
        >
          🗓 ยังไม่มีจุด · กด <b style={{ color: colors.text }}>+ Add Field Visit</b> ด้านบน
          <div style={{ marginTop: 6, fontSize: 11, color: colors.dim, lineHeight: 1.5 }}>
            (กรอกได้ตั้งแต่ก่อนสร้าง trip · ทุกอย่างถูกบันทึกพร้อมกันตอน Save)
          </div>
        </div>
      )}

      {grouped.map(({ date, stops: dayStops }, dayIdx) => (
        <DayBlock
          key={date}
          date={date}
          dayNumber={dayIdx + 1}
          stops={dayStops}
          editingTempId={editingTempId}
          onStartEdit={(t) => setEditingTempId(t)}
          onCancelEdit={() => setEditingTempId(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onAddStop={() => handleAddInDay(date)}
        />
      ))}
    </LCard>
  );
}

function DayBlock({
  date,
  dayNumber,
  stops,
  editingTempId,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onAddStop,
}: {
  date: string;
  dayNumber: number;
  stops: LocalStop[];
  editingTempId: string | null;
  onStartEdit: (t: string) => void;
  onCancelEdit: () => void;
  onSave: (t: string, patch: Partial<LocalStop>) => void;
  onDelete: (t: string) => void;
  onAddStop: () => void;
}) {
  const d = new Date(date);
  const weekday = d.toLocaleDateString('th-TH', { weekday: 'long' });
  const nice = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ borderBottom: `1px solid ${colors.line}` }}>
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
        <span style={{ fontSize: 13, color: colors.text, fontWeight: 600 }}>{nice}</span>
        <span style={{ fontSize: 11, color: colors.dimSoft }}>· {weekday}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: colors.dim }}>{stops.length} จุด</span>
      </div>
      {stops.map((s) => (
        <LocalStopRow
          key={s.temp_id}
          stop={s}
          editing={editingTempId === s.temp_id}
          onStartEdit={() => onStartEdit(s.temp_id)}
          onCancelEdit={onCancelEdit}
          onSave={(patch) => onSave(s.temp_id, patch)}
          onDelete={() => onDelete(s.temp_id)}
        />
      ))}
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
        }}
      >
        <LIcon kind="plus" size={11} color="currentColor" /> เพิ่มจุดในวันนี้
      </button>
    </div>
  );
}

function LocalStopRow({
  stop,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  stop: LocalStop;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<LocalStop>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Partial<LocalStop>>({});

  useEffect(() => {
    if (!editing) return;
    setDraft({ ...stop });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, stop.temp_id]);

  const meta = STOP_TYPE_META[stop.stop_type];

  if (editing) {
    return (
      <div style={{ padding: '14px 18px', background: '#161812' }}>
        <div style={{ marginBottom: 10 }}>
          <LLabel>📅 วันที่ (เปลี่ยนได้เพื่อย้ายไปอีกวัน)</LLabel>
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
              type="time"
              value={draft.start_time ?? ''}
              onChange={(v) => setDraft({ ...draft, start_time: v || null })}
              placeholder="09:00"
            />
          </div>
          <div>
            <LLabel>สิ้นสุด</LLabel>
            <LInput
              type="time"
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
            placeholder="ทำอะไรที่นี่"
            rows={2}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <LLabel>Agenda</LLabel>
          <LTextarea
            value={draft.agenda ?? ''}
            onChange={(v) => setDraft({ ...draft, agenda: v || null })}
            placeholder={'09:00 ตรวจวัว\n10:00 พูดคุยเจ้าของ'}
            rows={3}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <LLabel>สิ่งที่อยากเน้น</LLabel>
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
            <LBtn small primary onClick={() => onSave(draft)}>
              เก็บไว้ใน itinerary
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
      onClick={onStartEdit}
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
      </div>
      <span style={{ color: colors.dim, fontSize: 11, flexShrink: 0, paddingTop: 4 }}>คลิกแก้</span>
    </div>
  );
}
