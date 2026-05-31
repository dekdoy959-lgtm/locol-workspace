import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useContact, useContacts } from '../../hooks/useContacts';
import { useMergeContacts } from '../../hooks/useMergeContacts';
import { contactDisplayName, contactInitials, type ContactRow, type ContactUpdate } from '../../types/contact';
import { LCard, LH, LBtn, LNote, LIcon, LAvatar, LSelect } from '../../components/primitives';
import { colors } from '../../styles/tokens';
import { useConfirm } from '../../components/modals/ConfirmProvider';

type Side = 'A' | 'B';

interface FieldPickerProps<T> {
  label: string;
  a: T | null | undefined;
  b: T | null | undefined;
  side: Side;
  onPick: (side: Side) => void;
  render: (v: T | null | undefined) => React.ReactNode;
}

function FieldPicker<T>({ label, a, b, side, onPick, render }: FieldPickerProps<T>) {
  const aEmpty = a == null || a === '';
  const bEmpty = b == null || b === '';
  const sameVal = JSON.stringify(a) === JSON.stringify(b);

  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: `1px solid ${colors.line}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colors.dim,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <SidePick
          tone="A"
          selected={side === 'A'}
          disabled={aEmpty}
          onClick={() => onPick('A')}
          sameVal={sameVal}
        >
          {render(a)}
        </SidePick>
        <SidePick
          tone="B"
          selected={side === 'B'}
          disabled={bEmpty}
          onClick={() => onPick('B')}
          sameVal={sameVal}
        >
          {render(b)}
        </SidePick>
      </div>
    </div>
  );
}

function SidePick({
  children,
  tone,
  selected,
  disabled,
  onClick,
  sameVal,
}: {
  children: React.ReactNode;
  tone: Side;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  sameVal: boolean;
}) {
  const accent = tone === 'A' ? colors.green : colors.warn;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        textAlign: 'left',
        padding: '10px 12px',
        background: selected ? `${accent}15` : colors.bgSoft,
        border: `1px solid ${selected ? accent : colors.line}`,
        borderRadius: '10px 0 10px 0',
        color: disabled ? colors.dim : colors.text,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        position: 'relative',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 150ms',
      }}
    >
      {selected && !sameVal && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 8,
            fontSize: 10,
            color: accent,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          ✓
        </span>
      )}
      {sameVal && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 8,
            fontSize: 9,
            color: colors.dim,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          เหมือนกัน
        </span>
      )}
      {children}
    </button>
  );
}

function strField(v: string | null | undefined): React.ReactNode {
  if (!v) return <span style={{ color: colors.dim }}>—</span>;
  return v;
}

function arrayPreview(arr: unknown[] | null | undefined, render: (item: unknown) => string): React.ReactNode {
  if (!arr || arr.length === 0) return <span style={{ color: colors.dim }}>—</span>;
  return (
    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
      {arr.map((item, i) => (
        <div key={i}>{render(item)}</div>
      ))}
    </div>
  );
}

interface MergeState {
  first_name: Side;
  last_name: Side;
  nick_name: Side;
  suffix: Side;
  bio: Side;
  birthday: Side;
  birthday_notification_enabled: Side;
  avatar_url: Side;
  channel: Side;
  freq_days: Side;
  freq_unit: Side;
  tier: Side;
  tie_type: Side;
  priority: Side;
  met_story: Side;
  value_exchange: Side;

  // Arrays — merge mode
  phones: 'A' | 'B' | 'union';
  emails: 'A' | 'B' | 'union';
  addresses: 'A' | 'B' | 'union';
  socials: 'A' | 'B' | 'union';
  orgs: 'A' | 'B' | 'union';
  education: 'A' | 'B' | 'union';
  tags: 'A' | 'B' | 'union';
}

function defaultPick(a: ContactRow, b: ContactRow): MergeState {
  // Pick non-empty side; if both filled, pick the most recently updated
  const pickStr = <K extends keyof ContactRow>(key: K): Side => {
    const va = a[key];
    const vb = b[key];
    if (!va && vb) return 'B';
    if (va && !vb) return 'A';
    return a.updated_at >= b.updated_at ? 'A' : 'B';
  };

  return {
    first_name: pickStr('first_name'),
    last_name: pickStr('last_name'),
    nick_name: pickStr('nick_name'),
    suffix: pickStr('suffix'),
    bio: pickStr('bio'),
    birthday: pickStr('birthday'),
    birthday_notification_enabled: pickStr('birthday_notification_enabled'),
    avatar_url: pickStr('avatar_url'),
    channel: pickStr('channel'),
    freq_days: pickStr('freq_days'),
    freq_unit: pickStr('freq_unit'),
    tier: pickStr('tier'),
    tie_type: pickStr('tie_type'),
    priority: pickStr('priority'),
    met_story: pickStr('met_story'),
    value_exchange: pickStr('value_exchange'),
    phones: 'union',
    emails: 'union',
    addresses: 'union',
    socials: 'union',
    orgs: 'union',
    education: 'union',
    tags: 'union',
  };
}

function mergeArrays<T>(a: T[], b: T[], mode: 'A' | 'B' | 'union'): T[] {
  if (mode === 'A') return a;
  if (mode === 'B') return b;
  // Union with dedupe by JSON
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of [...a, ...b]) {
    const k = JSON.stringify(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

export function MergeContactsPage() {
  const { id: keptId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const sourceIdFromQuery = searchParams.get('with');

  const { data: keptContact, isLoading: loadingKept } = useContact(keptId);
  const { data: sourceContact, isLoading: loadingSource } = useContact(sourceIdFromQuery ?? undefined);
  const { data: allContacts = [] } = useContacts();

  const [sourcePick, setSourcePick] = useState<string>(sourceIdFromQuery ?? '');
  const merge = useMergeContacts();
  const [error, setError] = useState<string | null>(null);

  const otherContacts = useMemo(
    () => allContacts.filter((c) => c.id !== keptId).map((c) => ({ value: c.id, label: contactDisplayName(c) })),
    [allContacts, keptId],
  );

  const [state, setState] = useState<MergeState | null>(null);

  // When both contacts are loaded, init state. Use an effect for this side
  // effect — calling setState from inside useMemo (render phase) is an
  // anti-pattern that can warn/misbehave in React 19 strict mode.
  useEffect(() => {
    if (keptContact && sourceContact && state === null) {
      setState(defaultPick(keptContact, sourceContact));
    }
  }, [keptContact, sourceContact, state]);

  if (loadingKept) return <div style={{ padding: 40, color: colors.dim }}>กำลังโหลด…</div>;
  if (!keptContact) return <div style={{ padding: 40, color: colors.danger }}>ไม่พบ contact</div>;

  // No second contact picked yet — show picker
  if (!sourceContact) {
    return (
      <div style={{ padding: '28px 36px', maxWidth: 720, margin: '0 auto' }}>
        <button
          onClick={() => navigate(`/contacts/${keptId}`)}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.dim,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 11.5,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            padding: 0,
            marginBottom: 18,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <LIcon kind="arrow-r" size={11} color={colors.dim} /> {contactDisplayName(keptContact)}
        </button>

        <LNote>MERGE CONTACTS</LNote>
        <div style={{ height: 12 }} />
        <LH level={2} sub="เลือก contact อีกคนที่จะ merge เข้ากับคนนี้ — ข้อมูลทั้งหมดของอีกคนจะถูกย้ายมา และคนนั้นจะถูกลบ">
          เลือก Contact ที่จะรวม
        </LH>

        <LCard padding={24} style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <LAvatar initials={contactInitials(keptContact)} size={42} ring />
            <div>
              <div style={{ fontSize: 10, color: colors.green, letterSpacing: 1, textTransform: 'uppercase' }}>
                จะเก็บ · KEEP
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>
                {contactDisplayName(keptContact)}
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: `1px solid ${colors.line}`,
              paddingTop: 18,
            }}
          >
            <div style={{ fontSize: 10, color: colors.warn, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              จะถูกลบ · DELETE (ข้อมูลจะย้ายมารวมที่คนแรก)
            </div>
            <LSelect
              value={sourcePick}
              onChange={(v) => {
                setSourcePick(v);
                navigate(`/contacts/${keptId}/merge?with=${v}`, { replace: true });
              }}
              options={otherContacts}
              placeholder="เลือก contact ที่จะรวม"
            />
          </div>
        </LCard>

        {loadingSource && sourceIdFromQuery && (
          <div style={{ padding: 20, color: colors.dim, fontSize: 13 }}>กำลังโหลด…</div>
        )}
      </div>
    );
  }

  // Both loaded — show field picker
  if (!state) {
    return <div style={{ padding: 40, color: colors.dim }}>กำลังเตรียม…</div>;
  }

  const set = <K extends keyof MergeState>(key: K, val: MergeState[K]) => {
    setState((s) => (s ? { ...s, [key]: val } : s));
  };

  const handleMerge = async () => {
    const ok = await confirm({
      title: 'ยืนยัน merge?',
      body: `"${contactDisplayName(sourceContact)}" จะถูกลบ และข้อมูลทั้งหมด (notes, milestones, ฯลฯ) จะย้ายไปอยู่ใต้ "${contactDisplayName(keptContact)}" · การลบจะไม่สามารถย้อนคืนได้`,
      confirmLabel: 'Merge',
      danger: true,
    });
    if (!ok) return;
    setError(null);

    const pickedStr = <K extends keyof MergeState>(key: K, fieldName: keyof ContactRow): ContactRow[keyof ContactRow] => {
      const side = state[key];
      return side === 'A' ? keptContact[fieldName] : sourceContact[fieldName];
    };

    const mergedData: ContactUpdate = {
      first_name: pickedStr('first_name', 'first_name') as string,
      last_name: pickedStr('last_name', 'last_name') as string | null,
      nick_name: pickedStr('nick_name', 'nick_name') as string | null,
      suffix: pickedStr('suffix', 'suffix') as string | null,
      bio: pickedStr('bio', 'bio') as string | null,
      birthday: pickedStr('birthday', 'birthday') as string | null,
      birthday_notification_enabled: pickedStr('birthday_notification_enabled', 'birthday_notification_enabled') as boolean,
      avatar_url: pickedStr('avatar_url', 'avatar_url') as string | null,
      channel: pickedStr('channel', 'channel') as string | null,
      freq_days: pickedStr('freq_days', 'freq_days') as number | null,
      freq_unit: pickedStr('freq_unit', 'freq_unit') as 'days' | 'weeks' | 'months' | 'years' | null,
      tier: pickedStr('tier', 'tier') as 1 | 2 | 3 | null,
      tie_type: pickedStr('tie_type', 'tie_type') as 'Strong' | 'Bridge' | 'Weak' | null,
      priority: pickedStr('priority', 'priority') as 'High' | 'Medium' | 'Low' | null,
      met_story: pickedStr('met_story', 'met_story') as string | null,
      value_exchange: pickedStr('value_exchange', 'value_exchange') as string | null,
      phones: mergeArrays(keptContact.phones, sourceContact.phones, state.phones),
      emails: mergeArrays(keptContact.emails, sourceContact.emails, state.emails),
      addresses: mergeArrays(keptContact.addresses, sourceContact.addresses, state.addresses),
      socials: mergeArrays(keptContact.socials, sourceContact.socials, state.socials),
      orgs: mergeArrays(keptContact.orgs, sourceContact.orgs, state.orgs),
      education: mergeArrays(keptContact.education, sourceContact.education, state.education),
      tags: mergeArrays(keptContact.tags, sourceContact.tags, state.tags),
    };

    try {
      await merge.mutateAsync({
        keptId: keptContact.id,
        sourceId: sourceContact.id,
        mergedData,
      });
      navigate(`/contacts/${keptContact.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <LNote>MERGE CONTACTS</LNote>
          <div style={{ height: 12 }} />
          <LH level={2}>เลือกข้อมูลที่จะเก็บ</LH>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <LBtn ghost onClick={() => navigate(`/contacts/${keptId}`)}>ยกเลิก</LBtn>
          <LBtn primary onClick={handleMerge} disabled={merge.isPending}>
            {merge.isPending ? 'กำลัง merge…' : 'MERGE NOW'}
          </LBtn>
        </div>
      </div>

      {error && (
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
          {error}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <ContactHeader contact={keptContact} tone="A" label="KEEP · A" />
        <ContactHeader contact={sourceContact} tone="B" label="DELETE · B (data moves to A)" />
      </div>

      <LCard padding={20}>
        {/* Basic fields */}
        <FieldPicker
          label="First Name"
          a={keptContact.first_name}
          b={sourceContact.first_name}
          side={state.first_name}
          onPick={(s) => set('first_name', s)}
          render={strField}
        />
        <FieldPicker
          label="Last Name"
          a={keptContact.last_name}
          b={sourceContact.last_name}
          side={state.last_name}
          onPick={(s) => set('last_name', s)}
          render={strField}
        />
        <FieldPicker
          label="Nickname"
          a={keptContact.nick_name}
          b={sourceContact.nick_name}
          side={state.nick_name}
          onPick={(s) => set('nick_name', s)}
          render={strField}
        />
        <FieldPicker
          label="Bio"
          a={keptContact.bio}
          b={sourceContact.bio}
          side={state.bio}
          onPick={(s) => set('bio', s)}
          render={strField}
        />
        <FieldPicker
          label="Birthday"
          a={keptContact.birthday}
          b={sourceContact.birthday}
          side={state.birthday}
          onPick={(s) => set('birthday', s)}
          render={strField}
        />
        <FieldPicker
          label="Channel"
          a={keptContact.channel}
          b={sourceContact.channel}
          side={state.channel}
          onPick={(s) => set('channel', s)}
          render={strField}
        />
        <FieldPicker
          label="Tier"
          a={keptContact.tier ? `T${keptContact.tier}` : null}
          b={sourceContact.tier ? `T${sourceContact.tier}` : null}
          side={state.tier}
          onPick={(s) => set('tier', s)}
          render={strField}
        />
        <FieldPicker
          label="Priority"
          a={keptContact.priority}
          b={sourceContact.priority}
          side={state.priority}
          onPick={(s) => set('priority', s)}
          render={strField}
        />
        <FieldPicker
          label="Avatar"
          a={keptContact.avatar_url}
          b={sourceContact.avatar_url}
          side={state.avatar_url}
          onPick={(s) => set('avatar_url', s)}
          render={(v) =>
            v ? (
              <img src={v as string} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '8px 0 8px 0' }} />
            ) : (
              <span style={{ color: colors.dim }}>—</span>
            )
          }
        />

        {/* Array fields */}
        <ArrayPicker
          label="Phones"
          mode={state.phones}
          onPick={(m) => set('phones', m)}
          a={keptContact.phones}
          b={sourceContact.phones}
          render={(p) => `${(p as { label: string }).label}: ${(p as { value: string }).value}`}
        />
        <ArrayPicker
          label="Emails"
          mode={state.emails}
          onPick={(m) => set('emails', m)}
          a={keptContact.emails}
          b={sourceContact.emails}
          render={(e) => `${(e as { label: string }).label}: ${(e as { value: string }).value}`}
        />
        <ArrayPicker
          label="Socials"
          mode={state.socials}
          onPick={(m) => set('socials', m)}
          a={keptContact.socials}
          b={sourceContact.socials}
          render={(s) => `${(s as { platform: string }).platform}: ${(s as { handle: string }).handle}`}
        />
        <ArrayPicker
          label="Organizations"
          mode={state.orgs}
          onPick={(m) => set('orgs', m)}
          a={keptContact.orgs}
          b={sourceContact.orgs}
          render={(o) => `${(o as { org_name: string }).org_name}${(o as { role?: string | null }).role ? ' (' + (o as { role: string }).role + ')' : ''}`}
        />
        <ArrayPicker
          label="Education"
          mode={state.education}
          onPick={(m) => set('education', m)}
          a={keptContact.education}
          b={sourceContact.education}
          render={(e) => `${(e as { school: string }).school}${(e as { degree?: string | null }).degree ? ' · ' + (e as { degree: string }).degree : ''}`}
        />
        <ArrayPicker
          label="Tags"
          mode={state.tags}
          onPick={(m) => set('tags', m)}
          a={keptContact.tags}
          b={sourceContact.tags}
          render={(t) => `#${t}`}
        />

        <div
          style={{
            marginTop: 18,
            padding: 14,
            background: '#1f2a08',
            border: `1px dashed ${colors.greenDk}`,
            borderRadius: '10px 0 10px 0',
            fontSize: 12,
            color: colors.surface,
            lineHeight: 1.55,
          }}
        >
          <b style={{ color: colors.green }}>หมายเหตุ:</b> Notes, Milestones, Interactions, Commitments, Group memberships,
          และ Relations ของ <b>B</b> ทั้งหมดจะถูกย้ายมาอยู่ใต้ <b>A</b> อัตโนมัติ — ไม่หาย
        </div>
      </LCard>
    </div>
  );
}

