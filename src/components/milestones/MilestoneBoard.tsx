import { useMemo } from 'react';
import { useMilestones } from '../../hooks/useMilestones';
import { SIDE_DESCRIPTION, SIDE_LABEL, type MilestoneSide } from '../../types/milestone';
import { MilestoneCard } from './MilestoneCard';
import { MilestoneAddForm } from './MilestoneAddForm';
import { colors } from '../../styles/tokens';

interface MilestoneBoardProps {
  contactId: string;
  currentUserId?: string;
}

const SIDE_ACCENT: Record<MilestoneSide, string> = {
  them: '#E8B923',
  us: colors.green,
  shared: '#9aa56a',
};

export function MilestoneBoard({ contactId, currentUserId }: MilestoneBoardProps) {
  const { data: milestones = [], isLoading } = useMilestones(contactId);

  const { them, us, shared } = useMemo(
    () => ({
      them: milestones.filter((m) => m.side === 'them'),
      us: milestones.filter((m) => m.side === 'us'),
      shared: milestones.filter((m) => m.side === 'shared'),
    }),
    [milestones],
  );

  if (isLoading) {
    return <div style={{ color: colors.dim, fontSize: 12, padding: 12 }}>กำลังโหลด milestones…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Shared milestones (span full width) */}
      <SideColumn
        side="shared"
        items={shared}
        contactId={contactId}
        currentUserId={currentUserId}
        emphasized
      />

      {/* 2-column: them vs us */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <SideColumn side="them" items={them} contactId={contactId} currentUserId={currentUserId} />
        <SideColumn side="us" items={us} contactId={contactId} currentUserId={currentUserId} />
      </div>
    </div>
  );
}

function SideColumn({
  side,
  items,
  contactId,
  currentUserId,
  emphasized = false,
}: {
  side: MilestoneSide;
  items: ReturnType<typeof useMilestones>['data'];
  contactId: string;
  currentUserId?: string;
  emphasized?: boolean;
}) {
  const accent = SIDE_ACCENT[side];
  const safeItems = items ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <header style={{ marginBottom: 2 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background: accent,
              borderRadius: 99,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: emphasized ? 14 : 13,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            {SIDE_LABEL[side]}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.dim }}>
            {safeItems.length}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: colors.dim,
            marginTop: 3,
            marginLeft: 16,
            letterSpacing: 0.3,
          }}
        >
          {SIDE_DESCRIPTION[side]}
        </div>
      </header>

      {safeItems.length === 0 && (
        <div
          style={{
            padding: 12,
            color: colors.dim,
            fontSize: 12,
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          {side === 'shared' ? 'ยังไม่มี shared milestone' : 'ยังไม่มี milestone'}
        </div>
      )}

      {safeItems.map((m) => (
        <MilestoneCard key={m.id} milestone={m} />
      ))}

      <MilestoneAddForm contactId={contactId} side={side} currentUserId={currentUserId} />
    </div>
  );
}
