import { useState } from 'react';
import {
  BRIEFING_PARTS,
  OBJECTIVE_STATUS,
  RISK_LEVELS,
  visibleSections,
  visibleFields,
  type BriefingData,
  type BriefingField,
  type BriefingSection,
  type TripScope,
} from '../../types/briefing';
import { LInput, LTextarea, LSelect, LBtn } from '../primitives';
import { colors } from '../../styles/tokens';

// ── local data shapes (all partial; stored under briefing[section.id]) ──
type Fields = Record<string, string>;
type Repeatable = { blocks: Fields[] };
type Checklist = Record<string, { checked: boolean; detail: string }>;
type Objectives = {
  fields?: Fields;
  primary?: { text: string; status: string }[];
  secondary?: { text: string; status: string }[];
  success?: { minimum: string; target: string; stretch: string };
};
type Budget = Record<string, { budget: string; actual: string; note: string }>;
type Risk = Record<string, { detail: string; likelihood: string; impact: string; mitigation: string }>;

interface Props {
  scope: TripScope;
  value: BriefingData;
  saving?: boolean;
  onSave: (next: BriefingData) => void;
  onCancel: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: colors.dimSoft,
  marginBottom: 4,
  display: 'block',
};

function selOptions(options: string[]) {
  return [{ value: '', label: '—' }, ...options.map((o) => ({ value: o, label: o }))];
}

function FieldInput({ field, value, onChange }: { field: BriefingField; value: string; onChange: (v: string) => void }) {
  if (field.kind === 'textarea') return <LTextarea value={value} onChange={onChange} rows={2} placeholder={field.placeholder} />;
  if (field.kind === 'select') return <LSelect value={value} onChange={onChange} options={selOptions(field.options ?? [])} placeholder="—" />;
  return <LInput value={value} onChange={onChange} placeholder={field.placeholder} />;
}

function Labeled({ field, children }: { field: BriefingField; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>
        {field.th} <span style={{ color: colors.dim }}>· {field.en}</span>
        {field.intlOnly && <span style={{ color: colors.warn }}> · intl</span>}
      </span>
      {children}
    </label>
  );
}

export function BriefingEditor({ scope, value, saving, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<BriefingData>(value ?? {});
  const setSec = (id: string, data: unknown) => setDraft((d) => ({ ...d, [id]: data }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {BRIEFING_PARTS.map((part) => (
        <details key={part.id} open={part.id === 'A'} style={{ border: `1px solid ${colors.line}`, borderRadius: '12px 3px 12px 3px', overflow: 'hidden' }}>
          <summary
            style={{
              cursor: 'pointer',
              padding: '12px 16px',
              background: colors.bgSoft,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              color: colors.green,
            }}
          >
            Part {part.id} · {part.en} <span style={{ color: colors.dim, fontWeight: 400, textTransform: 'none' }}>— {part.th}</span>
          </summary>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 11.5, color: colors.dim, marginTop: -4 }}>{part.desc}</div>
            {visibleSections(part, scope).map((section) => (
              <SectionEditor
                key={section.id}
                section={section}
                scope={scope}
                data={draft[section.id]}
                onChange={(d) => setSec(section.id, d)}
              />
            ))}
          </div>
        </details>
      ))}

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          padding: '12px 0',
          background: `linear-gradient(transparent, ${colors.bg} 30%)`,
        }}
      >
        <LBtn ghost onClick={onCancel}>ยกเลิก</LBtn>
        <LBtn primary onClick={() => onSave(draft)} disabled={saving}>
          {saving ? 'กำลังบันทึก…' : 'บันทึก Briefing'}
        </LBtn>
      </div>
    </div>
  );
}

function SectionTitle({ section }: { section: BriefingSection }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.text }}>
        <span style={{ color: colors.green }}>{section.code}</span> · {section.th}
        <span style={{ color: colors.dim, fontWeight: 400 }}> · {section.en}</span>
      </div>
      {section.note && <div style={{ fontSize: 11, color: colors.dim, marginTop: 2 }}>{section.note}</div>}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: '10px 3px 10px 3px',
  padding: 14,
  background: colors.bgCard,
};

function SectionEditor({
  section,
  scope,
  data,
  onChange,
}: {
  section: BriefingSection;
  scope: TripScope;
  data: unknown;
  onChange: (d: unknown) => void;
}) {
  return (
    <div style={cardStyle}>
      <SectionTitle section={section} />
      {section.kind === 'fields' && <FieldsKind section={section} scope={scope} data={data as Fields} onChange={onChange} />}
      {section.kind === 'objectives' && <ObjectivesKind section={section} scope={scope} data={data as Objectives} onChange={onChange} />}
      {section.kind === 'checklist' && <ChecklistKind section={section} data={data as Checklist} onChange={onChange} />}
      {section.kind === 'repeatable' && <RepeatableKind section={section} scope={scope} data={data as Repeatable} onChange={onChange} />}
      {section.kind === 'budget' && <BudgetKind section={section} scope={scope} data={data as Budget} onChange={onChange} />}
      {section.kind === 'risk' && <RiskKind section={section} data={data as Risk} onChange={onChange} />}
    </div>
  );
}

