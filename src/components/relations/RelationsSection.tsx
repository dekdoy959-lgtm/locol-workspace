import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContacts } from '../../hooks/useContacts';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useOpportunities } from '../../hooks/useOpportunities';
import { useContactRelations, useCreateRelation, useDeleteRelation } from '../../hooks/useRelations';
import { contactDisplayName, contactInitials, type ContactRow } from '../../types/contact';
import { orgInitials, type OrgRow } from '../../types/organization';
import { findTrack, type OpportunityRow } from '../../types/opportunity';
import { findRelationType, RELATION_TYPE_OPTIONS } from '../../types/relation';
import { LBtn, LInput, LSelect, LIcon, LLabel, LAvatar } from '../primitives';
import { colors } from '../../styles/tokens';

interface RelationsSectionProps {
  contactId: string;
}

type TargetKind = 'contact' | 'org' | 'opportunity';

export function RelationsSection({ contactId }: RelationsSectionProps) {
  const navigate = useNavigate();
  const { data: relations = [], isLoading } = useContactRelations(contactId);
  const { data: allContacts = [] } = useContacts();
  const { data: allOrgs = [] } = useOrganizations();
  const { data: allOpps = [] } = useOpportunities();
  const create = useCreateRelation();
  const del = useDeleteRelation();

  const [addOpen, setAddOpen] = useState(false);
  const [targetKind, setTargetKind] = useState<TargetKind>('contact');
  const [search, setSearch] = useState('');
  const [pickedId, setPickedId] = useState<string>('');
  const [type, setType] = useState<string>('knows-well');
  const [note, setNote] = useState<string>('');

  const contactById = useMemo(() => Object.fromEntries(allContacts.map((c) => [c.id, c])), [allContacts]);
  const orgById = useMemo(() => Object.fromEntries(allOrgs.map((o) => [o.id, o])), [allOrgs]);
  const oppById = useMemo(() => Object.fromEntries(allOpps.map((o) => [o.id, o])), [allOpps]);

  const decoratedRelations = useMemo(() => {
    return relations.map((r) => {
      // Contact-to-contact relations
      if (r.to_contact_id) {
        const otherId = r.from_contact_id === contactId ? r.to_contact_id : r.from_contact_id;
        const other = contactById[otherId];
        return {
          ...r,
          targetKind: 'contact' as const,
          targetId: otherId,
          target: other as ContactRow | undefined,
          isOutgoing: r.from_contact_id === contactId,
        };
      }
      // Contact-to-org
      if (r.to_org_id) {
        return {
          ...r,
          targetKind: 'org' as const,
          targetId: r.to_org_id,
          target: orgById[r.to_org_id] as OrgRow | undefined,
          isOutgoing: true,
        };
      }
      // Contact-to-opportunity
      if (r.to_opportunity_id) {
        return {
          ...r,
          targetKind: 'opportunity' as const,
          targetId: r.to_opportunity_id,
          target: oppById[r.to_opportunity_id] as OpportunityRow | undefined,
          isOutgoing: true,
        };
      }
      return null;
    }).filter((r): r is NonNullable<typeof r> => r !== null && !!r.target);
  }, [relations, contactId, contactById, orgById, oppById]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (targetKind === 'contact') {
      const existing = new Set(
        decoratedRelations.filter((r) => r.targetKind === 'contact').map((r) => r.targetId),
      );
      return allContacts
        .filter((c) => c.id !== contactId && !existing.has(c.id))
        .filter((c) => !q || contactDisplayName(c).toLowerCase().includes(q))
        .slice(0, 10)
        .map((c) => ({ id: c.id, label: contactDisplayName(c), data: c as ContactRow }));
    }
    if (targetKind === 'org') {
      const existing = new Set(decoratedRelations.filter((r) => r.targetKind === 'org').map((r) => r.targetId));
      return allOrgs
        .filter((o) => !existing.has(o.id))
        .filter((o) => !q || o.name.toLowerCase().includes(q))
        .slice(0, 10)
        .map((o) => ({ id: o.id, label: o.name, data: o as OrgRow }));
    }
    const existing = new Set(decoratedRelations.filter((r) => r.targetKind === 'opportunity').map((r) => r.targetId));
    return allOpps
      .filter((o) => !existing.has(o.id))
      .filter((o) => !q || o.title.toLowerCase().includes(q))
      .slice(0, 10)
      .map((o) => ({ id: o.id, label: o.title, data: o as OpportunityRow }));
  }, [targetKind, search, allContacts, allOrgs, allOpps, contactId, decoratedRelations]);

  const handleAdd = async () => {
    if (!pickedId) return;
    const payload: Parameters<typeof create.mutateAsync>[0] = {
      from_contact_id: contactId,
      type,
      note: note.trim() || null,
      to_contact_id: targetKind === 'contact' ? pickedId : null,
      to_org_id: targetKind === 'org' ? pickedId : null,
      to_opportunity_id: targetKind === 'opportunity' ? pickedId : null,
    };
    await create.mutateAsync(payload);
    setPickedId('');
    setNote('');
    setSearch('');
    setAddOpen(false);
  };

  const goToTarget = (r: typeof decoratedRelations[0]) => {
    if (r.targetKind === 'contact') navigate(`/contacts/${r.targetId}`);
    else if (r.targetKind === 'org') navigate(`/organizations/${r.targetId}`);
    else navigate(`/inbox/${r.targetId}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div
          style={{
            fontWeight: 500,
            fontSize: 10,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
            color: colors.dim,
          }}
        >
          {decoratedRelations.length} relations
        </div>
        <LBtn small primary onClick={() => setAddOpen(!addOpen)}>
          <LIcon kind="plus" size={11} color={colors.bg} /> ADD
        </LBtn>
      </div>

      {addOpen && (
        <div
          style={{
            padding: 14,
            background: colors.bgSoft,
            border: `1px solid ${colors.greenDk}`,
            borderRadius: '12px 0 12px 0',
            marginBottom: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Target kind picker */}
          <div>
            <LLabel>Link to</LLabel>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['contact', 'org', 'opportunity'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setTargetKind(k);
                    setPickedId('');
                    setSearch('');
                  }}
                  style={{
                    padding: '6px 12px',
                    background: targetKind === k ? colors.green : 'transparent',
                    color: targetKind === k ? colors.bg : colors.dimSoft,
                    border: `1px solid ${targetKind === k ? colors.green : colors.lineHi}`,
                    borderRadius: '6px 0 6px 0',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {k === 'contact' ? '👤 Contact' : k === 'org' ? '🏢 Org' : '🎯 Opportunity'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <LLabel>ค้นหา {targetKind === 'contact' ? 'contact' : targetKind === 'org' ? 'organization' : 'opportunity'}</LLabel>
            <LInput value={search} onChange={setSearch} placeholder="พิมพ์ชื่อ..." />
            {search && (
              <div
                style={{
                  marginTop: 6,
                  maxHeight: 200,
                  overflowY: 'auto',
                  background: colors.bgCard,
                  border: `1px solid ${colors.lineHi}`,
                  borderRadius: '6px 0 6px 0',
                }}
              >
                {searchResults.length === 0 ? (
                  <div style={{ padding: 10, color: colors.dim, fontSize: 12 }}>ไม่พบ</div>
                ) : (
                  searchResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setPickedId(r.id);
                        setSearch(r.label);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        background: pickedId === r.id ? '#19250a' : 'transparent',
                        border: 'none',
                        color: colors.text,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <TargetIcon kind={targetKind} data={r.data} />
                      <span>{r.label}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <LLabel>Relationship type</LLabel>
              <LSelect value={type} onChange={setType} options={RELATION_TYPE_OPTIONS} />
            </div>
            <div>
              <LLabel>Note (optional)</LLabel>
              <LInput value={note} onChange={setNote} placeholder="เช่น co-host ปี 2024" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <LBtn
              ghost
              small
              onClick={() => {
                setAddOpen(false);
                setSearch('');
                setPickedId('');
              }}
            >
              ยกเลิก
            </LBtn>
            <LBtn primary small onClick={handleAdd} disabled={!pickedId || create.isPending}>
              {create.isPending ? 'กำลังบันทึก…' : 'เพิ่ม'}
            </LBtn>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: 12, color: colors.dim, fontSize: 12 }}>กำลังโหลด…</div>
      ) : decoratedRelations.length === 0 ? (
        <div
          style={{
            padding: 16,
            background: colors.bgSoft,
            border: `1px dashed ${colors.line}`,
            borderRadius: '10px 0 10px 0',
            color: colors.dim,
            fontSize: 12.5,
            textAlign: 'center',
          }}
        >
          ยังไม่ได้เชื่อม relation กับใคร
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {decoratedRelations.map((r) => {
            const rt = findRelationType(r.type);
            const targetLabel =
              r.targetKind === 'contact'
                ? contactDisplayName(r.target as ContactRow)
                : r.targetKind === 'org'
                  ? (r.target as OrgRow).name
                  : (r.target as OpportunityRow).title;
            const targetMeta =
              r.targetKind === 'contact'
                ? '👤 Contact'
                : r.targetKind === 'org'
                  ? '🏢 Organization'
                  : `🎯 ${findTrack((r.target as OpportunityRow).track).name}`;

            return (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: colors.bgSoft,
                  border: `1px solid ${colors.line}`,
                  borderRadius: '10px 0 10px 0',
                }}
              >
                <span
                  style={{
                    fontSize: 9.5,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    padding: '2px 7px',
                    color: rt.color,
                    border: `1px ${rt.style === 'dashed' ? 'dashed' : 'solid'} ${rt.color}`,
                    borderRadius: '5px 0 5px 0',
                    flexShrink: 0,
                    fontWeight: 600,
                  }}
                >
                  {rt.value}
                </span>
                <TargetIcon kind={r.targetKind} data={r.target} />
                <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => goToTarget(r)}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
                    {targetLabel}
                    {!r.isOutgoing && r.targetKind === 'contact' && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: colors.dim, letterSpacing: 0.5 }}>
                        ← (incoming)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: colors.dim, marginTop: 1, letterSpacing: 0.3 }}>
                    {targetMeta}
                  </div>
                  {r.note && (
                    <div style={{ fontSize: 11, color: colors.dimSoft, marginTop: 2, fontStyle: 'italic' }}>
                      "{r.note}"
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('ลบความสัมพันธ์นี้?')) del.mutate(r.id);
                  }}
                  title="ลบ"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.dim,
                    cursor: 'pointer',
                    fontSize: 13,
                    padding: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#d96a66')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = colors.dim)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TargetIcon({ kind, data }: { kind: TargetKind; data?: ContactRow | OrgRow | OpportunityRow }) {
  if (!data) return <span style={{ width: 26, height: 26 }} />;
  if (kind === 'contact') {
    const c = data as ContactRow;
    return c.avatar_url ? (
      <img
        src={c.avatar_url}
        alt=""
        style={{
          width: 26,
          height: 26,
          objectFit: 'cover',
          border: `1px solid ${colors.lineHi}`,
          borderRadius: '6px 0 6px 0',
          flexShrink: 0,
        }}
      />
    ) : (
      <LAvatar initials={contactInitials(c)} size={24} />
    );
  }
  if (kind === 'org') {
    return (
      <span
        style={{
          width: 26,
          height: 26,
          background: '#1d1f12',
          border: '1px solid #3a3f1f',
          color: '#9aa56a',
          fontSize: 10,
          fontWeight: 700,
          borderRadius: '6px 0 6px 0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {orgInitials((data as OrgRow).name)}
      </span>
    );
  }
  const opp = data as OpportunityRow;
  const meta = findTrack(opp.track);
  return (
    <span
      style={{
        width: 26,
        height: 26,
        background: meta.color.soft,
        border: `1px solid ${meta.color.chip}`,
        color: meta.color.ink,
        fontSize: 12,
        borderRadius: '6px 0 6px 0',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      🎯
    </span>
  );
}
