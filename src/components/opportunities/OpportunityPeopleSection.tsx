import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useOpportunityPeople,
  useAddOpportunityPerson,
  useUpdateOpportunityPerson,
  useDeleteOpportunityPerson,
} from '../../hooks/useOpportunityPeople';
import { useContacts } from '../../hooks/useContacts';
import { useOrganizations } from '../../hooks/useOrganizations';
import {
  contactDisplayName,
  contactInitials,
  type ContactRow,
} from '../../types/contact';
import { orgInitials, type OrgRow } from '../../types/organization';
import {
  STATUS_OPTIONS,
  findStatusMeta,
  type ParticipantRole,
  type ParticipantStatus,
} from '../../types/opportunityPeople';
import { LBtn, LIcon, LSelect, LInput, LAvatar, LH } from '../primitives';
import { colors } from '../../styles/tokens';
import { useConfirm } from '../modals/ConfirmProvider';

interface Props {
  opportunityId: string;
}

type PickerKind = 'contact' | 'org' | null;

export function OpportunityPeopleSection({ opportunityId }: Props) {
  const { data: people = [] } = useOpportunityPeople(opportunityId);
  const { data: contacts = [] } = useContacts();
  const { data: orgs = [] } = useOrganizations();
  const add = useAddOpportunityPerson();
  const update = useUpdateOpportunityPerson();
  const del = useDeleteOpportunityPerson();

  const contactById = useMemo(() => Object.fromEntries(contacts.map((c) => [c.id, c])), [contacts]);
  const orgById = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);

  const organizers = people.filter((p) => p.role === 'organizer');
  const attendees = people.filter((p) => p.role === 'attendee');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PeopleGroup
        title="ORGANIZERS"
        subtitle="ใครเป็นคนจัด/ดูแล (Contact หรือ Org)"
        role="organizer"
        accent={colors.green}
        people={organizers}
        contactById={contactById}
        orgById={orgById}
        opportunityId={opportunityId}
        onAdd={(input) => add.mutate(input)}
        onUpdate={(id, patch) => update.mutate({ id, patch })}
        onRemove={(id) => del.mutate(id)}
        contacts={contacts}
        orgs={orgs}
      />

      <PeopleGroup
        title="ATTENDEES / PARTICIPANTS"
        subtitle="ใครเข้าร่วม + status (VVIP / Speaker / Invitee / Audience / Sponsor)"
        role="attendee"
        accent={colors.warn}
        people={attendees}
        contactById={contactById}
        orgById={orgById}
        opportunityId={opportunityId}
        onAdd={(input) => add.mutate(input)}
        onUpdate={(id, patch) => update.mutate({ id, patch })}
        onRemove={(id) => del.mutate(id)}
        contacts={contacts}
        orgs={orgs}
        withStatus
      />
    </div>
  );
}

