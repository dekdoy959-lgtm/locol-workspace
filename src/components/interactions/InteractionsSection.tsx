import { useState } from 'react';
import {
  useContactInteractions,
  useCreateInteraction,
  useDeleteInteraction,
  INTERACTION_CHANNELS,
  type InteractionRow,
} from '../../hooks/useInteractions';
import { useAuth } from '../../contexts/AuthContext';
import { LBtn, LInput, LTextarea, LSelect, LLabel, LIcon } from '../primitives';
import { colors } from '../../styles/tokens';

interface Props {
  contactId: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InteractionsSection({ contactId }: Props) {
  const { user } = useAuth();
  const { data: interactions = [], isLoading } = useContactInteractions(contactId);
  const create = useCreateInteraction();
  const del = useDeleteInteraction();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [channel, setChannel] = useState('Line');
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!summary.trim()) {
      setError('ใส่สรุปการคุย');
      return;
    }
    try {
      await create.mutateAsync({
        contact_id: contactId,
        date,
        channel,
        direction,
        summary: summary.trim(),
        outcome: outcome.trim() || null,
        logged_by: user?.id ?? null,
      });
      setSummary('');
      setOutcome('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
            color: colors.dim,
            fontWeight: 500,
          }}
        >
          {interactions.length} interactions logged
        </div>
        <LBtn small primary onClick={() => setOpen(!open)}>
          <LIcon kind="plus" size={11} color={colors.bg} /> LOG INTERACTION
        </LBtn>
      </div>

      {open && (
        <div
          style={{
            padding: 14,
            background: colors.bgSoft,
            border: `1px solid ${colors.greenDk}`,
            borderRadius: '12px 0 12px 0',
            marginBottom: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 8 }}>
            <div>
              <LLabel>Date</LLabel>
              <LInput type="date" value={date} onChange={setDate} />
            </div>
            <div>
              <LLabel>Channel</LLabel>
              <LSelect value={channel} onChange={setChannel} options={INTERACTION_CHANNELS.map((c) => ({ value: c, label: c }))} />
            </div>
            <div>
              <LLabel>Direction</LLabel>
              <LSelect
                value={direction}
                onChange={(v) => setDirection(v as 'inbound' | 'outbound')}
                options={[
                  { value: 'outbound', label: '→ Outbound (เราติดต่อเขา)' },
                  { value: 'inbound', label: '← Inbound (เขาติดต่อเรา)' },
                ]}
              />
            </div>
          </div>

          <div>
            <LLabel required>สรุปการคุย</LLabel>
            <LTextarea value={summary} onChange={setSummary} placeholder="คุยอะไรกันบ้าง · key points" rows={3} />
          </div>

          <div>
            <LLabel>ผลลัพธ์ / Outcome</LLabel>
            <LInput value={outcome} onChange={setOutcome} placeholder="agreed to / next step / ฯลฯ" />
          </div>

          {error && (
            <div
              style={{
                padding: 8,
                background: '#241010',
                border: '1px solid #5a1a18',
                borderRadius: '6px 0 6px 0',
                color: '#d96a66',
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <LBtn
              ghost
              small
              onClick={() => {
                setOpen(false);
                setSummary('');
                setOutcome('');
              }}
            >
              ยกเลิก
            </LBtn>
            <LBtn primary small onClick={handleSave} disabled={create.isPending}>
              {create.isPending ? 'กำลังบันทึก…' : 'LOG'}
            </LBtn>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: 12, color: colors.dim, fontSize: 12 }}>กำลังโหลด…</div>
      ) : interactions.length === 0 ? (
        <div
          style={{
            padding: 16,
            background: colors.bgSoft,
            border: `1px dashed ${colors.line}`,
            borderRadius: '10px 0 10px 0',
            color: colors.dim,
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          ยังไม่มี interaction logged — คลิก LOG INTERACTION เพื่อบันทึกการคุยครั้งแรก
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {interactions.map((it) => (
            <InteractionItem
              key={it.id}
              interaction={it}
              onDelete={() => {
                if (confirm('ลบ interaction นี้?')) del.mutate({ id: it.id, contactId });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InteractionItem({ interaction: it, onDelete }: { interaction: InteractionRow; onDelete: () => void }) {
  const dirColor = it.direction === 'outbound' ? colors.green : '#E8B923';
  const dirSym = it.direction === 'outbound' ? '→' : '←';

  return (
    <div
      style={{
        padding: 12,
        background: colors.bgSoft,
        border: `1px solid ${colors.line}`,
        borderRadius: '10px 0 10px 0',
        borderLeft: `3px solid ${dirColor}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 10,
            color: dirColor,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {dirSym} {it.direction}
        </span>
        <span
          style={{
            fontSize: 10,
            padding: '1px 6px',
            background: colors.bgCard,
            border: `1px solid ${colors.lineHi}`,
            borderRadius: '4px 0 4px 0',
            color: colors.dimSoft,
            letterSpacing: 0.4,
          }}
        >
          {it.channel ?? 'Other'}
        </span>
        <span style={{ fontSize: 11, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
          {it.date}
        </span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onDelete}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.dim,
            cursor: 'pointer',
            fontSize: 13,
            padding: 2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#d96a66')}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.dim)}
        >
          ×
        </button>
      </div>

      <div style={{ fontSize: 13.5, color: colors.text, lineHeight: 1.5 }}>{it.summary}</div>
      {it.outcome && (
        <div style={{ fontSize: 12, color: colors.dimSoft, marginTop: 6, fontStyle: 'italic' }}>
          → {it.outcome}
        </div>
      )}
    </div>
  );
}
