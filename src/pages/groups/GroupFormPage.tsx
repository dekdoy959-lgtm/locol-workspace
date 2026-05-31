import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGroup,
  useGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
} from '../../hooks/useGroups';
import { CADENCE_PRESETS } from '../../types/group';
import { LCard, LH, LBtn, LInput, LSelect, LLabel, LNote, LErrorBanner, LDangerBtn } from '../../components/primitives';
import { FormSection } from '../../components/forms/FormSection';
import { RuleEditor } from '../../components/groups/RuleEditor';
import { EMPTY_RULE, type Rule } from '../../lib/smartGroupRules';
import { colors } from '../../styles/tokens';
import { useConfirm } from '../../components/modals/ConfirmProvider';

export function GroupFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: existing, isLoading } = useGroup(mode === 'edit' ? id : undefined);
  const { data: allGroups = [] } = useGroups();
  const create = useCreateGroup();
  const update = useUpdateGroup();
  const del = useDeleteGroup();
  const confirm = useConfirm();

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [cadence, setCadence] = useState<string>('');
  const [customCadence, setCustomCadence] = useState<string>('');
  const [isSmart, setIsSmart] = useState(false);
  const [rule, setRule] = useState<Rule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initializedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && existing && initializedIdRef.current !== existing.id) {
      initializedIdRef.current = existing.id;
      setName(existing.name);
      setParentId(existing.parent_id ?? '');
      if (existing.cadence_days) {
        const preset = CADENCE_PRESETS.find((p) => p.value === String(existing.cadence_days));
        if (preset) {
          setCadence(String(existing.cadence_days));
          setCustomCadence('');
        } else {
          setCadence('custom');
          setCustomCadence(String(existing.cadence_days));
        }
      }
      if (existing.rule) {
        setIsSmart(true);
        setRule(existing.rule as unknown as Rule);
      }
    }
  }, [mode, existing]);

  const parentOptions = [
    { value: '', label: 'ไม่มี (top-level group)' },
    ...allGroups
      .filter((g) => g.id !== id) // can't be own parent
      .map((g) => ({ value: g.id, label: g.name })),
  ];

  const cadenceOptions = [
    ...CADENCE_PRESETS,
    { value: 'custom', label: 'กำหนดเอง...' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('ต้องกรอกชื่อ group');
      return;
    }

    const cadenceDays =
      cadence === 'custom'
        ? customCadence
          ? Number(customCadence)
          : null
        : cadence
          ? Number(cadence)
          : null;

    const ruleToSave = isSmart ? (rule ?? EMPTY_RULE) : null;

    try {
      if (mode === 'create') {
        const created = await create.mutateAsync({
          name: name.trim(),
          parent_id: parentId || null,
          cadence_days: cadenceDays,
          rule: ruleToSave as unknown as Record<string, unknown> | null,
        });
        navigate(`/groups/${created.id}`);
      } else if (id) {
        await update.mutateAsync({
          id,
          patch: {
            name: name.trim(),
            parent_id: parentId || null,
            cadence_days: cadenceDays,
            rule: ruleToSave as unknown as Record<string, unknown> | null,
          },
        });
        navigate(`/groups/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!(await confirm({ title: 'ลบ group นี้?', body: 'Members จะไม่ถูกลบ แต่จะหลุดออกจาก group', danger: true }))) return;
    try {
      await del.mutateAsync(id);
      navigate('/groups');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (mode === 'edit' && isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>;
  }

  const submitting = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} style={{ padding: '28px 36px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <LNote>{mode === 'create' ? 'NEW GROUP' : 'EDIT GROUP'}</LNote>
          <div style={{ height: 12 }} />
          <LH level={2}>{mode === 'create' ? 'สร้าง Group ใหม่' : 'แก้ไข Group'}</LH>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <LBtn ghost onClick={() => navigate(mode === 'edit' && id ? `/groups/${id}` : '/groups')}>
            ยกเลิก
          </LBtn>
          <LBtn primary type="submit" disabled={submitting}>
            {submitting ? 'กำลังบันทึก…' : mode === 'create' ? 'สร้าง' : 'บันทึก'}
          </LBtn>
        </div>
      </div>

      {error && <LErrorBanner>{error}</LErrorBanner>}

      <LCard padding={28}>
        <FormSection title="Group Type">
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setIsSmart(false)}
              style={{
                flex: 1,
                padding: '14px 16px',
                background: !isSmart ? colors.bgSoft : 'transparent',
                border: `1px solid ${!isSmart ? colors.greenDk : colors.line}`,
                borderRadius: '10px 0 10px 0',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: !isSmart ? colors.green : colors.text,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                📁 Manual
              </div>
              <div style={{ fontSize: 11, color: colors.dimSoft, lineHeight: 1.4 }}>
                เพิ่ม / เอาคนออกเอง · เก็บ list คงที่
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSmart(true);
                if (!rule) setRule(EMPTY_RULE);
              }}
              style={{
                flex: 1,
                padding: '14px 16px',
                background: isSmart ? colors.warnBg : 'transparent',
                border: `1px solid ${isSmart ? colors.warnDk : colors.line}`,
                borderRadius: '10px 0 10px 0',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isSmart ? colors.warn : colors.text,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                ⚡ Smart
              </div>
              <div style={{ fontSize: 11, color: colors.dimSoft, lineHeight: 1.4 }}>
                Auto-update ตาม rule (เช่น Tier=1 + tag=vc) · ไม่ต้องเพิ่มเอง
              </div>
            </button>
          </div>
        </FormSection>

        <FormSection title="Group Info">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <LLabel required>ชื่อ Group</LLabel>
              <LInput value={name} onChange={setName} placeholder="เช่น Inner Circle, Clients, University Friends" />
            </div>
            <div>
              <LLabel>Parent Group (sub-group of...)</LLabel>
              <LSelect value={parentId} onChange={setParentId} options={parentOptions} />
            </div>
          </div>
        </FormSection>

        {isSmart && (
          <FormSection
            title="Smart Rule"
            description="กำหนด condition · members จะถูกคำนวณอัตโนมัติจากคนที่ match"
          >
            <RuleEditor value={rule} onChange={setRule} />
          </FormSection>
        )}

        <FormSection
          title="Cadence Override"
          description="ตั้งจังหวะติดต่อ override Tier default — ถ้า contact อยู่หลาย group ระบบจะใช้ cadence ที่สั้นที่สุด"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <LLabel>Cadence</LLabel>
              <LSelect value={cadence} onChange={setCadence} options={cadenceOptions} />
            </div>
            {cadence === 'custom' && (
              <div>
                <LLabel>กำหนดเป็นจำนวนวัน</LLabel>
                <LInput
                  type="number"
                  value={customCadence}
                  onChange={setCustomCadence}
                  placeholder="เช่น 45"
                />
              </div>
            )}
          </div>
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
            <LDangerBtn onClick={handleDelete} disabled={del.isPending}>
              ลบ Group
            </LDangerBtn>
          </div>
        )}
      </LCard>
    </form>
  );
}
