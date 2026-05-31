import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useContact,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
} from '../../hooks/useContacts';
import {
  LCard,
  LH,
  LBtn,
  LInput,
  LTextarea,
  LSelect,
  LLabel,
  LNote,
  LIcon,
} from '../../components/primitives';
import { MultiValueField } from '../../components/forms/MultiValueField';
import { FormSection } from '../../components/forms/FormSection';
import { TagsField } from '../../components/forms/TagsField';
import { AddressField } from '../../components/forms/AddressField';
import { OrgField } from '../../components/forms/OrgField';
import { FrequencyField } from '../../components/forms/FrequencyField';
import { AvatarUpload } from '../../components/forms/AvatarUpload';
import { contactInitials } from '../../types/contact';
import { colors } from '../../styles/tokens';
import { useConfirm } from '../../components/modals/ConfirmProvider';
import {
  CHANNEL_OPTIONS,
  EMAIL_LABEL_OPTIONS,
  PHONE_LABEL_OPTIONS,
  PRIORITY_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
  SOCIAL_PLATFORM_OPTIONS,
  TIER_OPTIONS,
  TIE_TYPE_OPTIONS,
  type AddressEntry,
  type ContactInsert,
  type EducationEntry,
  type EmailEntry,
  type FreqUnit,
  type OrgEntry,
  type PhoneEntry,
  type RelationshipStatus,
  type SocialEntry,
} from '../../types/contact';

interface FormState {
  first_name: string;
  last_name: string;
  nick_name: string;
  suffix: string;
  bio: string;
  birthday: string;
  birthday_notification_enabled: boolean;
  avatar_url: string | null;
  phones: PhoneEntry[];
  emails: EmailEntry[];
  addresses: AddressEntry[];
  socials: SocialEntry[];
  orgs: OrgEntry[];
  education: EducationEntry[];
  tier: string;
  tie_type: string;
  priority: string;
  relationship_status: RelationshipStatus;
  channel: string;
  freq_days: number | null;
  freq_unit: FreqUnit | null;
  met_story: string;
  value_exchange: string;
  tags: string[];
}

const emptyForm: FormState = {
  first_name: '',
  last_name: '',
  nick_name: '',
  suffix: '',
  bio: '',
  birthday: '',
  birthday_notification_enabled: false,
  avatar_url: null,
  phones: [],
  emails: [],
  addresses: [],
  socials: [],
  orgs: [],
  education: [],
  tier: '',
  tie_type: '',
  priority: '',
  relationship_status: 'known',
  channel: '',
  freq_days: null,
  freq_unit: null,
  met_story: '',
  value_exchange: '',
  tags: [],
};

// Migrate old address shape ({label, value}) to new structured shape on read.
function normalizeAddress(raw: unknown): AddressEntry {
  const r = raw as Partial<AddressEntry> & { value?: string };
  return {
    label: r.label ?? 'Home',
    country: r.country ?? 'Thailand',
    province: r.province ?? '',
    district: r.district ?? '',
    sub_district: r.sub_district ?? '',
    postal_code: r.postal_code ?? '',
    street: r.street ?? r.value ?? '',
  };
}

// Migrate old org shape (without dates) to new shape on read.
function normalizeOrg(raw: unknown): OrgEntry {
  const r = raw as Partial<OrgEntry>;
  return {
    org_id: r.org_id ?? null,
    org_name: r.org_name ?? '',
    role: r.role ?? null,
    start_date: r.start_date ?? null,
    end_date: r.end_date ?? null,
    is_current: r.is_current ?? false,
    is_primary: r.is_primary ?? false,
  };
}

