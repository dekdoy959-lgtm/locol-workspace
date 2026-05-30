import { useState } from 'react';
import {
  useOpportunityTeam,
  useCreateAssignment,
  useDeleteAssignment,
  groupAssignmentsByRole,
  TEAM_ROLE_META,
  TEAM_ROLE_ORDER,
  type TeamRole,
} from '../../hooks/useOpportunityTeam';
import { useTeamMembers, teamMemberDisplayName, teamMemberInitials } from '../../hooks/useTeamMembers';
import { LCard, LBtn, LIcon, LAvatar, LSelect } from '../primitives';
import { colors } from '../../styles/tokens';

interface TeamAssignmentsSectionProps {
  opportunityId: string;
}

export function TeamAssignmentsSection({ opportunityId }: TeamAssignmentsSectionProps) {
  const { data: assignments = [], isLoading } = useOpportunityTeam(opportunityId);
  const { data: team = [] } = useTeamMembers();
  const create = useCreateAssignment();
  const remove = useDeleteAssignment();
  const teamById = Object.fromEntries(team.map((t) => [t.id, t]));

  const grouped = groupAssignmentsByRole(assignments);
  const [addingForRole, setAddingForRole] = useState<TeamRole | null>(null);
  const [pickMember, setPickMember] = useState<string>('');

  const handleAdd = (role: TeamRole) => {
    if (!pickMember) return;
    create.mutate(
      { opportunity_id: opportunityId, team_member_id: pickMember, role },
      {
        onSuccess: () => {
          setAddingForRole(null);
          setPickMember('');
        },
      },
    );
  };

  if (isLoading) {
    return <div style={{ padding: 14, color: colors.dim, fontSize: 12 }}>กำลังโหลด team…</div>;
  }

  return (
    <LCard padding={0}>
      <div
        style={{
          padding: '14px 18px',
          borderBottom: `1px solid ${colors.line}`,
          background: colors.bgSoft,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: colors.green,
            textTransform: 'uppercase',
          }}
        >
          👥 TEAM · ใครรับผิดชอบอะไร
        </div>
        <div style={{ fontSize: 11.5, color: colors.dimSoft, marginTop: 4, lineHeight: 1.5 }}>
          1 คนรับได้หลาย role · 1 role มีหลายคนได้ · ใช้สำหรับ Timeline แสดงว่าใครทำอะไร
        </div>
      </div>

      <div>
        {TEAM_ROLE_ORDER.map((role) => {
          const meta = TEAM_ROLE_META[role];
          const peopleInRole = grouped[role];
          const adding = addingForRole === role;
          const availableMembers = team.filter(
            (t) => !peopleInRole.some((a) => a.team_member_id === t.id),
          );

          return (
            <div key={role} style={{ borderBottom: `1px solid ${colors.line}` }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 18px',
                  background: peopleInRole.length > 0 ? 'transparent' : colors.bgSoft,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    background: meta.color,
                    borderRadius: 99,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 16, flexShrink: 0 }}>{meta.icon}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: meta.color,
                    letterSpacing: 0.5,
                    minWidth: 200,
                  }}
                >
                  {meta.label}
                </span>

                <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {peopleInRole.map((a) => {
                    const member = teamById[a.team_member_id];
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 4px 3px 8px',
                          background: colors.bgRaise,
                          border: `1px solid ${colors.lineHi}`,
                          borderRadius: '6px 0 6px 0',
                          fontSize: 11.5,
                        }}
                      >
                        {member && <LAvatar initials={teamMemberInitials(member)} size={20} />}
                        <span style={{ color: colors.text }}>
                          {member ? teamMemberDisplayName(member) : '(unknown)'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            confirm('ลบคนนี้ออกจาก role นี้?') &&
                            remove.mutate({ id: a.id, opportunityId })
                          }
                          title="ลบ"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: colors.dim,
                            cursor: 'pointer',
                            padding: '0 4px',
                            fontSize: 14,
                            lineHeight: 1,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#d96a66')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = colors.dim)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  {peopleInRole.length === 0 && !adding && (
                    <span style={{ fontSize: 11, color: colors.dim, fontStyle: 'italic' }}>
                      — ยังไม่มี —
                    </span>
                  )}
                </div>

                {!adding && availableMembers.length > 0 && (
                  <LBtn small ghost onClick={() => setAddingForRole(role)}>
                    <LIcon kind="plus" size={10} color={colors.dimSoft} /> เพิ่ม
                  </LBtn>
                )}
              </div>

              {adding && (
                <div
                  style={{
                    padding: '10px 18px 14px 38px',
                    background: '#0e1208',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 280 }}>
                    <LSelect
                      value={pickMember}
                      onChange={setPickMember}
                      options={[
                        { value: '', label: '— เลือกคน —' },
                        ...availableMembers.map((m) => ({
                          value: m.id,
                          label: teamMemberDisplayName(m),
                        })),
                      ]}
                    />
                  </div>
                  <LBtn
                    small
                    primary
                    onClick={() => handleAdd(role)}
                    disabled={!pickMember || create.isPending}
                  >
                    {create.isPending ? 'กำลังเพิ่ม…' : 'OK'}
                  </LBtn>
                  <LBtn
                    small
                    ghost
                    onClick={() => {
                      setAddingForRole(null);
                      setPickMember('');
                    }}
                  >
                    ยกเลิก
                  </LBtn>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          padding: '10px 18px',
          fontSize: 11,
          color: colors.dim,
          background: colors.bgSoft,
          lineHeight: 1.5,
        }}
      >
        💡 <b style={{ color: colors.dimSoft }}>Owner</b> + <b style={{ color: colors.dimSoft }}>Reviewer</b>{' '}
        ยังเก็บใน opportunities table ด้วย (ตามเดิม) · ที่นี่เป็น source of truth สำหรับ multi-role · Timeline จะใช้
        assignments ที่นี่แสดงว่าใครทำอะไร
      </div>
    </LCard>
  );
}
