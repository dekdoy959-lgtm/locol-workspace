import { useState } from 'react';
import { LBtn, LInput, LTextarea, LIcon } from '../primitives';
import { useCreateNote } from '../../hooks/useNotes';
import type { NoteScope } from '../../types/note';
import { colors } from '../../styles/tokens';
import { todayLocalISO } from '../../lib/dateUtil';

interface NoteComposerProps {
  scope: NoteScope;
  targetId: string;
  currentUserId?: string;
}

function todayISO(): string {
  return todayLocalISO();
}

export function NoteComposer({ scope, targetId, currentUserId }: NoteComposerProps) {
  const [text, setText] = useState('');
  const [date, setDate] = useState(todayISO());
  const [reminder, setReminder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createNote = useCreateNote();

  const today = todayISO();
  const isFuture = date > today;

  const handleSave = async () => {
    setError(null);
    if (!text.trim()) {
      setError('ใส่เนื้อหา note ก่อน');
      return;
    }

    try {
      await createNote.mutateAsync({
        scope,
        target_id: targetId,
        date,
        text: text.trim(),
        tags: extractTags(text),
        is_future: isFuture && reminder,
        created_by: currentUserId ?? null,
      });
      setText('');
      setDate(today);
      setReminder(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div
      style={{
        background: colors.bgSoft,
        border: `1px solid ${colors.line}`,
        borderRadius: '14px 0 14px 0',
        padding: 14,
      }}
    >
      <LTextarea
        value={text}
        onChange={setText}
        placeholder="พิมพ์ note... ใช้ #tag เพื่อเพิ่ม tag · ใช้ @ชื่อ เพื่อ mention"
        rows={3}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <LIcon kind="cal" size={13} color={colors.dimSoft} />
          <div style={{ width: 160 }}>
            <LInput
              type="date"
              value={date}
              onChange={setDate}
              style={{ padding: '6px 10px', fontSize: 12.5 }}
            />
          </div>
          {isFuture && (
            <span
              style={{
                fontSize: 10,
                color: colors.warn,
                background: colors.warnBg,
                border: '1px solid #5a3f10',
                padding: '2px 8px',
                borderRadius: '6px 0 6px 0',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              FUTURE · SCHEDULED
            </span>
          )}
        </div>

        {isFuture && (
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: colors.dimSoft,
              cursor: 'pointer',
              letterSpacing: 0.3,
            }}
          >
            <input
              type="checkbox"
              checked={reminder}
              onChange={(e) => setReminder(e.target.checked)}
              style={{ accentColor: colors.green }}
            />
            🔔 แจ้งเตือนตอนถึงวัน
          </label>
        )}

        <span style={{ flex: 1 }} />

        <LBtn primary small onClick={handleSave} disabled={createNote.isPending}>
          {createNote.isPending ? 'กำลังบันทึก…' : 'SAVE NOTE'}
        </LBtn>
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            background: colors.dangerBg,
            border: '1px solid #5a1a18',
            borderRadius: '6px 0 6px 0',
            color: colors.danger,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function extractTags(text: string): string[] {
  const matches = text.match(/#[\w฀-๿-]+/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1))));
}
