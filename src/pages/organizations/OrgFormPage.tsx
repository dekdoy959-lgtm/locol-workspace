import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useOrganization,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
} from '../../hooks/useOrganizations';
import { ORG_SIZE_OPTIONS, ORG_TYPE_OPTIONS, OUR_TIER_OPTIONS } from '../../types/organization';
import { RELATIONSHIP_STATUS_OPTIONS, type RelationshipStatus } from '../../types/contact';
import { LCard, LH, LBtn, LInput, LSelect, LLabel, LTextarea, LNote, LIcon } from '../../components/primitives';
import { TagsField } from '../../components/forms/TagsField';
import { FormSection } from '../../components/forms/FormSection';
import { colors } from '../../styles/tokens';
import { useConfirm } from '../../components/modals/ConfirmProvider';

export function OrgFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: existing, isLoading } = useOrganization(mode === 'edit' ? id : undefined);
  const create = useCreateOrganization();
  const update = useUpdateOrganization();
  const del = useDeleteOrganization();
  const confirm = useConfirm();

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [type, setType] = useState('');
  const [hq, setHq] = useState('');
  const [size, setSize] = useState('');
  const [founded, setFounded] = useState('');
  const [website, setWebsite] = useState('');
  const [ourTier, setOurTier] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>('known');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const initializedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && existing && initializedIdRef.current !== existing.id) {
      initializedIdRef.current = existing.id;
      setName(existing.name);
      setIndustry(existing.industry ?? '');
      setType(existing.type ?? '');
      setHq(existing.hq ?? '');
      setSize(existing.size ?? '');
      setFounded(existing.founded ? String(existing.founded) : '');
      setWebsite(existing.website ?? '');
      setOurTier(existing.our_tier ? String(existing.our_tier) : '');
      setRelationshipStatus((existing.relationship_status as RelationshipStatus) ?? 'cold');
      setNotes(existing.notes ?? '');
      setTags(existing.tags ?? []);
    }
  }, [mode, existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('ต้องกรอกชื่อ Organization');
      return;
    }
    const payload = {
      name: name.trim(),
      industry: industry.trim() || null,
      type: type || null,
      hq: hq.trim() || null,
      size: size || null,
      founded: founded ? Number(founded) : null,
      website: website.trim() || null,
      our_tier: ourTier ? (Number(ourTier) as 1 | 2 | 3) : null,
      relationship_status: relationshipStatus,
      notes: notes.trim() || null,
      tags,
    };
    try {
      if (mode === 'create') {
        const created = await create.mutateAsync(payload);
        navigate(`/organizations/${created.id}`);
      } else if (id) {
        await update.mutateAsync({ id, patch: payload });
        navigate(`/organizations/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!(await confirm({ title: 'ลบ organization นี้?', danger: true }))) return;
    try {
      await del.mutateAsync(id);
      navigate('/organizations');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (mode === 'edit' && isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>;
  }

  const submitting = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} style={{ padding: '28px 36px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <LNote>{mode === 'create' ? 'NEW ORG' : 'EDIT ORG'}</LNote>
          <div style={{ height: 12 }} />
          <LH level={2}>{mode === 'create' ? 'สร้าง Organization' : 'แก้ไข Organization'}</LH>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <LBtn ghost onClick={() => navigate(mode === 'edit' && id ? `/organizations/${id}` : '/organizations')}>
            ยกเลิก
          </LBtn>
          <LBtn primary type="submit" disabled={submitting}>
            {submitting ? 'กำลังบันทึก…' : mode === 'create' ? 'สร้าง' : 'บันทึก'}
          </LBtn>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            background: '#241010',
            border: '1px solid #5a1a18',
            borderRadius: '10px 0 10px 0',
            color: '#d96a66',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <LCard padding={28}>
        <FormSection title="Basic Info">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <LLabel required>Organization Name</LLabel>
              <LInput value={name} onChange={setName} placeholder="เช่น Wattana Logistics Co." />
            </div>
            <div>
              <LLabel>Type</LLabel>
              <LSelect value={type} onChange={setType} options={ORG_TYPE_OPTIONS} placeholder="เลือก type" />
            </div>
            <div>
              <LLabel>Industry</LLabel>
              <LInput value={industry} onChange={setIndustry} placeholder="Logistics, FoodTech, ..." />
            </div>
            <div>
              <LLabel>Headquarters</LLabel>
              <LInput value={hq} onChange={setHq} placeholder="Bangkok, TH" />
            </div>
            <div>
              <LLabel>Size</LLabel>
              <LSelect value={size} onChange={setSize} options={ORG_SIZE_OPTIONS} placeholder="เลือก size" />
            </div>
            <div>
              <LLabel>Founded</LLabel>
              <LInput type="number" value={founded} onChange={setFounded} placeholder="2018" />
            </div>
            <div>
              <LLabel>Website</LLabel>
              <LInput value={website} onChange={setWebsite} placeholder="https://..." />
            </div>
          </div>
        </FormSection>

        <FormSection title="Classification">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <LLabel required>Relationship · เรารู้จักไหม</LLabel>
              <LSelect
                value={relationshipStatus}
                onChange={(v) => setRelationshipStatus(v as RelationshipStatus)}
                options={RELATIONSHIP_STATUS_OPTIONS}
              />
            </div>
            <div>
              <LLabel>Our Tier</LLabel>
              <LSelect value={ourTier} onChange={setOurTier} options={OUR_TIER_OPTIONS} placeholder="เลือก tier" />
            </div>
          </div>
          <div>
            <LLabel>Tags</LLabel>
            <TagsField value={tags} onChange={setTags} placeholder="พิมพ์ tag เช่น vc, partner" />
          </div>
        </FormSection>

        <FormSection title="Notes" description="บันทึกเชิงกลยุทธ์เกี่ยวกับ org นี้ — แตกต่างจาก notes ส่วนตัวของ contact">
          <LTextarea value={notes} onChange={setNotes} placeholder="ความสำคัญ · ประวัติร่วมงาน · key insight" rows={4} />
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
              disabled={del.isPending}
              style={{
                background: 'transparent',
                color: '#d96a66',
                border: `1px solid #5a1a18`,
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
              <LIcon kind="warn" size={11} color="#d96a66" /> ลบ Org
            </button>
          </div>
        )}
      </LCard>
    </form>
  );
}
