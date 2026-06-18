import { useState } from 'react';
import { BriefingEditor } from './BriefingEditor';
import { BRIEFING_PARTS, visibleSections, type BriefingData, type TripScope } from '../../types/briefing';
import { useUpdateOpportunity } from '../../hooks/useOpportunities';
import { LBtn, LIcon } from '../primitives';
import { colors } from '../../styles/tokens';

interface Props {
  oppId: string;
  scope: TripScope | null;
  briefing: BriefingData | null;
}

const SCOPES: { value: TripScope; th: string; flag: string }[] = [
  { value: 'domestic', th: 'ในประเทศ', flag: '🇹🇭' },
  { value: 'international', th: 'ต่างประเทศ', flag: '🌏' },
];

/** Count sections that have any content, per part — for the collapsed summary. */
function filledCount(part: (typeof BRIEFING_PARTS)[number], data: BriefingData, scope: TripScope) {
  const secs = visibleSections(part, scope);
  const filled = secs.filter((s) => {
    const d = data[s.id];
    if (!d) return false;
    return JSON.stringify(d).replace(/[\[\]{}":,]/g, '').replace(/blocks|checked|false|status|text|fields|success|minimum|target|stretch|primary|secondary/g, '').trim().length > 0;
  }).length;
  return { filled, total: secs.length };
}

export function TripBriefingPanel({ oppId, scope, briefing }: Props) {
  const update = useUpdateOpportunity();
  const [editing, setEditing] = useState(false);
  const effectiveScope: TripScope = scope ?? 'domestic';
  const data = (briefing ?? {}) as BriefingData;

  const setScope = (s: TripScope) => {
    update.mutate({ id: oppId, patch: { trip_scope: s } });
  };

  const handleSave = (next: BriefingData) => {
    update.mutate(
      { id: oppId, patch: { briefing: next } },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <div
      style={{
        border: `1px solid ${colors.line}`,
        borderRadius: '14px 4px 14px 4px',
        background: colors.bgCard,
        padding: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.green, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LIcon kind="plane" size={12} color={colors.green} /> Trip Intelligence Briefing
        </div>
        {/* Scope toggle — Domestic / International (#1) */}
        <div style={{ display: 'inline-flex', border: `1px solid ${colors.lineHi}`, borderRadius: '8px 2px 8px 2px', overflow: 'hidden' }}>
          {SCOPES.map((s) => {
            const active = effectiveScope === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setScope(s.value)}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: active ? 700 : 400,
                  padding: '5px 12px',
                  background: active ? colors.greenBg : 'transparent',
                  color: active ? colors.green : colors.dimSoft,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {s.flag} {s.th}
              </button>
            );
          })}
        </div>
      </div>

      {!scope && (
        <div style={{ fontSize: 11.5, color: colors.warn, marginBottom: 10 }}>
          ⚠ ยังไม่ได้เลือกประเภททริป — เลือก ในประเทศ / ต่างประเทศ ด้านบน (ค่าเริ่มต้น: ในประเทศ)
        </div>
      )}

      {editing ? (
        <BriefingEditor
          scope={effectiveScope}
          value={data}
          saving={update.isPending}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            {BRIEFING_PARTS.map((part) => {
              const { filled, total } = filledCount(part, data, effectiveScope);
              return (
                <div key={part.id} style={{ border: `1px solid ${colors.line}`, borderRadius: '8px 2px 8px 2px', padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: colors.dimSoft }}>Part {part.id} · {part.th}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: filled > 0 ? colors.green : colors.dim, marginTop: 2 }}>
                    {filled}/{total}
                  </div>
                </div>
              );
            })}
          </div>
          <LBtn primary small onClick={() => setEditing(true)}>
            {Object.keys(data).length ? 'แก้ไข Briefing' : 'เริ่มกรอก Briefing'}
          </LBtn>
        </>
      )}
    </div>
  );
}
