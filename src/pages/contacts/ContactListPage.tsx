import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContacts } from '../../hooks/useContacts';
import {
  contactDisplayName,
  contactInitials,
  RELATIONSHIP_STATUS_META,
  type PhoneEntry,
  type EmailEntry,
  type RelationshipStatus,
} from '../../types/contact';
import { LCard, LH, LBtn, LIcon, LInput, LAvatar, LChip, LStatus, LNote } from '../../components/primitives';
import { colors } from '../../styles/tokens';

const HEALTH_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
  'On Track':   { fg: '#99CE24', bg: '#19250a', border: '#6e9618' },
  Watch:        { fg: '#E8B923', bg: '#241a06', border: '#5a3f10' },
  'Going Cold': { fg: '#d99a66', bg: '#2a1d10', border: '#6a3f1c' },
  Overdue:      { fg: '#d96a66', bg: '#241010', border: '#5a1a18' },
};

export function ContactListPage() {
  const navigate = useNavigate();
  const { data: contacts, isLoading, error } = useContacts();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<RelationshipStatus | 'all'>('all');

  const filtered = useMemo(() => {
    if (!contacts) return [];
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (tierFilter !== null && c.tier !== tierFilter) return false;
      if (statusFilter !== 'all' && c.relationship_status !== statusFilter) return false;
      if (!q) return true;
      const name = contactDisplayName(c).toLowerCase();
      const orgs = (c.orgs as { org_name: string }[]).map((o) => o.org_name.toLowerCase()).join(' ');
      return name.includes(q) || orgs.includes(q);
    });
  }, [contacts, search, tierFilter, statusFilter]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { all: contacts?.length ?? 0, known: 0, prospect: 0, cold: 0, archived: 0 };
    for (const c of contacts ?? []) m[c.relationship_status as RelationshipStatus] = (m[c.relationship_status as RelationshipStatus] ?? 0) + 1;
    return m;
  }, [contacts]);

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <LCard padding={24} bg="#241010" border="#5a1a18">
          <div style={{ color: '#d96a66' }}>Error loading contacts: {String(error)}</div>
        </LCard>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <LNote>People Layer · Database 1</LNote>
          <div style={{ height: 12 }} />
          <LH level={2} sub="คนใน network ทั้งหมด · ลูกค้า · พาร์ทเนอร์ · advisor · mentor">
            CONTACTS
          </LH>
        </div>
        <LBtn primary onClick={() => navigate('/contacts/new')}>
          <LIcon kind="plus" size={12} color={colors.bg} /> NEW CONTACT
        </LBtn>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <LIcon kind="search" size={14} color={colors.dim} />
          </span>
          <LInput
            value={search}
            onChange={setSearch}
            placeholder="ค้นหา ชื่อ / บริษัท..."
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[null, 1, 2, 3].map((t) => (
            <button
              key={String(t)}
              onClick={() => setTierFilter(t)}
              style={{
                padding: '7px 12px',
                background: tierFilter === t ? colors.green : 'transparent',
                color: tierFilter === t ? colors.bg : colors.dimSoft,
                border: `1px solid ${tierFilter === t ? colors.green : colors.lineHi}`,
                borderRadius: '8px 0 8px 0',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              {t === null ? 'ทั้งหมด' : `T${t}`}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', color: colors.dim, fontSize: 12 }}>
          {filtered.length} / {contacts?.length ?? 0} contacts
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
        {(['all', 'known', 'prospect', 'cold', 'archived'] as const).map((s) => {
          const meta = s === 'all' ? null : RELATIONSHIP_STATUS_META[s];
          const selected = statusFilter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 10px',
                background: selected ? (meta?.color ?? colors.green) : 'transparent',
                color: selected ? colors.bg : (meta?.color ?? colors.dimSoft),
                border: `1px solid ${selected ? (meta?.color ?? colors.green) : colors.lineHi}`,
                borderRadius: '6px 0 6px 0',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              {s === 'all' ? 'ทั้งหมด' : meta?.label} · {statusCounts[s] ?? 0}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: colors.dim, fontSize: 13 }}>กำลังโหลด…</div>
      ) : filtered.length === 0 ? (
        <LCard padding={40}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: colors.dimSoft, marginBottom: 12 }}>
              {contacts?.length === 0 ? 'ยังไม่มี contact ในระบบ' : 'ไม่พบ contact ตามที่กรอง'}
            </div>
            {contacts?.length === 0 && (
              <LBtn primary onClick={() => navigate('/contacts/new')}>
                <LIcon kind="plus" size={12} color={colors.bg} /> เพิ่มคนแรก
              </LBtn>
            )}
          </div>
        </LCard>
      ) : (
        <LCard padding={0} bg={colors.bgCard}>
          <table className="l-rtable" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.line}` }}>
                <Th>Name</Th>
                <Th>Organization</Th>
                <Th>Tier</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Health</Th>
                <Th>Owner</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const orgs = c.orgs as { org_name: string; is_primary: boolean }[];
                const primaryOrg = orgs.find((o) => o.is_primary) ?? orgs[0];
                const phones = c.phones as PhoneEntry[];
                const emails = c.emails as EmailEntry[];
                const health = c.health && HEALTH_COLORS[c.health];

                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contacts/${c.id}`)}
                    style={{
                      borderBottom: `1px solid ${colors.line}`,
                      cursor: 'pointer',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgSoft)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Td title>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {c.avatar_url ? (
                          <img
                            src={c.avatar_url}
                            alt={contactDisplayName(c)}
                            style={{
                              width: 32,
                              height: 32,
                              objectFit: 'cover',
                              border: `1px solid ${colors.lineHi}`,
                              borderRadius: '8px 0 8px 0',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <LAvatar initials={contactInitials(c)} size={28} />
                        )}
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13.5, color: colors.text }}>
                            {contactDisplayName(c)}
                          </div>
                          {c.bio && (
                            <div style={{ fontSize: 11, color: colors.dim, marginTop: 2 }}>
                              {c.bio.slice(0, 50)}
                              {c.bio.length > 50 ? '…' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td label="Org">
                      {primaryOrg ? (
                        <div>
                          <div style={{ fontSize: 13, color: colors.surface }}>{primaryOrg.org_name}</div>
                          {orgs.length > 1 && (
                            <div style={{ fontSize: 10.5, color: colors.dim, marginTop: 1 }}>
                              +{orgs.length - 1} เพิ่ม
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: colors.dim, fontSize: 12 }}>—</span>
                      )}
                    </Td>
                    <Td label="Tier">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {(() => {
                          const rsMeta = RELATIONSHIP_STATUS_META[c.relationship_status as RelationshipStatus];
                          return (
                            <LChip ink={rsMeta.color} border={rsMeta.border} bg={rsMeta.bg}>
                              {rsMeta.label}
                            </LChip>
                          );
                        })()}
                        {c.tier && (
                          <LChip ink={colors.green} border={colors.greenDk} bg="#19250a">
                            T{c.tier}
                          </LChip>
                        )}
                      </div>
                    </Td>
                    <Td label="Phone">
                      {phones[0] ? (
                        <span style={{ fontSize: 12.5, color: colors.surface }}>{phones[0].value}</span>
                      ) : (
                        <span style={{ color: colors.dim, fontSize: 12 }}>—</span>
                      )}
                    </Td>
                    <Td label="Email">
                      {emails[0] ? (
                        <span style={{ fontSize: 12.5, color: colors.surface }}>{emails[0].value}</span>
                      ) : (
                        <span style={{ color: colors.dim, fontSize: 12 }}>—</span>
                      )}
                    </Td>
                    <Td label="Health">
                      {c.health && health ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 9px',
                            fontSize: 11,
                            fontWeight: 500,
                            background: health.bg,
                            color: health.fg,
                            border: `1px solid ${health.border}`,
                            borderRadius: '8px 0 8px 0',
                          }}
                        >
                          {c.health}
                        </span>
                      ) : (
                        <span style={{ color: colors.dim, fontSize: 12 }}>—</span>
                      )}
                    </Td>
                    <Td label="Owner">
                      <LStatus status={c.followup_status === 'Awaiting My Action' ? 'Pursuing' : 'Assigned'} />
                    </Td>
                    <Td hideMobile>
                      <LIcon kind="arrow-r" size={14} color={colors.dim} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </LCard>
      )}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      style={{
        padding: '12px 14px',
        textAlign: 'left',
        fontWeight: 500,
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

function Td({
  children,
  label,
  title,
  hideMobile,
}: {
  children?: React.ReactNode;
  label?: string;
  title?: boolean;
  hideMobile?: boolean;
}) {
  const classNames = [
    title ? 'l-rtable-title' : '',
    hideMobile ? 'l-rtable-hide-mobile' : '',
  ].filter(Boolean).join(' ');
  return (
    <td
      className={classNames || undefined}
      data-label={label}
      style={{ padding: '12px 14px', verticalAlign: 'middle' }}
    >
      {children}
    </td>
  );
}
