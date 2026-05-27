import { LInput, LLabel } from '../primitives';
import { MultiValueField } from './MultiValueField';
import { OrgPicker } from './OrgPicker';
import { colors } from '../../styles/tokens';
import type { OrgEntry } from '../../types/contact';

interface OrgFieldProps {
  value: OrgEntry[];
  onChange: (next: OrgEntry[]) => void;
}

const emptyOrg: OrgEntry = {
  org_id: null,
  org_name: '',
  role: null,
  start_date: null,
  end_date: null,
  is_current: false,
  is_primary: false,
};

export function OrgField({ value, onChange }: OrgFieldProps) {
  return (
    <MultiValueField<OrgEntry>
      items={value}
      onChange={onChange}
      emptyItem={emptyOrg}
      addLabel="เพิ่มองค์กร"
      renderItem={(item, idx, update) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 8 }}>
            <div>
              <LLabel>Organization</LLabel>
              <OrgPicker
                value={{ org_id: item.org_id, org_name: item.org_name }}
                onChange={(picked) => update({ ...item, org_id: picked.org_id, org_name: picked.org_name })}
              />
            </div>
            <div>
              <LLabel>Role / Title</LLabel>
              <LInput
                value={item.role ?? ''}
                onChange={(v) => update({ ...item, role: v || null })}
                placeholder="Role / Title"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <LLabel>Start Date</LLabel>
              <LInput
                type="date"
                value={item.start_date ?? ''}
                onChange={(v) => update({ ...item, start_date: v || null })}
              />
            </div>
            <div>
              <LLabel>{item.is_current ? 'End Date · ยังทำอยู่' : 'End Date'}</LLabel>
              <LInput
                type="date"
                value={item.end_date ?? ''}
                onChange={(v) => update({ ...item, end_date: v || null })}
                disabled={item.is_current}
                style={item.is_current ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 4 }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                color: colors.dimSoft,
                cursor: 'pointer',
                letterSpacing: 0.4,
              }}
            >
              <input
                type="checkbox"
                checked={item.is_current}
                onChange={(e) => {
                  const checked = e.target.checked;
                  update({ ...item, is_current: checked, end_date: checked ? null : item.end_date });
                }}
                style={{ accentColor: colors.green }}
              />
              CURRENT ORGANIZATION (ทำอยู่ตอนนี้)
            </label>

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                color: colors.dimSoft,
                cursor: 'pointer',
                letterSpacing: 0.4,
              }}
            >
              <input
                type="checkbox"
                checked={item.is_primary}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const next = value.map((o, i) => ({
                    ...o,
                    is_primary: i === idx ? checked : checked ? false : o.is_primary,
                  }));
                  onChange(next);
                }}
                style={{ accentColor: colors.green }}
              />
              PRIMARY (แสดงเป็นหลัก)
            </label>
          </div>
        </div>
      )}
    />
  );
}