function FieldsKind({ section, scope, data, onChange }: { section: BriefingSection; scope: TripScope; data: Fields; onChange: (d: Fields) => void }) {
  const d = data ?? {};
  const set = (k: string, v: string) => onChange({ ...d, [k]: v });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {visibleFields(section.fields, scope).map((f) => (
        <div key={f.key} style={{ gridColumn: f.kind === 'textarea' ? '1 / -1' : undefined }}>
          <Labeled field={f}>
            <FieldInput field={f} value={d[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
          </Labeled>
        </div>
      ))}
    </div>
  );
}

function ObjectiveList({ title, list, onChange }: { title: string; list: { text: string; status: string }[]; onChange: (next: { text: string; status: string }[]) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.dimSoft, margin: '8px 0 6px' }}>{title}</div>
      {list.map((o, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <LInput value={o.text} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, text: v } : x)))} placeholder="ระบุ objective" />
          </div>
          <div style={{ width: 130 }}>
            <LSelect value={o.status} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, status: v } : x)))} options={selOptions([...OBJECTIVE_STATUS])} placeholder="status" />
          </div>
          <LBtn small ghost onClick={() => onChange(list.filter((_, j) => j !== i))}>✕</LBtn>
        </div>
      ))}
      <LBtn small ghost onClick={() => onChange([...list, { text: '', status: '' }])}>+ เพิ่ม</LBtn>
    </div>
  );
}

function ObjectivesKind({ section, scope, data, onChange }: { section: BriefingSection; scope: TripScope; data: Objectives; onChange: (d: Objectives) => void }) {
  const d: Objectives = data ?? {};
  const fields = d.fields ?? {};
  const primary = d.primary ?? [];
  const secondary = d.secondary ?? [];
  const success = d.success ?? { minimum: '', target: '', stretch: '' };
  const update = (patch: Partial<Objectives>) => onChange({ ...d, ...patch });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {visibleFields(section.fields, scope).map((f) => (
          <div key={f.key} style={{ gridColumn: f.kind === 'textarea' ? '1 / -1' : undefined }}>
            <Labeled field={f}>
              <FieldInput field={f} value={fields[f.key] ?? ''} onChange={(v) => update({ fields: { ...fields, [f.key]: v } })} />
            </Labeled>
          </div>
        ))}
      </div>
      <ObjectiveList title="Primary Objectives — ต้องสำเร็จ" list={primary} onChange={(next) => update({ primary: next })} />
      <ObjectiveList title="Secondary Objectives — ควรสำเร็จ" list={secondary} onChange={(next) => update({ secondary: next })} />
      <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.dimSoft, margin: '10px 0 6px' }}>Success Criteria</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Labeled field={{ key: 'min', th: '🟡 Minimum', en: 'ขั้นต่ำ', kind: 'text' }}>
          <LInput value={success.minimum} onChange={(v) => update({ success: { ...success, minimum: v } })} />
        </Labeled>
        <Labeled field={{ key: 'tgt', th: '🟢 Target', en: 'เป้าหมาย', kind: 'text' }}>
          <LInput value={success.target} onChange={(v) => update({ success: { ...success, target: v } })} />
        </Labeled>
        <Labeled field={{ key: 'str', th: '🏆 Stretch', en: 'สูงสุด', kind: 'text' }}>
          <LInput value={success.stretch} onChange={(v) => update({ success: { ...success, stretch: v } })} />
        </Labeled>
      </div>
    </div>
  );
}