export function ContactFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: existing, isLoading: loadingExisting } = useContact(mode === 'edit' ? id : undefined);
  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();
  const deleteMutation = useDeleteContact();
  const confirm = useConfirm();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initializedIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only initialize form once per contact id — prevents form reset on refetch
    if (mode === 'edit' && existing && initializedIdRef.current !== existing.id) {
      initializedIdRef.current = existing.id;
      setForm({
        first_name: existing.first_name,
        last_name: existing.last_name ?? '',
        nick_name: existing.nick_name ?? '',
        suffix: existing.suffix ?? '',
        bio: existing.bio ?? '',
        birthday: existing.birthday ?? '',
        birthday_notification_enabled: existing.birthday_notification_enabled ?? false,
        avatar_url: existing.avatar_url ?? null,
        phones: (existing.phones as PhoneEntry[]) ?? [],
        emails: (existing.emails as EmailEntry[]) ?? [],
        addresses: ((existing.addresses as unknown[]) ?? []).map(normalizeAddress),
        socials: (existing.socials as SocialEntry[]) ?? [],
        orgs: ((existing.orgs as unknown[]) ?? []).map(normalizeOrg),
        education: (existing.education as EducationEntry[]) ?? [],
        tier: existing.tier ? String(existing.tier) : '',
        tie_type: existing.tie_type ?? '',
        priority: existing.priority ?? '',
        relationship_status: (existing.relationship_status as RelationshipStatus) ?? 'cold',
        channel: existing.channel ?? '',
        freq_days: existing.freq_days,
        freq_unit: existing.freq_unit ?? null,
        met_story: existing.met_story ?? '',
        value_exchange: existing.value_exchange ?? '',
        tags: existing.tags ?? [],
      });
    }
  }, [mode, existing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!form.first_name.trim()) {
      setSubmitError('ต้องกรอก First Name');
      return;
    }

    const payload: ContactInsert = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      nick_name: form.nick_name.trim() || null,
      suffix: form.suffix.trim() || null,
      bio: form.bio.trim() || null,
      birthday: form.birthday || null,
      birthday_notification_enabled: form.birthday_notification_enabled,
      avatar_url: form.avatar_url,
      phones: form.phones.filter((p) => p.value.trim()),
      emails: form.emails.filter((e) => e.value.trim()),
      addresses: form.addresses.filter((a) => a.street.trim() || a.province.trim() || a.district.trim()),
      socials: form.socials.filter((s) => s.handle.trim()),
      orgs: form.orgs.filter((o) => o.org_name.trim()),
      education: form.education.filter((e) => e.school.trim()),
      tier: form.tier ? (Number(form.tier) as 1 | 2 | 3) : null,
      tie_type: (form.tie_type as 'Strong' | 'Bridge' | 'Weak') || null,
      priority: (form.priority as 'High' | 'Medium' | 'Low') || null,
      relationship_status: form.relationship_status,
      channel: form.channel || null,
      freq_days: form.freq_days,
      freq_unit: form.freq_unit,
      met_story: form.met_story.trim() || null,
      value_exchange: form.value_exchange.trim() || null,
      tags: form.tags,
    };

    try {
      if (mode === 'create') {
        const created = await createMutation.mutateAsync(payload);
        navigate(`/contacts/${created.id}`);
      } else if (id) {
        await updateMutation.mutateAsync({ id, patch: payload });
        navigate(`/contacts/${id}`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!(await confirm({ title: 'ลบ contact คนนี้?', body: 'การลบจะไม่สามารถย้อนคืนได้', danger: true }))) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/contacts');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  };

  if (mode === 'edit' && loadingExisting) {
    return <div style={{ padding: 40, color: colors.dim, fontSize: 13, textAlign: 'center' }}>กำลังโหลด…</div>;
  }

  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} style={{ padding: '28px 36px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <LNote>{mode === 'create' ? 'NEW CONTACT' : 'EDIT CONTACT'}</LNote>
          <div style={{ height: 12 }} />
          <LH level={2}>{mode === 'create' ? 'เพิ่ม Contact ใหม่' : 'แก้ไข Contact'}</LH>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <LBtn ghost onClick={() => navigate(mode === 'edit' && id ? `/contacts/${id}` : '/contacts')}>
            ยกเลิก
          </LBtn>
          <LBtn primary type="submit" disabled={submitting}>
            {submitting ? 'กำลังบันทึก…' : mode === 'create' ? 'สร้าง Contact' : 'บันทึก'}
          </LBtn>
        </div>
      </div>

      {submitError && (
        <div
          style={{
            padding: 12,
            background: colors.dangerBg,
            border: `1px solid ${colors.dangerDk}`,
            borderRadius: '10px 0 10px 0',
            color: colors.danger,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {submitError}
        </div>
      )}

      <LCard padding={28}>
        {/* Avatar */}
        <FormSection title="รูปโปรไฟล์">
          <AvatarUpload
            value={form.avatar_url}
            onChange={(v) => set('avatar_url', v)}
            initials={contactInitials({ first_name: form.first_name, last_name: form.last_name })}
            contactId={id}
          />
        </FormSection>

        {/* Basic Info */}
        <FormSection title="ข้อมูลพื้นฐาน">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="First Name" required>
              <LInput value={form.first_name} onChange={(v) => set('first_name', v)} placeholder="Somchai" />
            </Field>
            <Field label="Last Name">
              <LInput value={form.last_name} onChange={(v) => set('last_name', v)} placeholder="Wattana" />
            </Field>
            <Field label="Nickname">
              <LInput value={form.nick_name} onChange={(v) => set('nick_name', v)} placeholder="Chai" />
            </Field>
            <Field label="Suffix">
              <LInput value={form.suffix} onChange={(v) => set('suffix', v)} placeholder="Jr. / Sr. / PhD" />
            </Field>
            <Field label="Birthday">
              <LInput type="date" value={form.birthday} onChange={(v) => set('birthday', v)} />
              {form.birthday && (
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: colors.dimSoft,
                    cursor: 'pointer',
                    marginTop: 6,
                    letterSpacing: 0.3,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.birthday_notification_enabled}
                    onChange={(e) => set('birthday_notification_enabled', e.target.checked)}
                    style={{ accentColor: colors.green }}
                  />
                  แจ้งเตือนวันเกิด · เจ้าของจะได้รับ notification
                </label>
              )}
            </Field>
            <Field label="Preferred Channel">
              <LSelect
                value={form.channel}
                onChange={(v) => set('channel', v)}
                options={CHANNEL_OPTIONS}
                placeholder="เลือกช่องทาง"
              />
            </Field>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Bio">
              <LTextarea
                value={form.bio}
                onChange={(v) => set('bio', v)}
                placeholder="คำอธิบายสั้นๆ เกี่ยวกับคนนี้"
                rows={3}
              />
            </Field>
          </div>
        </FormSection>

        {/* Keep in Touch */}
        <FormSection title="Keep in Touch" description="ตั้งจังหวะติดต่อคนนี้ทุกๆ กี่วัน/สัปดาห์/เดือน/ปี — ระบบจะคำนวณ Health อัตโนมัติ">
          <div style={{ maxWidth: 380 }}>
            <LLabel>Frequency</LLabel>
            <FrequencyField
              freqDays={form.freq_days}
              freqUnit={form.freq_unit}
              onChange={(d, u) => {
                setForm((f) => ({ ...f, freq_days: d, freq_unit: u }));
              }}
            />
          </div>
        </FormSection>

        {/* Phones */}
        <FormSection title="เบอร์โทรศัพท์" description="ใส่ได้หลายเบอร์ — เลือก label ของแต่ละเบอร์">
          <MultiValueField<PhoneEntry>
            items={form.phones}
            onChange={(v) => set('phones', v)}
            emptyItem={{ label: 'Mobile', value: '' }}
            addLabel="เพิ่มเบอร์"
            renderItem={(item, _, update) => (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
                <LSelect value={item.label} onChange={(v) => update({ ...item, label: v })} options={PHONE_LABEL_OPTIONS} />
                <LInput value={item.value} onChange={(v) => update({ ...item, value: v })} placeholder="+66 81 234 5678" />
              </div>
            )}
          />
        </FormSection>

        {/* Emails */}
        <FormSection title="อีเมล" description="ใส่ได้หลายเมล">
          <MultiValueField<EmailEntry>
            items={form.emails}
            onChange={(v) => set('emails', v)}
            emptyItem={{ label: 'Work', value: '' }}
            addLabel="เพิ่มอีเมล"
            renderItem={(item, _, update) => (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
                <LSelect value={item.label} onChange={(v) => update({ ...item, label: v })} options={EMAIL_LABEL_OPTIONS} />
                <LInput
                  type="email"
                  value={item.value}
                  onChange={(v) => update({ ...item, value: v })}
                  placeholder="name@example.com"
                />
              </div>
            )}
          />
        </FormSection>

        {/* Addresses */}
        <FormSection title="ที่อยู่" description="แยกเป็นช่อง ประเทศ · จังหวัด · อำเภอ · ตำบล · รหัสไปรษณีย์">
          <AddressField value={form.addresses} onChange={(v) => set('addresses', v)} />
        </FormSection>

        {/* Socials */}
        <FormSection title="Social Profiles" description="Line, Facebook, LinkedIn, ฯลฯ">
          <MultiValueField<SocialEntry>
            items={form.socials}
            onChange={(v) => set('socials', v)}
            emptyItem={{ platform: 'Line', handle: '', url: null }}
            addLabel="เพิ่ม Social"
            renderItem={(item, _, update) => (
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 8 }}>
                <LSelect value={item.platform} onChange={(v) => update({ ...item, platform: v })} options={SOCIAL_PLATFORM_OPTIONS} />
                <LInput value={item.handle} onChange={(v) => update({ ...item, handle: v })} placeholder="@username" />
                <LInput
                  value={item.url ?? ''}
                  onChange={(v) => update({ ...item, url: v || null })}
                  placeholder="URL (optional)"
                />
              </div>
            )}
          />
        </FormSection>

        {/* Organizations */}
        <FormSection title="Organizations" description="ใส่ได้หลายองค์กร พร้อม start/end date · ติ๊ก Current ถ้ายังทำอยู่">
          <OrgField value={form.orgs} onChange={(v) => set('orgs', v)} />
        </FormSection>

        {/* Education */}
        <FormSection title="Education">
          <MultiValueField<EducationEntry>
            items={form.education}
            onChange={(v) => set('education', v)}
            emptyItem={{ school: '', degree: null, year: null }}
            addLabel="เพิ่มการศึกษา"
            renderItem={(item, _, update) => (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 80px', gap: 8 }}>
                <LInput
                  value={item.school}
                  onChange={(v) => update({ ...item, school: v })}
                  placeholder="University / School"
                />
                <LInput
                  value={item.degree ?? ''}
                  onChange={(v) => update({ ...item, degree: v || null })}
                  placeholder="Degree / Major"
                />
                <LInput
                  type="number"
                  value={item.year ? String(item.year) : ''}
                  onChange={(v) => update({ ...item, year: v ? Number(v) : null })}
                  placeholder="Year"
                />
              </div>
            )}
          />
        </FormSection>

        {/* Classification */}
        <FormSection title="Classification">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="Relationship · เรารู้จักไหม" required>
              <LSelect
                value={form.relationship_status}
                onChange={(v) => set('relationship_status', v as RelationshipStatus)}
                options={RELATIONSHIP_STATUS_OPTIONS}
              />
            </Field>
            <Field label="Tier">
              <LSelect value={form.tier} onChange={(v) => set('tier', v)} options={TIER_OPTIONS} placeholder="เลือก Tier" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Tie Type">
              <LSelect value={form.tie_type} onChange={(v) => set('tie_type', v)} options={TIE_TYPE_OPTIONS} placeholder="เลือก Tie Type" />
            </Field>
            <Field label="Priority">
              <LSelect value={form.priority} onChange={(v) => set('priority', v)} options={PRIORITY_OPTIONS} placeholder="เลือก Priority" />
            </Field>
          </div>
        </FormSection>

        {/* Story */}
        <FormSection title="ความสัมพันธ์">
          <Field label="เจอกันยังไง">
            <LTextarea
              value={form.met_story}
              onChange={(v) => set('met_story', v)}
              placeholder="พบที่งานสัมมนา · แนะนำโดย Khun Lek · ฯลฯ"
              rows={2}
            />
          </Field>
          <div style={{ height: 12 }} />
          <Field label="Value Exchange">
            <LTextarea
              value={form.value_exchange}
              onChange={(v) => set('value_exchange', v)}
              placeholder="ช่วยเหลือกันอะไรได้บ้าง"
              rows={2}
            />
          </Field>
          <div style={{ height: 12 }} />
          <Field label="Tags">
            <TagsField value={form.tags} onChange={(v) => set('tags', v)} />
          </Field>
        </FormSection>

        {mode === 'edit' && (
          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: `1px solid ${colors.line}`,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              style={{
                background: 'transparent',
                color: colors.danger,
                border: `1px solid ${colors.dangerDk}`,
                padding: '8px 16px',
                borderRadius: '10px 0 10px 0',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              <LIcon kind="warn" size={11} color={colors.danger} /> ลบ Contact
            </button>
          </div>
        )}
      </LCard>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <LLabel required={required}>{label}</LLabel>
      {children}
    </div>
  );
}
