/**
 * TripBudgetCard — shows estimated vs actual cost rollup for a trip/event.
 *
 * Data sources:
 *  - opportunity.details.estimated_cost / actual_cost / currency (rolls everything up)
 *  - opportunity.details.cost (per-person event cost · for fallback display)
 *  - trip_stops (no cost per stop today, but reserved for future per-stop tracking)
 *
 * Lets user enter / update `actual_cost` inline.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useUpdateOpportunity } from '../../hooks/useOpportunities';
import type { OpportunityRow } from '../../types/opportunity';
import { LCard, LBtn, LInput, LLabel, LIcon } from '../primitives';
import { colors } from '../../styles/tokens';

interface TripBudgetCardProps {
  opp: OpportunityRow;
}

function asNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function TripBudgetCard({ opp }: TripBudgetCardProps) {
  const update = useUpdateOpportunity();
  const details = (opp.details ?? {}) as Record<string, unknown>;
  const currency = (details.currency as string) || 'THB';
  const estimated = asNumber(details.estimated_cost) ?? asNumber(details.cost) ?? 0;
  const initialActual = asNumber(details.actual_cost);

  const [editing, setEditing] = useState(false);
  const [actualDraft, setActualDraft] = useState<string>(initialActual?.toString() ?? '');

  useEffect(() => {
    setActualDraft(initialActual?.toString() ?? '');
  }, [initialActual]);

  const actual = asNumber(actualDraft);
  // Show the variance whenever an actual is entered — even with no estimate
  // (variance = full actual as overspend). Only the percentage needs a
  // non-zero estimate to avoid divide-by-zero.
  const variance = actual != null ? actual - estimated : null;
  const variancePct = variance != null && estimated > 0 ? (variance / estimated) * 100 : null;

  const handleSave = async () => {
    const newActual = asNumber(actualDraft);
    // Refetch the latest details first so we don't overwrite concurrent edits
    // to other detail fields (e.g. someone editing agenda while we save cost).
    const { data: fresh } = await supabase
      .from('opportunities')
      .select('details')
      .eq('id', opp.id)
      .single();
    const freshDetails = (fresh as { details?: Record<string, unknown> } | null)?.details;
    const latestDetails = (freshDetails ?? details) as Record<string, unknown>;
    update.mutate(
      {
        id: opp.id,
        patch: {
          details: { ...latestDetails, actual_cost: newActual },
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  // If no budget data at all and no edit happening, hide the card
  if (estimated === 0 && initialActual == null && !editing) {
    return (
      <LCard padding={18}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: colors.dim,
                textTransform: 'uppercase',
              }}
            >
              <LIcon kind="money" size={10} color={colors.dim} /> BUDGET
            </div>
            <div style={{ fontSize: 12, color: colors.dimSoft, marginTop: 4 }}>
              ยังไม่มี budget · กด <b style={{ color: colors.text }}>แก้ไข</b> เพื่อกรอก estimated/actual cost
            </div>
          </div>
          <LBtn small ghost onClick={() => setEditing(true)}>
            + Add budget
          </LBtn>
        </div>
      </LCard>
    );
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
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: colors.green,
            textTransform: 'uppercase',
          }}
        >
          <LIcon kind="money" size={11} color={colors.green} /> BUDGET TRACKING
        </div>
        {!editing && (
          <LBtn small ghost onClick={() => setEditing(true)}>
            แก้ไข actual
          </LBtn>
        )}
      </div>

      <div style={{ padding: 18 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 18,
          }}
        >
          {/* Estimated */}
          <div>
            <div style={{ fontSize: 10, color: colors.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
              ESTIMATED
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: colors.text, fontFamily: "'IBM Plex Mono', monospace" }}>
              {estimated > 0 ? formatCurrency(estimated, currency) : '—'}
            </div>
            <div style={{ fontSize: 10.5, color: colors.dim, marginTop: 4 }}>ตั้งใจไว้</div>
          </div>

          {/* Actual */}
          <div>
            <div style={{ fontSize: 10, color: colors.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
              ACTUAL
            </div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <LInput
                  type="number"
                  value={actualDraft}
                  onChange={setActualDraft}
                  placeholder="0"
                />
                <LLabel>(หน่วย: {currency})</LLabel>
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: initialActual != null ? colors.text : colors.dim,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {initialActual != null ? formatCurrency(initialActual, currency) : '—'}
                </div>
                <div style={{ fontSize: 10.5, color: colors.dim, marginTop: 4 }}>
                  {initialActual != null ? 'จ่ายจริง' : 'ยังไม่ได้กรอก'}
                </div>
              </>
            )}
          </div>

          {/* Variance */}
          <div>
            <div style={{ fontSize: 10, color: colors.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
              VARIANCE
            </div>
            {variance != null ? (
              <>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: variance > 0 ? colors.danger : variance < 0 ? colors.green : colors.text,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {variance > 0 ? '+' : ''}{formatCurrency(variance, currency)}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: colors.dim,
                    marginTop: 4,
                  }}
                >
                  {variancePct != null ? `${variancePct > 0 ? '+' : ''}${variancePct.toFixed(1)}%` : ''}
                  {variance > 0 ? ' over budget' : variance < 0 ? ' under budget' : ' on target'}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 22, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>—</div>
            )}
          </div>
        </div>

        {editing && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <LBtn small ghost onClick={() => {
              setEditing(false);
              setActualDraft(initialActual?.toString() ?? '');
            }}>
              ยกเลิก
            </LBtn>
            <LBtn small primary onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? 'กำลังบันทึก…' : 'บันทึก'}
            </LBtn>
          </div>
        )}
      </div>
    </LCard>
  );
}
