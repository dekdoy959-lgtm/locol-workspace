import { useState } from 'react';
import { useUpdateMilestone, useDeleteMilestone } from '../../hooks/useMilestones';
import type { MilestoneRow, MilestoneSide } from '../../types/milestone';
import { LInput, LTextarea, LBtn, LIcon } from '../primitives';
import { colors } from '../../styles/tokens';
import { todayLocalISO } from '../../lib/dateUtil';
import { useConfirm } from '../modals/ConfirmProvider';

interface MilestoneCardProps {
  milestone: MilestoneRow;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

const SIDE_ACCENT: Record<MilestoneSide, { ink: string; bg: string; border: string }> = {
  them: { ink: '#E8B923', bg: '#241a06', border: '#5a3f10' },
  us: { ink: colors.green, bg: '#19250a', border: colors.greenDk },
  shared: { ink: '#9aa56a', bg: '#1d1f12', border: '#695935' },
};

export function MilestoneCard({ milestone }: MilestoneCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(milestone.title);
  const [date, setDate] = useState(milestone.date ?? '');
  const [description, setDescription] = useState(milestone.description ?? '');

  const update = useUpdateMilestone();
  const del = useDeleteMilestone();
  const confirm = useConfirm();
  const accent = SIDE_ACCENT[milestone.side];

  const handleSave = async () => {
    if (!title.trim()) return;
    await update.mutateAsync({
      id: milestone.id,
      patch: { title: title.trim(), date: date || null, description: description.trim() || null },
    });
    setEditing(false);
  };

  const handleToggleAchieved = async () => {
    await update.mutateAsync({
      id: milestone.id,
      patch: {
        achieved: !milestone.achieved,
        achieved_at: milestone.achieved ? null : todayLocalISO(),
      },
    });
  };

  const handleDelete = async () => {
    if (!(await confirm({ title: 'ลบ milestone นี้?', danger: true }))) return;
    await del.mutateAsync({ id: milestone.id, contactId: milestone.contact_id });
  };

  if (editing) {
    return (
      <div
        style={{
          padding: 14,
          background: colors.bgSoft,
          border: `1px solid ${accent.border}`,
          borderRadius: '12px 0 12px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <LInput value={title} onChange={setTitle} placeholder="Milestone title" />
        <LInput type="date" value={date} onChange={setDate} />
        <LTextarea value={description} onChange={setDescription} placeholder="Description" rows={2} />
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <LBtn ghost small onClick={() => setEditing(false)}>ยกเลิก</LBtn>
          <LBtn primary small onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? 'กำลังบันทึก…' : 'บันทึก'}
          </LBtn>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 14,
        background: milestone.achieved ? colors.bgSoft : colors.bgCard,
        border: `1px solid ${milestone.achieved ? colors.line : accent.border}`,
        borderRadius: '12px 0 12px 0',
        opacity: milestone.achieved ? 0.65 : 1,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <button
          type="button"
          onClick={handleToggleAchieved}
          title={milestone.achieved ? 'Mark as not done' : 'Mark as achieved'}
          style={{
            width: 18,
            height: 18,
            background: milestone.achieved ? accent.ink : 'transparent',
            border: `1.5px solid ${accent.ink}`,
            borderRadius: '4px 0 4px 0',
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.bg,
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          {milestone.achieved && '✓'}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: colors.text,
              textDecoration: milestone.achieved ? 'line-through' : 'none',
              lineHeight: 1.3,
            }}
          >
            {milestone.title}
          </div>
          {milestone.date && (
            <div
              style={{
                fontSize: 11,
                color: accent.ink,
                marginTop: 4,
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: 0.3,
              }}
            >
              {formatDate(milestone.date)}
            </div>
          )}
          {milestone.description && (
            <p style={{ margin: '8px 0 0', fontSize: 12.5, color: colors.dimSoft, lineHeight: 1.5 }}>
              {milestone.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="แก้ไข"
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.dim,
              cursor: 'pointer',
              padding: 4,
              fontSize: 11,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.dim)}
          >
            <LIcon kind="doc" size={13} color="currentColor" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            title="ลบ"
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.dim,
              cursor: 'pointer',
              padding: 4,
              fontSize: 11,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#d96a66')}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.dim)}
          >
            <LIcon kind="warn" size={13} color="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
