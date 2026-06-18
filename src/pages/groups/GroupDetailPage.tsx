import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGroup,
  useGroupMembers,
  useGroups,
  useAddGroupMember,
  useRemoveGroupMember,
} from '../../hooks/useGroups';
import { useContacts } from '../../hooks/useContacts';
import { contactDisplayName, contactInitials } from '../../types/contact';
import { formatCadence } from '../../types/group';
import { matchContacts, summarizeRule, type Rule } from '../../lib/smartGroupRules';
import { LCard, LH, LBtn, LIcon, LNote, LAvatar, LChip, LInput } from '../../components/primitives';
import { colors } from '../../styles/tokens';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: group, isLoading } = useGroup(id);
  const { data: manualMembers = [], isLoading: loadingMembers } = useGroupMembers(id);
  const { data: allContacts = [] } = useContacts();
  const { data: allGroups = [] } = useGroups();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const isSmart = !!group?.rule;

  // For smart groups, compute members from rule against all contacts
  const members = useMemo(() => {
    if (isSmart && group) {
      return matchContacts(group.rule as unknown as Rule, allContacts);
    }
    return manualMembers;
  }, [isSmart, group, allContacts, manualMembers]);

  const parent = allGroups.find((g) => g.id === group?.parent_id);
  const subGroups = useMemo(() => allGroups.filter((g) => g.parent_id === id), [allGroups, id]);

  const memberIdSet = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const eligibleToAdd = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allContacts
      .filter((c) => !memberIdSet.has(c.id))
      .filter((c) => !q || contactDisplayName(c).toLowerCase().includes(q));
  }, [allContacts, memberIdSet, search]);

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>;
  }

  if (!group) {
    return (
      <div style={{ padding: 40 }}>
        <LCard padding={24} bg={colors.dangerBg} border={colors.dangerDk}>
          <div style={{ color: colors.danger, marginBottom: 16 }}>ไม่พบ group</div>
          <LBtn ghost onClick={() => navigate('/groups')}>← กลับ</LBtn>
        </LCard>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1200, margin: '0 auto' }}>
      <button
        onClick={() => navigate('/groups')}
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
        <LIcon kind="arrow-r" size={11} color={colors.dim} /> Groups
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <LNote>GROUP</LNote>
            {isSmart && (
              <LChip ink={colors.warn} bg={colors.warnBg} border={colors.warnDk}>
                ⚡ SMART
              </LChip>
            )}
            {parent && (
              <>
                <span style={{ color: colors.dim, fontSize: 12 }}>·</span>
                <span
                  style={{ fontSize: 11, color: colors.dimSoft, letterSpacing: 0.4, cursor: 'pointer' }}
                  onClick={() => navigate(`/groups/${parent.id}`)}
                >
                  ใต้: <b style={{ color: colors.text }}>{parent.name}</b>
                </span>
              </>
            )}
          </div>
          <LH level={2}>{group.name}</LH>
        </div>
        <LBtn ghost onClick={() => navigate(`/groups/${group.id}/edit`)}>
          แก้ไข Group
        </LBtn>
      </div>

      {isSmart && (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            background: colors.warnBg,
            border: `1px solid ${colors.warnDk}`,
            borderRadius: '12px 3px 12px 3px',
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: 1.2, color: colors.warn, fontWeight: 700, marginBottom: 6 }}>
            ⚡ SMART RULE
          </div>
          <div style={{ fontSize: 13, color: colors.surface, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.5 }}>
            {summarizeRule(group.rule as unknown as Rule)}
          </div>
          <div style={{ fontSize: 11, color: colors.dim, marginTop: 6, letterSpacing: 0.3 }}>
            Members ถูกคำนวณอัตโนมัติจาก rule · เปลี่ยน contact attributes = เปลี่ยน membership
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 24 }}>
        {/* Left: members */}
        <LCard padding={20}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <LH level={5} accent={false} color={colors.green}>
              MEMBERS · {members.length}{isSmart ? ' (auto)' : ''}
            </LH>
            {!isSmart && (
              <LBtn small primary onClick={() => setPickerOpen(!pickerOpen)}>
                <LIcon kind="plus" size={11} color={colors.bg} /> ADD
              </LBtn>
            )}
          </div>

          {pickerOpen && !isSmart && (
            <div
              style={{
                padding: 12,
                background: colors.bgSoft,
                border: `1px solid ${colors.line}`,
                borderRadius: '12px 3px 12px 3px',
                marginBottom: 14,
              }}
            >
              <LInput value={search} onChange={setSearch} placeholder="ค้นหา contact..." />
              <div style={{ maxHeight: 240, overflowY: 'auto', marginTop: 10 }}>
                {eligibleToAdd.length === 0 ? (
                  <div style={{ padding: 12, color: colors.dim, fontSize: 12, textAlign: 'center' }}>
                    {allContacts.length === memberIdSet.size
                      ? 'ทุกคนอยู่ใน group นี้แล้ว'
                      : 'ไม่พบ contact'}
                  </div>
                ) : (
                  eligibleToAdd.slice(0, 20).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => addMember.mutate({ groupId: group.id, contactId: c.id })}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        background: 'transparent',
                        border: 'none',
                        color: colors.text,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: '6px 2px 6px 2px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgCard)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LAvatar initials={contactInitials(c)} size={22} />
                      <span style={{ flex: 1 }}>{contactDisplayName(c)}</span>
                      <LIcon kind="plus" size={11} color={colors.green} />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {loadingMembers ? (
            <div style={{ padding: 24, color: colors.dim, fontSize: 13, textAlign: 'center' }}>
              กำลังโหลด…
            </div>
          ) : members.length === 0 ? (
            <div
              style={{
                padding: 24,
                background: colors.bgSoft,
                border: `1px dashed ${colors.line}`,
                borderRadius: '12px 3px 12px 3px',
                color: colors.dim,
                fontSize: 12.5,
                textAlign: 'center',
              }}
            >
              ยังไม่มี members
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    background: colors.bgSoft,
                    border: `1px solid ${colors.line}`,
                    borderRadius: '10px 3px 10px 3px',
                  }}
                >
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt=""
                      style={{
                        width: 28,
                        height: 28,
                        objectFit: 'cover',
                        border: `1px solid ${colors.lineHi}`,
                        borderRadius: '7px 2px 7px 2px',
                      }}
                    />
                  ) : (
                    <LAvatar initials={contactInitials(m)} size={26} />
                  )}
                  <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => navigate(`/contacts/${m.id}`)}
                  >
                    <div style={{ fontSize: 13.5, color: colors.text, fontWeight: 500 }}>
                      {contactDisplayName(m)}
                    </div>
                    {m.tier && (
                      <div style={{ fontSize: 10.5, color: colors.dim, marginTop: 2, letterSpacing: 0.5 }}>
                        T{m.tier}
                      </div>
                    )}
                  </div>
                  {!isSmart && (
                    <button
                      type="button"
                      onClick={() => removeMember.mutate({ groupId: group.id, contactId: m.id })}
                      title="เอาออกจาก group"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: colors.dim,
                        cursor: 'pointer',
                        fontSize: 13,
                        padding: 4,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = colors.danger)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = colors.dim)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </LCard>

        {/* Right: info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <LCard padding={20}>
            <LH level={5} accent={false} color={colors.green}>
              CADENCE
            </LH>
            {group.cadence_days ? (
              <div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: colors.green,
                    fontFamily: "'IBM Plex Mono', monospace",
                    letterSpacing: -0.5,
                  }}
                >
                  {formatCadence(group.cadence_days)}
                </div>
                <div style={{ fontSize: 11.5, color: colors.dim, marginTop: 6 }}>
                  ทุกคนใน group นี้จะใช้ cadence นี้ override Tier default
                </div>
              </div>
            ) : (
              <div style={{ color: colors.dim, fontSize: 13 }}>ไม่ได้ตั้ง cadence — จะใช้ Tier default ของแต่ละคน</div>
            )}
          </LCard>

          {subGroups.length > 0 && (
            <LCard padding={20}>
              <LH level={5} accent={false} color={colors.green}>
                SUB-GROUPS · {subGroups.length}
              </LH>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {subGroups.map((sg) => (
                  <button
                    key={sg.id}
                    type="button"
                    onClick={() => navigate(`/groups/${sg.id}`)}
                    style={{
                      textAlign: 'left',
                      background: colors.bgSoft,
                      border: `1px solid ${colors.line}`,
                      borderRadius: '10px 3px 10px 3px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      color: colors.text,
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        background: colors.green,
                        borderRadius: 99,
                        opacity: 0.4,
                      }}
                    />
                    <span style={{ flex: 1, fontSize: 13 }}>{sg.name}</span>
                    {sg.cadence_days && (
                      <LChip ink={colors.green} border={colors.greenDk} bg={colors.greenBg}>
                        {formatCadence(sg.cadence_days)}
                      </LChip>
                    )}
                  </button>
                ))}
              </div>
            </LCard>
          )}

          <LCard padding={20}>
            <LH level={5} accent={false} color={colors.green}>
              METADATA
            </LH>
            <div style={{ fontSize: 12, color: colors.dimSoft, lineHeight: 1.7 }}>
              <div>
                <b style={{ color: colors.text }}>Members:</b> {members.length}
              </div>
              <div>
                <b style={{ color: colors.text }}>Sub-groups:</b> {subGroups.length}
              </div>
              <div>
                <b style={{ color: colors.text }}>Created:</b>{' '}
                {new Date(group.created_at).toLocaleDateString('th-TH')}
              </div>
            </div>
          </LCard>
        </div>
      </div>
    </div>
  );
}
