import { LInput, LSelect, LLabel } from '../primitives';
import { MultiValueField } from './MultiValueField';
import { ADDRESS_LABEL_OPTIONS, type AddressEntry } from '../../types/contact';
import { COUNTRY_OPTIONS, THAI_PROVINCES } from '../../data/thai-provinces';

interface AddressFieldProps {
  value: AddressEntry[];
  onChange: (next: AddressEntry[]) => void;
}

const provinceOptions = THAI_PROVINCES.map((p) => ({
  value: p.th,
  label: `${p.th} · ${p.en}`,
}));

const emptyAddress: AddressEntry = {
  label: 'Home',
  country: 'Thailand',
  province: '',
  district: '',
  sub_district: '',
  postal_code: '',
  street: '',
};

export function AddressField({ value, onChange }: AddressFieldProps) {
  return (
    <MultiValueField<AddressEntry>
      items={value}
      onChange={onChange}
      emptyItem={emptyAddress}
      addLabel="เพิ่มที่อยู่"
      renderItem={(item, _, update) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
            <div>
              <LLabel>Label</LLabel>
              <LSelect
                value={item.label}
                onChange={(v) => update({ ...item, label: v })}
                options={ADDRESS_LABEL_OPTIONS}
              />
            </div>
            <div>
              <LLabel>ประเทศ</LLabel>
              <LSelect
                value={item.country || 'Thailand'}
                onChange={(v) => update({ ...item, country: v })}
                options={COUNTRY_OPTIONS}
              />
            </div>
          </div>

          {item.country === 'Thailand' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                <div>
                  <LLabel>จังหวัด</LLabel>
                  <LSelect
                    value={item.province}
                    onChange={(v) => update({ ...item, province: v })}
                    options={provinceOptions}
                    placeholder="เลือกจังหวัด"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 8 }}>
                <div>
                  <LLabel>อำเภอ / เขต</LLabel>
                  <LInput
                    value={item.district}
                    onChange={(v) => update({ ...item, district: v })}
                    placeholder="อำเภอเมือง"
                  />
                </div>
                <div>
                  <LLabel>ตำบล / แขวง</LLabel>
                  <LInput
                    value={item.sub_district}
                    onChange={(v) => update({ ...item, sub_district: v })}
                    placeholder="ตำบล..."
                  />
                </div>
                <div>
                  <LLabel>รหัสไปรษณีย์</LLabel>
                  <LInput
                    value={item.postal_code}
                    onChange={(v) => update({ ...item, postal_code: v })}
                    placeholder="10110"
                  />
                </div>
              </div>
              <div>
                <LLabel>ที่อยู่ (เลขที่ ซอย ถนน)</LLabel>
                <LInput
                  value={item.street}
                  onChange={(v) => update({ ...item, street: v })}
                  placeholder="123/45 ซอยสุขุมวิท 21 ถนนสุขุมวิท"
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <LLabel>State / Province</LLabel>
                  <LInput
                    value={item.province}
                    onChange={(v) => update({ ...item, province: v })}
                    placeholder="State / Province"
                  />
                </div>
                <div>
                  <LLabel>City</LLabel>
                  <LInput
                    value={item.district}
                    onChange={(v) => update({ ...item, district: v })}
                    placeholder="City"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
                <div>
                  <LLabel>Street Address</LLabel>
                  <LInput
                    value={item.street}
                    onChange={(v) => update({ ...item, street: v })}
                    placeholder="Street + number"
                  />
                </div>
                <div>
                  <LLabel>Postal Code</LLabel>
                  <LInput
                    value={item.postal_code}
                    onChange={(v) => update({ ...item, postal_code: v })}
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    />
  );
}