function PeopleGroup({
  title,
  subtitle,
  role,
  accent,
  people,
  contactById,
  orgById,
  opportunityId,
  onAdd,
  onUpdate,
  onRemove,
  contacts,
  orgs,
  withStatus = false,
}: {
  title: string;
  subtitle: string;
  role: ParticipantRole;
  accent: string;
  people: ReturnType<typeof useOpportunityPeople>['data'] extends (infer T)[] | undefined ? T[] : never;
  contactById: Record<string, ContactRow>;
  orgById: Record<string, OrgRow>;
  opportunityId: string;
  onAdd: (input: {
    opportunity_id: string;
    role: ParticipantRole;
    contact_id?: string | null;
    org_id?: string | null;
    status?: ParticipantStatus | null;
  }) => void;
  onUpdate: (id: string, patch: { status?: ParticipantStatus | null }) => void;
  onRemove: (id: string) => void;
  contacts: ContactRow[];
  orgs: OrgRow[];
  withStatus?: boolean;
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [pickerKind, setPickerKind] = useState<PickerKind>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ParticipantStatus>('Audience');

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    const usedContacts = new Set(people.filter((p) => p.contact_id).map((p) => p.contact_id));
    const usedOrgs = new Set(people.filter((p) => p.org_id).map((p) => p.org_id));
    if (pickerKind === 'contact') {
      return contacts
        .filter((c) => !usedContacts.has(c.id))
        .filter((c) => !q || contactDisplayName(c).toLowerCase().includes(q))
        .slice(0, 8)
        .map((c) => ({ kind: 'contact' as const, item: c }));
    }
    if (pickerKind === 'org') {
      return orgs
        .filter((o) => !usedOrgs.has(o.id))
        .filter((o) => !q || o.name.toLowerCase().includes(q))
        .slice(0, 8)
        .map((o) => ({ kind: 'org' as const, item: o }));
    }
    return [];
  }, [pickerKind, search, contacts, orgs, people]);

  const handlePick = (kind: 'contact' | 'org', id: string) => {
    onAdd({
      opportunity_id: opportunityId,
      role,
      contact_id: kind === 'contact' ? id : null,
      org_id: kind === 'org' ? id : null,
      status: withStatus ? status : null,
    });
    setPickerKind(null);
    setSearch('');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.3,
              textTransform: 'uppercase',
              color: accent,
              fontWeight: 700,
            }}
          >
            {title} · {people.length}
          </div>
          <div style={{ fontSize: 11, color: colors.dim, marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <LBtn small ghost onClick={() => setPickerKind(pickerKind === 'contact' ? null : 'contact')}>
            <LIcon kind="plus" size={10} color={colors.dimSoft} /> CONTACT
          </LBtn>
          <LBtn small ghost onClick={() => setPickerKind(pickerKind === 'org' ? null : 'org')}>
            <LIcon kind="plus" size={10} color={colors.dimSoft} /> ORG
          </LBtn>
        </div>
      </div>

      {pickerKind && (
        <div
          style={{
            padding: 12,
            background: colors.bgSoft,
            border: `1px solid ${accent}`,
            borderRadius: '12px 0 12px 0',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <LInput
                value={search}
                onChange={setSearch}
                placeholder={pickerKind === 'contact' ? 'ค้นหา contact...' : 'ค้นหา organization...'}
              />
            </div>
            {withStatus && (
              <div style={{ width: 160 }}>
                <LSelect
                  value={status}
                  onChange={(v) => setStatus(v as ParticipantStatus)}
                  options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPickerKind(null);
                setSearch('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.dim,
                cursor: 'pointer',
                fontSize: 16,
                padding: 4,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {searchResults.length === 0 ? (
              <div style={{ padding: 10, color: colors.dim, fontSize: 12, textAlign: 'center' }}>
                {pickerKind === 'contact'
                  ? contacts.length === 0
                    ? 'ยังไม่มี contact'
                    : 'ไม่พบ contact'
                  : orgs.length === 0
                    ? 'ยังไม่มี org'
                    : 'ไม่พบ org'}
              </div>
            ) : (
              searchResults.map((r) => (
                <button
                  key={`${r.kind}-${r.item.id}`}
                  type="button"
                  onClick={() => handlePick(r.kind, r.item.id)}
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
                    borderRadius: '6px 0 6px 0',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgCard)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {r.kind === 'contact' ? (
                    <LAvatar initials={contactInitials(r.item)} size={22} />
                  ) : (
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        background: colors.oliveBg,
                        border: `1px solid #3a3f1f`,
                        color: colors.olive,
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: '5px 0 5px 0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {orgInitials((r.item as OrgRow).name)}
                    </span>
                  )}
                  <span style={{ flex: 1 }}>
                    {r.kind === 'contact' ? contactDisplayName(r.item) : (r.item as OrgRow).name}
                  </span>
                  <LIcon kind="plus" size={11} color={accent} />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {people.length === 0 ? (
        <div
          style={{
            padding: 16,
            background: colors.bgSoft,
            border: `1px dashed ${colors.line}`,
            borderRadius: '10px 0 10px 0',
            color: colors.dim,
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          ยังไม่มี — คลิก {role === 'organizer' ? '+ CONTACT / + ORG' : '+ CONTACT / + ORG'} ด้านบนเพื่อเพิ่ม
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {people.map((p) => {
            const isContact = !!p.contact_id;
            const contact = p.contact_id ? contactById[p.contact_id] : null;
            const org = p.org_id ? orgById[p.org_id] : null;
            const display = contact ? contactDisplayName(contact) : org?.name ?? '?';
            const statusMeta = findStatusMeta(p.status);

            return (
              <div
                key={p.id}
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
                {isContact && contact ? (
                  contact.avatar_url ? (
                    <img
                      src={contact.avatar_url}
                      alt=""
                      style={{
                        width: 28,
                        height: 28,
                        objectFit: 'cover',
                        border: `1px solid ${colors.lineHi}`,
                        borderRadius: '7px 0 7px 0',
                      }}
                    />
                  ) : (
                    <LAvatar initials={contactInitials(contact)} size={26} />
                  )
                ) : (
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      background: colors.oliveBg,
                      border: `1px solid #3a3f1f`,
                      color: colors.olive,
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: '7px 0 7px 0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {org ? orgInitials(org.name) : '?'}
                  </span>
                )}
                <div
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => {
                    if (contact) navigate(`/contacts/${contact.id}`);
                    else if (org) navigate(`/organizations/${org.id}`);
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{display}</div>
                  <div style={{ fontSize: 10, color: colors.dim, marginTop: 1, letterSpacing: 0.4 }}>
                    {isContact ? 'CONTACT' : 'ORGANIZATION'}
                  </div>
                </div>
                {withStatus && (
                  <div style={{ minWidth: 130 }}>
                    <select
                      value={p.status ?? ''}
                      onChange={(e) => onUpdate(p.id, { status: e.target.value as ParticipantStatus })}
                      style={{
                        width: '100%',
                        background: colors.bgCard,
                        color: statusMeta?.color ?? colors.surface,
                        border: `1px solid ${statusMeta?.color ?? colors.lineHi}`,
                        borderRadius: '6px 0 6px 0',
                        padding: '4px 8px',
                        fontSize: 11,
                        fontFamily: 'inherit',
                        fontWeight: 600,
                        letterSpacing: 0.4,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value} style={{ background: colors.bgCard, color: colors.text }}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (await confirm({ title: 'ลบออก?', danger: true })) onRemove(p.id);
                  }}
                  title="ลบ"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.dim,
                    cursor: 'pointer',
                    padding: 4,
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = colors.danger)}
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

/** Re-export for use elsewhere */
export { LH };
