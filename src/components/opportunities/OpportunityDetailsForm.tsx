import { TRACK_DETAILS, normalizeOrgPickerValue, type DetailFieldSpec } from '../../types/opportunityDetails';
import type { TrackKey } from '../../types/opportunity';
import { LInput, LTextarea, LSelect, LLabel } from '../primitives';
import { OrgPicker } from '../forms/OrgPicker';
import { findTrack } from '../../types/opportunity';
import { colors } from '../../styles/tokens';

interface OpportunityDetailsFormProps {
  track: TrackKey;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

export function OpportunityDetailsForm({ track, values, onChange }: OpportunityDetailsFormProps) {
  const fields = TRACK_DETAILS[track] ?? [];
  const meta = findTrack(track);

  const set = (key: string, val: unknown) => {
    onChange({ ...values, [key]: val });
  };

  if (fields.length === 0) return null;

  return (
    <div>
      <div
        style={{
          marginBottom: 14,
          padding: '8px 12px',
          background: meta.color.soft,
          border: `1px solid ${meta.color.chip}`,
          borderRadius: '8px 0 8px 0',
          fontSize: 11,
          color: meta.color.ink,
          letterSpacing: 0.5,
          fontWeight: 600,
          display: 'inline-block',
        }}
      >
        {meta.name.toUpperCase()}-SPECIFIC DETAILS
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {fields.map((spec) => (
          <FieldRender key={spec.key} spec={spec} value={values[spec.key]} onChange={(v) => set(spec.key, v)} />
        ))}
      </div>
    </div>
  );
}

function FieldRender({
  spec,
  value,
  onChange,
}: {
  spec: DetailFieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const fullWidth = spec.type === 'textarea' || spec.type === 'org_picker';

  let control: React.ReactNode;
  if (spec.type === 'org_picker') {
    const orgVal = normalizeOrgPickerValue(value);
    control = (
      <OrgPicker
        value={orgVal}
        onChange={(v) => onChange(v.org_id || v.org_name ? v : null)}
      />
    );
  } else if (spec.type === 'textarea') {
    const strVal = value === null || value === undefined ? '' : String(value);
    control = (
      <LTextarea value={strVal} onChange={(v) => onChange(v || null)} placeholder={spec.placeholder} rows={3} />
    );
  } else if (spec.type === 'select') {
    const strVal = value === null || value === undefined ? '' : String(value);
    control = (
      <LSelect
        value={strVal}
        onChange={(v) => onChange(v || null)}
        options={[{ value: '', label: '—' }, ...(spec.options ?? []).map((o) => ({ value: o, label: o }))]}
      />
    );
  } else {
    const strVal = value === null || value === undefined ? '' : String(value);
    control = (
      <LInput
        type={spec.type === 'number' ? 'number' : spec.type === 'date' ? 'date' : spec.type === 'url' ? 'url' : 'text'}
        value={strVal}
        onChange={(v) => onChange(v || null)}
        placeholder={spec.placeholder}
      />
    );
  }

  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
      <LLabel>{spec.label}</LLabel>
      {control}
      {spec.helpText && (
        <div style={{ fontSize: 10.5, color: colors.dim, marginTop: 4, letterSpacing: 0.3 }}>{spec.helpText}</div>
      )}
    </div>
  );
}