function ContactHeader({ contact, tone, label }: { contact: ContactRow; tone: Side; label: string }) {
  const accent = tone === 'A' ? colors.green : colors.warn;
  return (
    <LCard padding={14} bg={colors.bgCard} border={accent}>
      <div style={{ fontSize: 10, color: accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {contact.avatar_url ? (
          <img
            src={contact.avatar_url}
            alt=""
            style={{ width: 40, height: 40, objectFit: 'cover', border: `1px solid ${accent}`, borderRadius: '8px 0 8px 0' }}
          />
        ) : (
          <LAvatar initials={contactInitials(contact)} size={36} ring={tone === 'A'} />
        )}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>{contactDisplayName(contact)}</div>
          <div style={{ fontSize: 11, color: colors.dim, marginTop: 2 }}>
            อัปเดตล่าสุด {new Date(contact.updated_at).toLocaleDateString('th-TH')}
          </div>
        </div>
      </div>
    </LCard>
  );
}

function ArrayPicker({
  label,
  mode,
  onPick,
  a,
  b,
  render,
}: {
  label: string;
  mode: 'A' | 'B' | 'union';
  onPick: (m: 'A' | 'B' | 'union') => void;
  a: unknown[] | string[] | null | undefined;
  b: unknown[] | string[] | null | undefined;
  render: (item: unknown) => string;
}) {
  const aArr = (a ?? []) as unknown[];
  const bArr = (b ?? []) as unknown[];

  return (
    <div style={{ padding: '12px 0', borderBottom: `1px solid ${colors.line}` }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colors.dim,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {label}
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['A', 'B', 'union'] as const).map((m) => {
            const selected = mode === m;
            const labelTxt = m === 'A' ? 'A only' : m === 'B' ? 'B only' : 'รวมทั้งคู่';
            return (
              <button
                key={m}
                type="button"
                onClick={() => onPick(m)}
                style={{
                  padding: '3px 9px',
                  background: selected ? colors.green : 'transparent',
                  color: selected ? colors.bg : colors.dimSoft,
                  border: `1px solid ${selected ? colors.green : colors.lineHi}`,
                  borderRadius: '4px 0 4px 0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                {labelTxt}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div
          style={{
            padding: '10px 12px',
            background: colors.bgSoft,
            border: `1px solid ${mode === 'A' || mode === 'union' ? colors.green : colors.line}`,
            borderRadius: '10px 0 10px 0',
            opacity: mode === 'B' ? 0.4 : 1,
          }}
        >
          {arrayPreview(aArr, render)}
        </div>
        <div
          style={{
            padding: '10px 12px',
            background: colors.bgSoft,
            border: `1px solid ${mode === 'B' || mode === 'union' ? colors.warn : colors.line}`,
            borderRadius: '10px 0 10px 0',
            opacity: mode === 'A' ? 0.4 : 1,
          }}
        >
          {arrayPreview(bArr, render)}
        </div>
      </div>
    </div>
  );
}
