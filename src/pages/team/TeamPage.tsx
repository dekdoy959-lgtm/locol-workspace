import { useMemo, useState } from 'react';
import {
  useTeamMembers,
  useUpdateTeamMember,
  teamMemberInitials,
  type TeamMemberRow,
  type TeamMemberUpdate,
} from '../../hooks/useTeamMembers';
import { useOpportunities } from '../../hooks/useOpportunities';
import { useContacts } from '../../hooks/useContacts';
import { useAuth } from '../../contexts/AuthContext';
import { LCard, LH, LBtn, LInput, LSelect, LLabel, LAvatar, LNote } from '../../components/primitives';
import { colors } from '../../styles/tokens';

export function TeamPage() {
  const { user } = useAuth();
  const { data: members = [], isLoading } = useTeamMembers();
  const { data: opps = [] } = useOpportunities();
  const { data: contacts = [] } = useContacts();
  const update = useUpdateTeamMember();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Stats per member: how many opps owned, contacts owned
  const stats = useMemo(() => {
    const map = new Map<string, { opps: number; contacts: number }>();
    for (const m of members) map.set(m.id, { opps: 0, contacts: 0 });
    for (const o of opps) {
      if (o.owner_id && map.has(o.owner_id)) map.get(o.owner_id)!.opps++;
    }
    for (const c of contacts) {
      if (c.owner_id && map.has(c.owner_id)) map.get(c.owner_id)!.contacts++;
    }
    return map;
  }, [members, opps, contacts]);

  if (isLoading) {
    return <div style={{ padding: 40, color: colors.dim, textAlign: 'center' }}>กำลังโหลด team…</div>;
  }

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <LNote>System · Team Management</LNote>
        <div style={{ height: 10 }} />
        <LH level={3} sub="แก้ไขชื่อ · บทบาท · avatar ของสมาชิกทีม">
          TEAM MEMBERS
        </LH>
      </div>

      {/* Invite instructions */}
      <LCard padding={18} style={{ marginBottom: 18, borderLeft: `3px solid ${colors.green}` }}>
        <div style={{ fontSize: 11, color: colors.green, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
          ➕ วิธีเพิ่มสมาชิกใหม่
        </div>
        <ol style={{ fontSize: 12.5, color: colors.dimSoft, lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
          <li>ให้คนใหม่ login เข้า <b style={{ color: colors.text }}>https://locol-workspace.vercel.app</b> ด้วย Google account</li>
          <li>(อาจต้อง add email ของเขาใน Google OAuth Test Users ก่อน — admin LOCOL จัดการ)</li>
          <li>หลัง login ครั้งแรก ระบบจะสร้าง <code style={{ background: colors.bg, padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>team_member</code> row ให้อัตโนมัติ</li>
          <li>เขาจะโผล่ในตารางด้านล่าง · admin คลิกแก้ <b style={{ color: colors.text }}>ชื่อ · บทบาท</b> ได้</li>
        </ol>
        <div style={{ fontSize: 11, color: colors.dim, marginTop: 10, fontStyle: 'italic' }}>
          💡 ไม่สามารถ "เพิ่ม" จากหน้านี้ตรง ๆ เพราะ team_member ผูกกับ Supabase Auth · ต้อง signup ก่อน
        </div>
      </LCard>

      {/* Members table */}
      <LCard padding={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.line}`, background: colors.bgSoft }}>
              <Th>Member</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Opps</Th>
              <Th>Contacts</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: colors.dim }}>
                  ยังไม่มีสมาชิก · ขอให้ admin login ก่อน
                </td>
              </tr>
            )}
            {members.map((m) => {
              const isEditing = editingId === m.id;
              const isMe = m.id === user?.id;
              const memberStats = stats.get(m.id) ?? { opps: 0, contacts: 0 };
              return (
                <MemberRow
                  key={m.id}
                  member={m}
                  isEditing={isEditing}
                  isMe={isMe}
                  stats={memberStats}
                  onStartEdit={() => setEditingId(m.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(patch) =>
                    update.mutate(
                      { id: m.id, patch },
                      { onSuccess: () => setEditingId(null) },
                    )
                  }
                  saving={update.isPending}
                />
              );
            })}
          </tbody>
        </table>
      </LCard>

      <div style={{ marginTop: 14, fontSize: 11, color: colors.dim, lineHeight: 1.5 }}>
        💡 ทุกคนในทีมแก้ไข profile ของใครก็ได้ (RLS allow) · ถ้าเปลี่ยน role เป็น <b style={{ color: colors.dimSoft }}>admin</b> จะมีสิทธิ์ขั้น advanced ในอนาคต (ตอนนี้ทุกคนสิทธิ์เท่ากัน)
      </div>
    </div>
  );
}

function MemberRow({
  member,
  isEditing,
  isMe,
  stats,
  onStartEdit,
  onCancelEdit,
  onSave,
  saving,
}: {
  member: TeamMemberRow;
  isEditing: boolean;
  isMe: boolean;
  stats: { opps: number; contacts: number };
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: TeamMemberUpdate) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<TeamMemberUpdate>({});

  const startEdit = () => {
    setDraft({
      full_name: member.full_name,
      initials: member.initials,
      avatar_url: member.avatar_url,
      role: member.role,
    });
    onStartEdit();
  };

  const joined = new Date(member.created_at).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (isEditing) {
    return (
      <tr style={{ background: '#161812', borderBottom: `1px solid ${colors.line}` }}>
        <td colSpan={7} style={{ padding: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <LLabel>ชื่อ-นามสกุล</LLabel>
              <LInput
                value={draft.full_name ?? ''}
                onChange={(v) => setDraft({ ...draft, full_name: v || null })}
                placeholder="เช่น คุณ Akrapon"
              />
            </div>
            <div>
              <LLabel>Initials (สูงสุด 3 ตัว · ใช้ใน avatar)</LLabel>
              <LInput
                value={draft.initials ?? ''}
                onChange={(v) => setDraft({ ...draft, initials: Array.from(v || '').slice(0, 3).join('').toUpperCase() || null })}
                placeholder="(auto จากชื่อถ้าเว้นว่าง)"
              />
            </div>
            <div>
              <LLabel>Role</LLabel>
              <LSelect
                value={draft.role ?? 'member'}
                onChange={(v) => setDraft({ ...draft, role: v as 'admin' | 'member' })}
                options={[
                  { value: 'member', label: '👤 Member' },
                  { value: 'admin',  label: '🛡 Admin' },
                ]}
              />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <LLabel>Avatar URL (Google profile photo etc.)</LLabel>
            <LInput
              type="url"
              value={draft.avatar_url ?? ''}
              onChange={(v) => setDraft({ ...draft, avatar_url: v || null })}
              placeholder="https://lh3.googleusercontent.com/..."
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <LBtn small ghost onClick={onCancelEdit}>
              ยกเลิก
            </LBtn>
            <LBtn small primary onClick={() => onSave(draft)} disabled={saving || !draft.full_name?.trim()}>
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </LBtn>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: `1px solid ${colors.line}` }}>
      <Td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt=""
              style={{
                width: 32,
                height: 32,
                objectFit: 'cover',
                borderRadius: '8px 0 8px 0',
                border: `1px solid ${colors.lineHi}`,
              }}
            />
          ) : (
            <LAvatar initials={teamMemberInitials(member)} size={28} />
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, lineHeight: 1.2 }}>
              {member.full_name || '(ยังไม่ได้ตั้งชื่อ)'}
              {isMe && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 9,
                    padding: '1px 5px',
                    background: colors.green,
                    color: colors.bg,
                    borderRadius: 3,
                    letterSpacing: 0.5,
                    fontWeight: 700,
                  }}
                >
                  YOU
                </span>
              )}
            </div>
            {member.initials && (
              <div style={{ fontSize: 10, color: colors.dim, marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>
                {member.initials}
              </div>
            )}
          </div>
        </div>
      </Td>
      <Td>
        <span style={{ fontSize: 12, color: colors.surface }}>{member.email}</span>
      </Td>
      <Td>
        <RoleBadge role={member.role} />
      </Td>
      <Td>
        <span style={{ fontSize: 12.5, color: stats.opps > 0 ? colors.text : colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
          {stats.opps}
        </span>
      </Td>
      <Td>
        <span style={{ fontSize: 12.5, color: stats.contacts > 0 ? colors.text : colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
          {stats.contacts}
        </span>
      </Td>
      <Td>
        <span style={{ fontSize: 11.5, color: colors.dimSoft }}>{joined}</span>
      </Td>
      <Td>
        <LBtn small ghost onClick={startEdit}>
          แก้ไข
        </LBtn>
      </Td>
    </tr>
  );
}

function RoleBadge({ role }: { role: 'admin' | 'member' }) {
  const meta =
    role === 'admin'
      ? { label: '🛡 Admin',  color: colors.warn, bg: colors.warnBg, border: colors.warnDk }
      : { label: '👤 Member', color: colors.dimSoft, bg: colors.bgSoft, border: colors.lineHi };
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10.5,
        color: meta.color,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        padding: '2px 8px',
        borderRadius: '5px 0 5px 0',
        fontWeight: 600,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}
    >
      {meta.label}
    </span>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      style={{
        padding: '11px 14px',
        textAlign: 'left',
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: colors.dim,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>{children}</td>;
}