function ChecklistKind({ section, data, onChange }: { section: BriefingSection; data: Checklist; onChange: (d: Checklist) => void }) {
  const d = data ?? {};
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {(section.items ?? []).map((item) => {
        const row = d[item.key] ?? { checked: false, detail: '' };
        return (
          <div key={item.key} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={row.checked}
              onChange={(e) => onChange({ ...d, [item.key]: { ...row, checked: e.target.checked } })}
              style={{ accentColor: colors.green, width: 16, height: 16, flexShrink: 0 }}
            />
            <span style={{ fontSize: 12, color: row.checked ? colors.text : colors.dimSoft, width: 150, flexShrink: 0 }}>
              {item.th} <span style={{ color: colors.dim }}>· {item.en}</span>
            </span>
            <div style={{ flex: 1 }}>
              <LInput value={row.detail} onChange={(v) => onChange({ ...d, [item.key]: { ...row, detail: v } })} placeholder="รายละเอียด" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RepeatableKind({ section, scope, data, onChange }: { section: BriefingSection; scope: TripScope; data: Repeatable; onChange: (d: Repeatable) => void }) {
  const blocks = data?.blocks ?? [];
  const fields = visibleFields(section.blockFields, scope);
  const setBlock = (i: number, b: Fields) => onChange({ blocks: blocks.map((x, j) => (j === i ? b : x)) });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {blocks.map((block, i) => (
        <div key={i} style={{ border: `1px solid ${colors.line}`, borderRadius: '8px 2px 8px 2px', padding: 12, background: colors.bgSoft }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: colors.olive }}>{section.blockLabel} #{i + 1}</span>
            <LBtn small ghost onClick={() => onChange({ blocks: blocks.filter((_, j) => j !== i) })}>✕ ลบ</LBtn>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {fields.map((f) => (
              <div key={f.key} style={{ gridColumn: f.kind === 'textarea' ? '1 / -1' : undefined }}>
                <Labeled field={f}>
                  <FieldInput field={f} value={block[f.key] ?? ''} onChange={(v) => setBlock(i, { ...block, [f.key]: v })} />
                </Labeled>
              </div>
            ))}
          </div>
        </div>
      ))}
      <LBtn small ghost onClick={() => onChange({ blocks: [...blocks, {}] })}>+ เพิ่ม {section.blockLabel}</LBtn>
    </div>
  );
}

function BudgetKind({ section, scope, data, onChange }: { section: BriefingSection; scope: TripScope; data: Budget; onChange: (d: Budget) => void }) {
  const d = data ?? {};
  const cats = (section.categories ?? []).filter((c) => !c.intlOnly || scope === 'international');
  const num = (s: string) => Number((s ?? '').replace(/[^0-9.-]/g, '')) || 0;
  const totalB = cats.reduce((s, c) => s + num(d[c.key]?.budget ?? ''), 0);
  const totalA = cats.reduce((s, c) => s + num(d[c.key]?.actual ?? ''), 0);
  const set = (k: string, patch: Partial<{ budget: string; actual: string; note: string }>) => {
    const cur = d[k] ?? { budget: '', actual: '', note: '' };
    onChange({ ...d, [k]: { ...cur, ...patch } });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {cats.map((c) => {
        const row = d[c.key] ?? { budget: '', actual: '', note: '' };
        return (
          <div key={c.key} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.4fr', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: colors.dimSoft }}>{c.th} <span style={{ color: colors.dim }}>· {c.en}</span></span>
            <LInput value={row.budget} onChange={(v) => set(c.key, { budget: v })} placeholder="Budget ฿" />
            <LInput value={row.actual} onChange={(v) => set(c.key, { actual: v })} placeholder="Actual ฿" />
            <LInput value={row.note} onChange={(v) => set(c.key, { note: v })} placeholder="หมายเหตุ" />
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 18, justifyContent: 'flex-end', fontSize: 12, color: colors.text, marginTop: 6, fontWeight: 600 }}>
        <span>Budget: ฿{totalB.toLocaleString()}</span>
        <span>Actual: ฿{totalA.toLocaleString()}</span>
        <span style={{ color: totalA > totalB ? colors.danger : colors.green }}>Variance: ฿{(totalB - totalA).toLocaleString()}</span>
      </div>
    </div>
  );
}

function RiskKind({ section, data, onChange }: { section: BriefingSection; data: Risk; onChange: (d: Risk) => void }) {
  const d = data ?? {};
  const set = (k: string, patch: Partial<{ detail: string; likelihood: string; impact: string; mitigation: string }>) => {
    const cur = d[k] ?? { detail: '', likelihood: '', impact: '', mitigation: '' };
    onChange({ ...d, [k]: { ...cur, ...patch } });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(section.riskTypes ?? []).map((rt) => {
        const row = d[rt.key] ?? { detail: '', likelihood: '', impact: '', mitigation: '' };
        return (
          <div key={rt.key} style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.4fr 70px 70px 1.4fr', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: colors.dimSoft }}>{rt.th}</span>
            <LInput value={row.detail} onChange={(v) => set(rt.key, { detail: v })} placeholder="รายละเอียด" />
            <LSelect value={row.likelihood} onChange={(v) => set(rt.key, { likelihood: v })} options={selOptions([...RISK_LEVELS])} placeholder="โอกาส" />
            <LSelect value={row.impact} onChange={(v) => set(rt.key, { impact: v })} options={selOptions([...RISK_LEVELS])} placeholder="ผล" />
            <LInput value={row.mitigation} onChange={(v) => set(rt.key, { mitigation: v })} placeholder="Mitigation" />
          </div>
        );
      })}
    </div>
  );
}
