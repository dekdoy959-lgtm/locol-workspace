import { useState } from 'react';
import type { OpportunityRow } from '../../types/opportunity';
import { useUpdateOpportunity } from '../../hooks/useOpportunities';
import { LInput, LSelect, LBtn, LIcon } from '../primitives';
import { colors } from '../../styles/tokens';
import { daysFromTodayISO } from '../../lib/dateUtil';

interface FundingEntry {
  id: string;
  label: string;
  kind: 'submit' | 'payout' | 'report' | 'other';
  date: string;
  amount: string;
  done: boolean;
}

const KIND_OPTIONS = [
  { value: 'submit', label: '📤 ยื่น / ส่งเรื่อง' },
  { value: 'payout', label: '💰 ได้เงิน (งวด)' },
  { value: 'report', label: '📑 รายงานความคืบหน้า' },
  { value: 'other', label: 'อื่นๆ' },
];

function newEntry(): FundingEntry {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `f-${Date.now()}`;
  return { id, label: '', kind: 'payout', date: '', amount: '', done: false };
}

/**
 * Funding schedule for grant/competition (apply track) once accepted into a
 * programme — rounds of submission / payout, each with a date that flows into
 * the Calendar (kind funding_submit / funding_payout). Stored in details.funding.
 */
export function FundingScheduleSection({ opp }: { opp: OpportunityRow }) {
  const update = useUpdateOpportunity();
  const details = (opp.details ?? {}) as Record<string, unknown>;
  const initial = (Array.isArray(details.funding) ? (details.funding as FundingEntry[]) : []).map((e) => ({ ...newEntry(), ...e }));
  const [rows, setRows] = useState<FundingEntry[]>(initial);
  const [dirty, setDirty] = useState(false);

  const edit = (i: number, patch: Partial<FundingEntry>) => {
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setDirty(true);
  };
  const add = () => { setRows((r) => [...r, newEntry()]); setDirty(true); };
  const remove = (i: number) => { setRows((r) => r.filter((_, j) => j !== i)); setDirty(true); };

  const save = () => {
    update.mutate(
      { id: opp.id, patch: { details: { ...details, funding: rows } } },
      { onSuccess: () => setDirty(false) },
    );
  };

  const num = (s: string) => Number((s ?? '').replace(/[^0-9.-]/g, '')) || 0;
  const totalPayout = rows.filter((r) => r.kind === 'payout').reduce((s, r) => s + num(r.amount), 0);
  const receivedPayout = rows.filter((r) => r.kind === 'payout' && r.done).reduce((s, r) => s + num(r.amount), 0);

  return (
    <div style={{ border: `1px solid ${colors.line}`, borderRadius: '14px 0 14px 0', background: colors.bgCard, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.warn, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LIcon kind="money" size={12} color={colors.warn} /> รอบเงินทุน · Funding Schedule
        </div>
        {totalPayout > 0 && (
          <div style={{ fontSize: 11.5, color: colors.dimSoft }}>
            ได้แล้ว <b style={{ color: colors.green }}>฿{receivedPayout.toLocaleString()}</b> / ฿{totalPayout.toLocaleString()}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: colors.dim, marginBottom: 12 }}>
        ใส่รอบยื่น/รอบได้เงินของโครงการ — วันที่จะไปโผล่ใน Calendar อัตโนมัติ (📤 ยื่นทุน · 💰 ได้เงิน)
      </div>

      {rows.length === 0 && (
        <div style={{ fontSize: 12.5, color: colors.dim, marginBottom: 12 }}>ยังไม่มีรอบเงินทุน</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => {
          const days = r.date ? daysFromTodayISO(r.date) : null;
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1fr 0.9fr auto', gap: 8, alignItems: 'center' }}>
              <LInput value={r.label} onChange={(v) => edit(i, { label: v })} placeholder="เช่น งวด 1 / รายงาน Q1" />
              <LSelect value={r.kind} onChange={(v) => edit(i, { kind: v as FundingEntry['kind'] })} options={KIND_OPTIONS} />
              <LInput value={r.date} onChange={(v) => edit(i, { date: v })} type="date" />
              <LInput value={r.amount} onChange={(v) => edit(i, { amount: v })} placeholder="฿ จำนวน" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: r.done ? colors.green : colors.dim, whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={r.done} onChange={(e) => edit(i, { done: e.target.checked })} style={{ accentColor: colors.green }} />
                  {r.kind === 'payout' ? 'ได้แล้ว' : 'เสร็จ'}
                </label>
                <button type="button" onClick={() => remove(i)} style={{ background: 'transparent', border: 'none', color: colors.dim, cursor: 'pointer', fontSize: 13 }}>✕</button>
              </div>
              {days !== null && (
                <div style={{ gridColumn: '1 / -1', fontSize: 10.5, color: days < 0 ? colors.dim : days <= 7 ? colors.warn : colors.dim, marginTop: -4 }}>
                  {days < 0 ? `ผ่านมาแล้ว ${-days} วัน` : days === 0 ? 'วันนี้' : `อีก ${days} วัน`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <LBtn small ghost onClick={add}>+ เพิ่มรอบ</LBtn>
        {dirty && <LBtn small primary onClick={save} disabled={update.isPending}>{update.isPending ? 'กำลังบันทึก…' : 'บันทึก'}</LBtn>}
      </div>
    </div>
  );
}
