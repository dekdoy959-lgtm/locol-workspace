import { useNavigate } from 'react-router-dom';
import type { LinkedOpportunity } from '../../hooks/useLinkedOpportunities';
import { findTrack, formatDueRelative } from '../../types/opportunity';
import { findStatusMeta } from '../../types/opportunityPeople';
import { LCard, LH, LIcon } from '../primitives';
import { colors } from '../../styles/tokens';

interface Props {
  opportunities: LinkedOpportunity[];
  title?: string;
  emptyText?: string;
}

export function LinkedOpportunities({ opportunities, title = 'CROSS-LAYER · OPPORTUNITIES', emptyText }: Props) {
  const navigate = useNavigate();

  if (opportunities.length === 0 && !emptyText) return null;

  return (
    <LCard padding={20}>
      <LH
        level={5}
        accent={false}
        color={colors.green}
        sub="Opportunities ที่ผูกกับ entity นี้ (เป็น Organizer / Attendee)"
      >
        {title} · {opportunities.length}
      </LH>

      {opportunities.length === 0 ? (
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
          {emptyText}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {opportunities.map((opp) => {
            const meta = findTrack(opp.track);
            const statusMeta = findStatusMeta(opp.link_status);

            return (
              <div
                key={`${opp.id}-${opp.link_role}`}
                onClick={() => navigate(`/inbox/${opp.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: colors.bgSoft,
                  border: `1px solid ${meta.color.chip}`,
                  borderRadius: '10px 0 10px 0',
                  cursor: 'pointer',
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgCard)}
                onMouseLeave={(e) => (e.currentTarget.style.background = colors.bgSoft)}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: meta.color.ink,
                    border: `1px solid ${meta.color.chip}`,
                    padding: '2px 6px',
                    borderRadius: '4px 0 4px 0',
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}
                >
                  {meta.name}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: colors.text, lineHeight: 1.3 }}>
                    {opp.title}
                  </div>
                  <div style={{ fontSize: 11, color: colors.dimSoft, marginTop: 2, display: 'flex', gap: 8 }}>
                    <span>{opp.stage}</span>
                    {opp.due_date && <span>· {formatDueRelative(opp.due_date)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <span
                    style={{
                      fontSize: 9,
                      color: opp.link_role === 'organizer' ? colors.green : colors.warn,
                      border: `1px solid ${opp.link_role === 'organizer' ? colors.greenDk : colors.warnDk}`,
                      background: opp.link_role === 'organizer' ? colors.greenBg : colors.warnBg,
                      padding: '1px 6px',
                      borderRadius: '4px 0 4px 0',
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {opp.link_role}
                  </span>
                  {statusMeta && (
                    <span
                      style={{
                        fontSize: 9,
                        color: statusMeta.color,
                        letterSpacing: 0.4,
                      }}
                    >
                      {statusMeta.label}
                    </span>
                  )}
                </div>
                <LIcon kind="arrow-r" size={11} color={colors.dim} />
              </div>
            );
          })}
        </div>
      )}
    </LCard>
  );
}
