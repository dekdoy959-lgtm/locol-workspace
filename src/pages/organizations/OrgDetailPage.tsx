import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrganization } from '../../hooks/useOrganizations';
import { useContacts } from '../../hooks/useContacts';
import { useAuth } from '../../contexts/AuthContext';
import { contactDisplayName, contactInitials, type OrgEntry } from '../../types/contact';
import { orgInitials } from '../../types/organization';
import {
  LCard,
  LH,
  LBtn,
  LChip,
  LField,
  LIcon,
  LNote,
  LAvatar,
} from '../../components/primitives';
import { NoteComposer } from '../../components/notes/NoteComposer';
import { Timeline } from '../../components/notes/Timeline';
import { LinkedOpportunities } from '../../components/opportunities/LinkedOpportunities';
import { useLinkedOpportunitiesForOrg } from '../../hooks/useLinkedOpportunities';
import { colors } from '../../styles/tokens';

export function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: org, isLoading } = useOrganization(id);
  const { data: allContacts = [] } = useContacts();
  const { user } = useAuth();
  const { data: linkedOpps = [] } = useLinkedOpportunitiesForOrg(id);

  const peopleAtOrg = useMemo(() => {
    if (!org) return [];
    const orgName = org.name.toLowerCase().trim();
    // Match by org_id (stable across renames); fall back to name only for
    // free-text org entries (org_id null).
    const matches = (o: OrgEntry) =>
      o.org_id ? o.org_id === org.id : o.org_name.toLowerCase().trim() === orgName;
    return allContacts.filter((c) => (c.orgs as OrgEntry[]).some(matches));
  }, [org, allContacts]);

  const primaryContacts = useMemo(
    () =>
      peopleAtOrg.filter((c) =>
        (c.orgs as OrgEntry[]).some(
          (o) =>
            (o.org_id
              ? o.org_id === org?.id
              : o.org_name.toLowerCase().trim() === org?.name.toLowerCase().trim()) && o.is_primary,
        ),
      ),
    [peopleAtOrg, org],
  );

  const peopleEmails = useMemo(
    () => peopleAtOrg.flatMap((c) => (c.emails as { value: string }[]).map((e) => e.value)),
    [peopleAtOrg],
  );

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>;
  }

  if (!org) {
    return (
      <div style={{ padding: 40 }}>
        <LCard padding={24} bg={colors.dangerBg} border={colors.dangerDk}>
          <div style={{ color: colors.danger, marginBottom: 16 }}>ไม่พบ organization</div>
          <LBtn ghost onClick={() => navigate('/organizations')}>← กลับ</LBtn>
        </LCard>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1400, margin: '0 auto' }}>
      <button
        onClick={() => navigate('/organizations')}
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
        <LIcon kind="arrow-r" size={11} color={colors.dim} /> Organizations
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 24 }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Header */}
          <LCard padding={24}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <LChip ink={colors.dim}>{org.id.slice(0, 8).toUpperCase()}</LChip>
              <LChip ink={colors.olive} bg={colors.oliveBg} border={colors.oliveDk} big>
                ORGANIZATION
              </LChip>
              {org.our_tier && (
                <LChip ink={colors.green} bg={colors.greenBg} border={colors.greenDk} big>
                  T{org.our_tier}
                </LChip>
              )}
              {org.health && <LChip ink={colors.surface}>{org.health}</LChip>}
              {org.industry && <LChip ink={colors.dimSoft}>{org.industry}</LChip>}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: colors.oliveBg,
                  border: `1px solid ${colors.oliveDk}`,
                  borderRadius: '12px 3px 12px 3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.olive,
                  fontWeight: 700,
                  fontSize: 20,
                  letterSpacing: 1,
                  flexShrink: 0,
                }}
              >
                {orgInitials(org.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 30,
                    lineHeight: 1.1,
                    letterSpacing: -0.5,
                    color: colors.text,
                    textTransform: 'uppercase',
                  }}
                >
                  {org.name}
                </div>
                <div style={{ fontSize: 12.5, color: colors.dimSoft, marginTop: 6 }}>
                  {[org.type, org.hq, org.founded && `est. ${org.founded}`].filter(Boolean).join(' · ')}
                </div>
              </div>
              <LBtn primary onClick={() => navigate(`/organizations/${org.id}/edit`)}>
                แก้ไข
              </LBtn>
            </div>
          </LCard>

          {/* Stats */}
          <LCard padding={20}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <Stat label="People" value={String(peopleAtOrg.length)} accent />
              <Stat label="Primary" value={String(primaryContacts.length)} accent={primaryContacts.length > 0} />
              <Stat label="With Avatar" value={String(peopleAtOrg.filter((c) => c.avatar_url).length)} />
              <Stat label="Tier" value={org.our_tier ? `T${org.our_tier}` : '—'} />
            </div>
          </LCard>

          {/* Org-level notes */}
          {org.notes && (
            <LCard
              padding={20}
              style={{ borderLeft: `3px solid ${colors.green}` }}
            >
              <div style={{ fontSize: 10, letterSpacing: 1.2, color: colors.green, fontWeight: 700, marginBottom: 8 }}>
                ORG NOTES · STRATEGIC CONTEXT
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: colors.surface, lineHeight: 1.6, fontStyle: 'italic' }}>
                "{org.notes}"
              </p>
            </LCard>
          )}

          {/* People at this org */}
          <LCard padding={20}>
            <LH
              level={5}
              accent={false}
              color={colors.green}
              sub="คนที่ทำงาน/เคยทำงานที่ org นี้ — ดึงจาก contact.orgs อัตโนมัติ"
            >
              PEOPLE AT THIS ORG · {peopleAtOrg.length}
            </LH>

            {peopleAtOrg.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  background: colors.bgSoft,
                  border: `1px dashed ${colors.line}`,
                  borderRadius: '12px 3px 12px 3px',
                  color: colors.dim,
                  fontSize: 12.5,
                  textAlign: 'center',
                }}
              >
                ยังไม่มีคนใน contacts ที่ระบุ org นี้ — ไป Contact → Edit → Organizations
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {peopleAtOrg.map((c) => {
                  const myOrg = (c.orgs as OrgEntry[]).find(
                    (o) => o.org_name.toLowerCase().trim() === org.name.toLowerCase().trim(),
                  );
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/contacts/${c.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        background: colors.bgSoft,
                        border: `1px solid ${myOrg?.is_primary ? colors.greenDk : colors.line}`,
                        borderRadius: '10px 3px 10px 3px',
                        cursor: 'pointer',
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgCard)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = colors.bgSoft)}
                    >
                      {c.avatar_url ? (
                        <img
                          src={c.avatar_url}
                          alt=""
                          style={{
                            width: 36,
                            height: 36,
                            objectFit: 'cover',
                            border: `1px solid ${myOrg?.is_primary ? colors.green : colors.lineHi}`,
                            borderRadius: '8px 2px 8px 2px',
                          }}
                        />
                      ) : (
                        <LAvatar initials={contactInitials(c)} size={32} ring={myOrg?.is_primary} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>
                            {contactDisplayName(c)}
                          </span>
                          {myOrg?.is_primary && (
                            <LChip ink={colors.green} bg={colors.greenBg} border={colors.greenDk}>
                              PRIMARY
                            </LChip>
                          )}
                          {myOrg?.is_current && (
                            <LChip ink={colors.green} bg={colors.greenBg} border={colors.greenDk}>
                              CURRENT
                            </LChip>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: colors.dimSoft, marginTop: 2 }}>
                          {myOrg?.role ?? '—'}
                          {myOrg?.start_date && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: 10.5,
                                color: colors.dim,
                              }}
                            >
                              {myOrg.start_date.slice(0, 7)} → {myOrg.is_current ? 'PRESENT' : myOrg.end_date?.slice(0, 7) ?? '?'}
                            </span>
                          )}
                        </div>
                      </div>
                      {c.tier && (
                        <LChip ink={colors.green} border={colors.greenDk} bg={colors.greenBg}>
                          T{c.tier}
                        </LChip>
                      )}
                      <LIcon kind="arrow-r" size={12} color={colors.dim} />
                    </div>
                  );
                })}
              </div>
            )}
          </LCard>

          {/* Linked Opportunities (cross-layer) */}
          {linkedOpps.length > 0 && <LinkedOpportunities opportunities={linkedOpps} title="OPPORTUNITIES" />}

          {/* Org-level Notes + Timeline (roll-up will pull all contact emails) */}
          <LCard padding={20}>
            <LH
              level={5}
              accent={false}
              color={colors.green}
              sub="Notes ของ Org · Calendar meetings + Gmail roll-up จากทุกคนใน org นี้"
            >
              ORG TIMELINE · ROLL-UP
            </LH>
            <div style={{ marginBottom: 18 }}>
              <NoteComposer scope="org" targetId={org.id} currentUserId={user?.id} />
            </div>
            <Timeline scope="org" targetId={org.id} calendarEmails={peopleEmails} linkedOpportunities={linkedOpps} />
          </LCard>
        </div>

        {/* RIGHT */}
        <div>
          <LCard padding={22}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <LNote>RECORD</LNote>
              <span style={{ fontSize: 10.5, color: colors.dim, letterSpacing: 0.8 }}>
                {new Date(org.updated_at).toLocaleDateString('th-TH')}
              </span>
            </div>

            <LField label="Type" value={org.type ?? undefined} />
            <LField label="Industry" value={org.industry ?? undefined} />
            <LField label="HQ" value={org.hq ?? undefined} />
            <LField label="Size" value={org.size ?? undefined} />
            <LField label="Founded" value={org.founded ? String(org.founded) : undefined} />
            <LField
              label="Website"
              value={
                org.website ? (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: colors.green, textDecoration: 'underline' }}
                  >
                    {org.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : undefined
              }
            />

            {org.tags.length > 0 && (
              <>
                <div style={{ height: 8 }} />
                <div style={{ fontSize: 10, color: colors.dim, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 6 }}>
                  Tags
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {org.tags.map((t) => (
                    <LChip key={t} ink={colors.dimSoft}>
                      #{t}
                    </LChip>
                  ))}
                </div>
              </>
            )}
          </LCard>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: -0.5,
          color: accent ? colors.green : colors.text,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: colors.dim,
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}
