import { useNavigate, useParams } from 'react-router-dom';
import { useContact } from '../../hooks/useContacts';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { NoteComposer } from '../../components/notes/NoteComposer';
import { Timeline } from '../../components/notes/Timeline';
import { MilestoneBoard } from '../../components/milestones/MilestoneBoard';
import { ShareContactModal } from '../../components/contacts/ShareContactModal';
import { RelationsSection } from '../../components/relations/RelationsSection';
import { LinkedOpportunities } from '../../components/opportunities/LinkedOpportunities';
import { DiscordAttachment } from '../../components/discord/DiscordAttachment';
import { useLinkedOpportunitiesForContact } from '../../hooks/useLinkedOpportunities';
import { useDiscordInboxForContact } from '../../hooks/useDiscordInbox';
import { useTeamMembers, teamMemberDisplayName } from '../../hooks/useTeamMembers';
import { InteractionsSection } from '../../components/interactions/InteractionsSection';
import { CommitmentsSection } from '../../components/commitments/CommitmentsSection';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { supabase } from '../../lib/supabase';
import {
  contactDisplayName,
  contactInitials,
  daysToFreq,
  formatAddress,
  type AddressEntry,
  type EducationEntry,
  type EmailEntry,
  type FreqUnit,
  type OrgEntry,
  type PhoneEntry,
  type SocialEntry,
} from '../../types/contact';
import {
  LCard,
  LH,
  LBtn,
  LChip,
  LAvatar,
  LField,
  LNote,
  LIcon,
} from '../../components/primitives';
import { colors } from '../../styles/tokens';

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading, error } = useContact(id);
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const { data: linkedOpps = [] } = useLinkedOpportunitiesForContact(id);
  const { data: discordSource } = useDiscordInboxForContact(id);
  const { data: team = [] } = useTeamMembers();
  const queryClient = useQueryClient();
  const [showDeleteDiscord, setShowDeleteDiscord] = useState(false);

  const deleteDiscordMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('discord_inbox').delete().eq('id', discordSource!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discord-inbox-contact', id] });
      setShowDeleteDiscord(false);
    },
  });

  if (isLoading) {
    return <div style={{ padding: 40, color: colors.dim, textAlign: 'center', fontSize: 13 }}>กำลังโหลด…</div>;
  }

  if (error || !contact) {
    return (
      <div style={{ padding: 40 }}>
        <LCard padding={24} bg={colors.dangerBg} border={colors.dangerDk}>
          <div style={{ color: colors.danger, marginBottom: 16 }}>ไม่พบ contact หรือเกิด error</div>
          <LBtn ghost onClick={() => navigate('/contacts')}>← กลับไปหน้า Contacts</LBtn>
        </LCard>
      </div>
    );
  }

  const phones = (contact.phones as PhoneEntry[]) ?? [];
  const emails = (contact.emails as EmailEntry[]) ?? [];
  const addresses = (contact.addresses as AddressEntry[]) ?? [];
  const socials = (contact.socials as SocialEntry[]) ?? [];
  const orgs = (contact.orgs as OrgEntry[]) ?? [];
  const education = (contact.education as EducationEntry[]) ?? [];

  // #9 — who on the LOCOL team coordinates this contact
  const owner = contact.owner_id ? team.find((m) => m.id === contact.owner_id) : null;
  const backup = contact.backup_id ? team.find((m) => m.id === contact.backup_id) : null;

  // #11 — days since we last contacted this person (last_contact_date is bumped
  // automatically whenever a new interaction is logged). Coloured vs freq_days.
  const lastContactDays = contact.last_contact_date
    ? Math.floor((Date.now() - new Date(contact.last_contact_date).getTime()) / 86_400_000)
    : null;
  const freqDays = contact.freq_days ?? null;
  const lastContactTone =
    lastContactDays === null
      ? 'none'
      : freqDays && lastContactDays > freqDays
        ? 'overdue'
        : freqDays && lastContactDays > freqDays * 0.7
          ? 'watch'
          : 'ok';
  const lastContactColor =
    lastContactTone === 'overdue'
      ? { ink: colors.danger, bg: colors.dangerBg, border: colors.dangerDk }
      : lastContactTone === 'watch'
        ? { ink: colors.warn, bg: colors.warnBg, border: colors.warnDk }
        : { ink: colors.dimSoft, bg: 'transparent', border: colors.lineHi };

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <button
          onClick={() => navigate('/contacts')}
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <LIcon kind="arrow-r" size={11} color={colors.dim} /> Contacts
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 24 }}>
        {/* LEFT — Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Header card */}
          <LCard padding={24}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <LChip ink={colors.dim}>{contact.id.slice(0, 8).toUpperCase()}</LChip>
              {contact.tier && (
                <LChip ink={colors.green} bg={colors.greenBg} border={colors.greenDk} big>
                  T{contact.tier} · {contact.tier === 1 ? 'INNER' : contact.tier === 2 ? 'ACTIVE' : 'WIDE'}
                </LChip>
              )}
              {contact.tie_type && <LChip ink={colors.surface}>{contact.tie_type}</LChip>}
              {contact.priority && (
                <LChip
                  ink={contact.priority === 'High' ? colors.danger : colors.dimSoft}
                  bg={contact.priority === 'High' ? colors.dangerBg : 'transparent'}
                  border={contact.priority === 'High' ? colors.dangerDk : colors.lineHi}
                >
                  <LIcon kind="flag" size={10} color={contact.priority === 'High' ? colors.danger : colors.dimSoft} />{' '}
                  {contact.priority.toUpperCase()}
                </LChip>
              )}
              {contact.health && (
                <LChip
                  ink={colors.green}
                  bg={colors.greenBg}
                  border={colors.greenDk}
                >
                  {contact.health}
                </LChip>
              )}
              {discordSource && (
                <LChip ink={colors.discord} bg="#5865F215" border="#5865F240">
                  DISCORD
                </LChip>
              )}
              {/* #11 — days since last contact */}
              {lastContactDays !== null ? (
                <LChip ink={lastContactColor.ink} bg={lastContactColor.bg} border={lastContactColor.border}>
                  <LIcon kind="clock" size={10} color={lastContactColor.ink} />
                  {lastContactDays === 0 ? 'ติดต่อวันนี้' : `ติดต่อล่าสุด ${lastContactDays} วันก่อน`}
                </LChip>
              ) : (
                <LChip ink={colors.dim} border={colors.lineHi}>ยังไม่เคยบันทึกการติดต่อ</LChip>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
              {contact.avatar_url ? (
                <img
                  src={contact.avatar_url}
                  alt={contactDisplayName(contact)}
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    border: `1px solid ${colors.green}`,
                    borderRadius: '12px 0 12px 0',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <LAvatar initials={contactInitials(contact)} size={56} ring />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 32,
                    lineHeight: 1.1,
                    letterSpacing: -0.5,
                    color: colors.text,
                  }}
                >
                  {contactDisplayName(contact)}
                </div>
                <div style={{ fontSize: 12.5, color: colors.dimSoft, marginTop: 6 }}>
                  {orgs.find((o) => o.is_primary)?.role || orgs[0]?.role || '—'}
                  {orgs[0]?.org_name && ` · ${orgs.find((o) => o.is_primary)?.org_name || orgs[0].org_name}`}
                </div>
                {/* #9 — LOCOL team coordinator(s) for this contact */}
                {(owner || backup) && (
                  <div style={{ fontSize: 12, color: colors.dimSoft, marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {owner && (
                      <span>ผู้ประสาน · <b style={{ color: colors.text }}>{teamMemberDisplayName(owner)}</b></span>
                    )}
                    {backup && (
                      <span>สำรอง · <b style={{ color: colors.surface }}>{teamMemberDisplayName(backup)}</b></span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <LBtn ghost onClick={() => setShareOpen(true)}>
                  <LIcon kind="link" size={11} color={colors.dimSoft} /> SHARE
                </LBtn>
                <LBtn ghost onClick={() => navigate(`/contacts/${contact.id}/merge`)}>
                  MERGE
                </LBtn>
                <LBtn primary onClick={() => navigate(`/contacts/${contact.id}/edit`)}>
                  แก้ไข
                </LBtn>
              </div>
            </div>

            {contact.bio && (
              <p style={{ fontSize: 14, color: colors.surface, lineHeight: 1.55, margin: 0 }}>{contact.bio}</p>
            )}
          </LCard>

          {/* Discord source */}
          {discordSource && (
            <LCard padding={20} style={{ borderLeft: '3px solid #5865F2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, letterSpacing: 1.2, color: colors.discord, fontWeight: 700 }}>
                    DISCORD SOURCE
                  </span>
                  <span style={{ fontSize: 11, color: colors.dim }}>
                    @{discordSource.author_name} · {new Date(discordSource.created_at).toLocaleDateString('th-TH')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <a href="/discord-inbox" style={{ fontSize: 11, color: colors.discord, textDecoration: 'none' }}>
                    ดู inbox →
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowDeleteDiscord(true)}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${colors.dangerDk}`,
                      color: colors.danger,
                      borderRadius: '6px 0 6px 0',
                      padding: '3px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      letterSpacing: 0.4,
                    }}
                  >
                    ลบ
                  </button>
                </div>
              </div>
              {discordSource.original_text && (
                <div
                  style={{
                    fontSize: 13,
                    color: colors.surface,
                    lineHeight: 1.55,
                    background: colors.bgSoft,
                    border: `1px solid ${colors.lineHi}`,
                    borderRadius: '8px 0 8px 0',
                    padding: '10px 14px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}
                >
                  {discordSource.original_text}
                </div>
              )}
              {Array.isArray(discordSource.attachment_paths) && discordSource.attachment_paths.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {discordSource.attachment_paths.map((a, i) => (
                    <DiscordAttachment key={i} storagePath={a.storage_path} filename={a.filename} />
                  ))}
                </div>
              )}
            </LCard>
          )}

          {/* Contact methods */}
          {(phones.length > 0 || emails.length > 0 || addresses.length > 0 || socials.length > 0) && (
            <LCard padding={20}>
              <LH level={5} accent={false} color={colors.green}>
                CONTACT METHODS
              </LH>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <Eyebrow>เบอร์โทร</Eyebrow>
                  {phones.length === 0 && <Dim>—</Dim>}
                  {phones.map((p, i) => (
                    <RowItem key={i} label={p.label} value={p.value} />
                  ))}
                </div>
                <div>
                  <Eyebrow>อีเมล</Eyebrow>
                  {emails.length === 0 && <Dim>—</Dim>}
                  {emails.map((e, i) => (
                    <RowItem key={i} label={e.label} value={e.value} mono />
                  ))}
                </div>
              </div>

              {addresses.length > 0 && (
                <>
                  <div style={{ height: 18 }} />
                  <Eyebrow>ที่อยู่</Eyebrow>
                  {addresses.map((a, i) => (
                    <RowItem key={i} label={a.label} value={formatAddress(a) || '—'} block />
                  ))}
                </>
              )}

              {socials.length > 0 && (
                <>
                  <div style={{ height: 18 }} />
                  <Eyebrow>Social</Eyebrow>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {socials.map((s, i) =>
                      s.url ? (
                        <a
                          key={i}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none' }}
                        >
                          <LChip ink={colors.green} border={colors.greenDk} bg={colors.greenBg}>
                            {s.platform} · {s.handle}
                          </LChip>
                        </a>
                      ) : (
                        <LChip key={i} ink={colors.surface}>
                          {s.platform} · {s.handle}
                        </LChip>
                      ),
                    )}
                  </div>
                </>
              )}
            </LCard>
          )}

          {/* Organizations */}
          {orgs.length > 0 && (
            <LCard padding={20}>
              <LH level={5} accent={false} color={colors.green}>
                ORGANIZATIONS
              </LH>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orgs.map((o, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 14px',
                      background: colors.bgSoft,
                      border: `1px solid ${o.is_primary ? colors.greenDk : colors.line}`,
                      borderRadius: '12px 0 12px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: colors.text }}>{o.org_name}</div>
                      {o.role && <div style={{ fontSize: 12, color: colors.dimSoft, marginTop: 2 }}>{o.role}</div>}
                      {(o.start_date || o.end_date || o.is_current) && (
                        <div
                          style={{
                            fontSize: 11,
                            color: colors.dim,
                            marginTop: 4,
                            fontFamily: "'IBM Plex Mono', monospace",
                            letterSpacing: 0.3,
                          }}
                        >
                          {formatOrgDates(o)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {o.is_current && (
                        <LChip ink={colors.green} bg={colors.greenBg} border={colors.greenDk}>
                          CURRENT
                        </LChip>
                      )}
                      {o.is_primary && (
                        <LChip ink={colors.green} bg={colors.greenBg} border={colors.greenDk}>
                          PRIMARY
                        </LChip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </LCard>
          )}

          {/* Education */}
          {education.length > 0 && (
            <LCard padding={20}>
              <LH level={5} accent={false} color={colors.green}>
                EDUCATION
              </LH>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {education.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 14px',
                      background: colors.bgSoft,
                      border: `1px solid ${colors.line}`,
                      borderRadius: '12px 0 12px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14, color: colors.text }}>{e.school}</div>
                      {e.degree && <div style={{ fontSize: 12, color: colors.dimSoft, marginTop: 2 }}>{e.degree}</div>}
                    </div>
                    {e.year && (
                      <div style={{ fontSize: 12, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {e.year}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </LCard>
          )}

          {/* Story */}
          {(contact.met_story || contact.value_exchange) && (
            <LCard padding={20}>
              <LH level={5} accent={false} color={colors.green}>
                STORY
              </LH>
              {contact.met_story && (
                <>
                  <Eyebrow>How we met</Eyebrow>
                  <p style={{ margin: 0, fontSize: 13.5, color: colors.surface, lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{contact.met_story}"
                  </p>
                </>
              )}
              {contact.value_exchange && (
                <>
                  <div style={{ height: 14 }} />
                  <Eyebrow>Value Exchange</Eyebrow>
                  <p style={{ margin: 0, fontSize: 13.5, color: colors.surface, lineHeight: 1.6 }}>
                    {contact.value_exchange}
                  </p>
                </>
              )}
            </LCard>
          )}

          {/* Interactions */}
          <LCard padding={20}>
            <LH
              level={5}
              accent={false}
              color={colors.green}
              sub="บันทึกการคุย/ติดต่อ · channel · direction · outcome"
            >
              INTERACTIONS · บันทึกการคุย
            </LH>
            <div style={{ height: 8 }} />
            <InteractionsSection contactId={contact.id} />
          </LCard>

          {/* Commitments */}
          <LCard padding={20}>
            <LH
              level={5}
              accent={false}
              color={colors.green}
              sub="สัญญาแล้ว — ติ๊กเมื่อทำเสร็จ"
            >
              COMMITMENTS · I owe / They owe
            </LH>
            <div style={{ height: 8 }} />
            <CommitmentsSection contactId={contact.id} />
          </LCard>

          {/* Related Contacts */}
          <LCard padding={20}>
            <LH
              level={5}
              accent={false}
              color={colors.green}
              sub="คนใน network ที่เชื่อมโยงกับคนนี้ — ดู Relationship Map ที่หน้า Network"
            >
              RELATED CONTACTS
            </LH>
            <div style={{ height: 8 }} />
            <RelationsSection contactId={contact.id} />
          </LCard>

          {/* Linked Opportunities (cross-layer) */}
          {linkedOpps.length > 0 && <LinkedOpportunities opportunities={linkedOpps} title="OPPORTUNITIES" />}

          {/* Milestones */}
          <LCard padding={20}>
            <LH
              level={5}
              accent={false}
              color={colors.green}
              sub="เป้าหมายของแต่ละฝั่ง — ติ๊ก ✓ เมื่อสำเร็จ"
            >
              MILESTONES
            </LH>
            <div style={{ height: 8 }} />
            <MilestoneBoard contactId={contact.id} currentUserId={user?.id} />
          </LCard>

          {/* Notes + Timeline */}
          <LCard padding={20}>
            <LH
              level={5}
              accent={false}
              color={colors.green}
              sub="Notes ที่เราเขียน + Meetings จาก Google Calendar ที่คนนี้เกี่ยวข้อง"
            >
              NOTES &amp; TIMELINE
            </LH>
            <div style={{ marginBottom: 18 }}>
              <NoteComposer scope="contact" targetId={contact.id} currentUserId={user?.id} />
            </div>
            <Timeline
              scope="contact"
              targetId={contact.id}
              calendarEmails={emails.map((e) => e.value)}
              linkedOpportunities={linkedOpps}
            />
          </LCard>
        </div>

        {/* RIGHT — Record card */}
        <div>
          <LCard padding={22}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <LNote>RECORD</LNote>
              <span style={{ fontSize: 10.5, color: colors.dim, letterSpacing: 0.8 }}>
                {new Date(contact.updated_at).toLocaleDateString('th-TH')}
              </span>
            </div>

            {contact.channel && (
              <LField
                label="Preferred Channel"
                value={<span style={{ color: colors.green, fontWeight: 500 }}>{contact.channel}</span>}
              />
            )}
            {contact.birthday && (
              <LField
                label="Birthday"
                value={
                  <span>
                    {contact.birthday}
                    {contact.birthday_notification_enabled && (
                      <span style={{ marginLeft: 8, fontSize: 10, color: colors.green, letterSpacing: 0.6 }}>
                        <LIcon kind="bell" size={9} color={colors.green} /> ALERT ON
                      </span>
                    )}
                  </span>
                }
              />
            )}
            {contact.suffix && <LField label="Suffix" value={contact.suffix} />}
            {contact.freq_days && (
              <LField
                label="Keep in Touch"
                value={
                  <span style={{ color: colors.green, fontFamily: "'IBM Plex Mono', monospace" }}>
                    ทุก {daysToFreq(contact.freq_days, (contact.freq_unit as FreqUnit) ?? 'months')}{' '}
                    {unitLabelTh((contact.freq_unit as FreqUnit) ?? 'months')}
                  </span>
                }
              />
            )}

            <div style={{ height: 8, borderBottom: `1px solid ${colors.line}`, marginBottom: 14 }} />

            <LField label="Tier" value={contact.tier ? `T${contact.tier}` : undefined} />
            <LField label="Tie Type" value={contact.tie_type ?? undefined} />
            <LField label="Priority" value={contact.priority ?? undefined} />
            <LField label="Health" value={contact.health ?? undefined} />

            <div style={{ height: 8, borderBottom: `1px solid ${colors.line}`, marginBottom: 14 }} />

            <LField label="Stage" value={contact.stage ?? undefined} />
            <LField label="Followup" value={contact.followup_status ?? undefined} />
            <LField label="Scenario" value={contact.scenario ?? undefined} />

            {contact.tags.length > 0 && (
              <>
                <div style={{ height: 8 }} />
                <Eyebrow>Tags</Eyebrow>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {contact.tags.map((t) => (
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

      {shareOpen && <ShareContactModal contact={contact} onClose={() => setShareOpen(false)} />}

      {showDeleteDiscord && (
        <ConfirmModal
          title="ลบ Discord Source?"
          body="ลบบันทึก Discord Inbox นี้ออก ข้อความต้นฉบับและรูปภาพจะหายไป ไม่สามารถกู้คืนได้"
          confirmLabel="ลบถาวร"
          danger
          isLoading={deleteDiscordMutation.isPending}
          onConfirm={() => deleteDiscordMutation.mutate()}
          onCancel={() => setShowDeleteDiscord(false)}
        />
      )}
    </div>
  );
}

function formatOrgDates(o: OrgEntry): string {
  const start = o.start_date ? o.start_date.slice(0, 7) : '?';
  const end = o.is_current ? 'PRESENT' : o.end_date ? o.end_date.slice(0, 7) : '?';
  return `${start} → ${end}`;
}

function unitLabelTh(unit: FreqUnit): string {
  return { days: 'วัน', weeks: 'สัปดาห์', months: 'เดือน', years: 'ปี' }[unit];
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 500,
        fontSize: 10,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: colors.dim,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Dim({ children }: { children: React.ReactNode }) {
  return <div style={{ color: colors.dim, fontSize: 12 }}>{children}</div>;
}

function RowItem({
  label,
  value,
  block = false,
  mono = false,
}: {
  label: string;
  value: string;
  block?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: block ? 'block' : 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '6px 0',
        borderBottom: `1px dashed ${colors.line}`,
      }}
    >
      <span style={{ fontSize: 10.5, color: colors.dim, letterSpacing: 0.6, textTransform: 'uppercase', minWidth: 60 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          color: colors.text,
          fontFamily: mono ? "'IBM Plex Mono', monospace" : 'inherit',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  );
}
