import { useState } from 'react';
import {
  useContactCommitments,
  useCreateCommitment,
  useUpdateCommitment,
  useDeleteCommitment,
  type CommitmentRow,
} from '../../hooks/useCommitments';
import { LBtn, LInput, LLabel, LIcon } from '../primitives';
import { colors } from '../../styles/tokens';
import { todayLocalISO } from '../../lib/dateUtil';
import { useConfirm } from '../modals/ConfirmProvider';

interface Props {
  contactId: string;
}

function todayISO(): string {
  return todayLocalISO();
}

export function CommitmentsSection({ contactId }: Props) {
  const { data: commitments = [], isLoading } = useContactCommitments(contactId);
  const create = useCreateCommitment();
  const update = useUpdateCommitment();
  const del = useDeleteCommitment();
  const confirm = useConfirm();

  const [addingDirection, setAddingDirection] = useState<'i_owe' | 'they_owe' | null>(null);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const iOwe = commitments.filter((c) => c.direction === 'i_owe');
  const theyOwe = commitments.filter((c) => c.direction === 'they_owe');

  const handleAdd = async () => {
    if (!addingDirection) return;
    setError(null);
    if (!description.trim()) {
      setError('ใส่รายละเอียดที่สัญญาไว้');
      return;
    }
    try {
      await create.mutateAsync({
        contact_id: contactId,
        direction: addingDirection,
        description: description.trim(),
        date_made: todayISO(),
        due_date: dueDate || null,
        status: 'open',
      });
      setDescription('');
      setDueDate('');
      setAddingDirection(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleStatus = (c: CommitmentRow) => {
    const next = c.status === 'open' ? 'done' : 'open';
    update.mutate({ id: c.id, patch: { status: next } });
  };

  return (
    <div>
      {isLoading && commitments.length === 0 && (
        <div style={{ padding: 12, color: colors.dim, fontSize: 12 }}>กำลังโหลด…</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <CommitmentColumn
          title="ฉัน → เขา"
          subtitle="I owe them"
          accent={colors.green}
          commitments={iOwe}
          onAdd={() => setAddingDirection('i_owe')}
          onToggle={handleToggleStatus}
          onDelete={async (c) => {
            if (await confirm({ title: 'ลบ commitment นี้?', danger: true })) del.mutate({ id: c.id, contactId });
          }}
        />
        <CommitmentColumn
          title="เขา → ฉัน"
          subtitle="They owe me"
          accent="#d96a66"
          commitments={theyOwe}
          onAdd={() => setAddingDirection('they_owe')}
          onToggle={handleToggleStatus}
          onDelete={async (c) => {
            if (await confirm({ title: 'ลบ commitment นี้?', danger: true })) del.mutate({ id: c.id, contactId });
          }}
        />
      </div>

      {addingDirection && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            background: colors.bgSoft,
            border: `1px solid ${addingDirection === 'i_owe' ? colors.greenDk : colors.dangerDk}`,
            borderRadius: '12px 0 12px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: addingDirection === 'i_owe' ? colors.green : colors.danger,
            }}
          >
            {addingDirection === 'i_owe' ? '+ Add: ฉันสัญญาว่าจะทำให้เขา' : '+ Add: เขาสัญญาว่าจะให้ฉัน'}
          </div>

          <div>
            <LLabel required>รายละเอียด</LLabel>
            <LInput
              value={description}
              onChange={setDescription}
              placeholder="เช่น ส่ง deck ภายในวันศุกร์ · แนะนำ Khun Lek"
            />
          </div>

          <div style={{ maxWidth: 200 }}>
            <LLabel>กำหนดส่ง (optional)</LLabel>
            <LInput type="date" value={dueDate} onChange={setDueDate} />
          </div>

          {error && (
            <div
              style={{
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

          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <LBtn
              ghost
              small
              onClick={() => {
                setAddingDirection(null);
                setDescription('');
                setDueDate('');
              }}
            >
              ยกเลิก
            </LBtn>
            <LBtn primary small onClick={handleAdd} disabled={create.isPending}>
              {create.isPending ? 'กำลังบันทึก…' : 'เพิ่ม'}
            </LBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function CommitmentColumn({
  title,
  subtitle,
  accent,
  commitments,
  onAdd,
  onToggle,
  onDelete,
}: {
  title: string;
  subtitle: string;
  accent: string;
  commitments: CommitmentRow[];
  onAdd: () => void;
  onToggle: (c: CommitmentRow) => void;
  onDelete: (c: CommitmentRow) => void;
}) {
  const today = todayISO();
  const overdueCount = commitments.filter((c) => c.status === 'open' && c.due_date && c.due_date < today).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.8,
              color: accent,
              textTransform: 'uppercase',
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 10.5, color: colors.dim, marginTop: 2 }}>
            {subtitle} · {commitments.length} total
            {overdueCount > 0 && (
              <span style={{ color: colors.danger, marginLeft: 6, fontWeight: 700 }}>· {overdueCount} OVERDUE</span>
            )}
          </div>
        </div>
        <LBtn small ghost onClick={onAdd}>
          <LIcon kind="plus" size={11} color={colors.dimSoft} /> ADD
        </LBtn>
      </div>

      {commitments.length === 0 ? (
        <div
          style={{
            padding: 14,
            background: colors.bgSoft,
            border: `1px dashed ${colors.line}`,
            borderRadius: '10px 0 10px 0',
            color: colors.dim,
            fontSize: 11.5,
            textAlign: 'center',
          }}
        >
          ไม่มี
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {commitments.map((c) => {
            const isDone = c.status === 'done';
            const isOverdue = c.status === 'open' && c.due_date && c.due_date < today;
            return (
              <div
                key={c.id}
                style={{
                  padding: '8px 10px',
                  background: colors.bgSoft,
                  border: `1px solid ${isOverdue ? colors.dangerDk : colors.line}`,
                  borderRadius: '8px 0 8px 0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  opacity: isDone ? 0.6 : 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => onToggle(c)}
                  title={isDone ? 'Mark open' : 'Mark done'}
                  style={{
                    width: 16,
                    height: 16,
                    background: isDone ? accent : 'transparent',
                    border: `1.5px solid ${accent}`,
                    borderRadius: '4px 0 4px 0',
                    cursor: 'pointer',
                    color: colors.bg,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {isDone && '✓'}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: colors.text,
                      lineHeight: 1.4,
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}
                  >
                    {c.description}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: isOverdue ? colors.danger : colors.dim,
                      marginTop: 2,
                      fontFamily: "'IBM Plex Mono', monospace",
                      letterSpacing: 0.3,
                    }}
                  >
                    {c.due_date ? `due ${c.due_date}${isOverdue ? ' · OVERDUE' : ''}` : 'no due date'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(c)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.dim,
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 0,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = colors.danger)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = colors.dim)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
