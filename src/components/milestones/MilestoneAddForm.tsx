import { useState } from 'react';
import { useCreateMilestone } from '../../hooks/useMilestones';
import { LInput, LTextarea, LBtn, LIcon } from '../primitives';
import type { MilestoneSide } from '../../types/milestone';
import { colors } from '../../styles/tokens';

interface MilestoneAddFormProps {
  contactId: string;
  side: MilestoneSide;
  currentUserId?: string;
}

export function MilestoneAddForm({ contactId, side, currentUserId }: MilestoneAddFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateMilestone();

  const handleSave = async () => {
    if (!title.trim()) return;
    await create.mutateAsync({
      contact_id: contactId,
      side,
      title: title.trim(),
      date: date || null,
      description: description.trim() || null,
      created_by: currentUserId ?? null,
    });
    setTitle('');
    setDate('');
    setDescription('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: 'transparent',
          border: `1px dashed ${colors.lineHi}`,
          borderRadius: '12px 0 12px 0',
          color: colors.dim,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          transition: 'color 150ms, border-color 150ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = colors.text;
          e.currentTarget.style.borderColor = colors.green;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = colors.dim;
          e.currentTarget.style.borderColor = colors.lineHi;
        }}
      >
        <LIcon kind="plus" size={11} color="currentColor" />
        เพิ่ม Milestone
      </button>
    );
  }

  return (
    <div
      style={{
        padding: 14,
        background: colors.bgSoft,
        border: `1px solid ${colors.greenDk}`,
        borderRadius: '12px 0 12px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <LInput value={title} onChange={setTitle} placeholder="Milestone title (เช่น Launch สินค้าใหม่)" autoFocus />
      <LInput type="date" value={date} onChange={setDate} />
      <LTextarea value={description} onChange={setDescription} placeholder="Description (optional)" rows={2} />
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <LBtn
          ghost
          small
          onClick={() => {
            setOpen(false);
            setTitle('');
            setDate('');
            setDescription('');
          }}
        >
          ยกเลิก
        </LBtn>
        <LBtn primary small onClick={handleSave} disabled={create.isPending || !title.trim()}>
          {create.isPending ? 'กำลังบันทึก…' : 'เพิ่ม'}
        </LBtn>
      </div>
    </div>
  );
}
