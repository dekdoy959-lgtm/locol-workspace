import { useMemo, useState } from 'react';
import { useNotes, useDeleteNote } from '../../hooks/useNotes';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { useGmailMessages } from '../../hooks/useGmailMessages';
import {
  useSharedExternalIds,
  usePromoteGmail,
  usePromoteCalendar,
  usePromoteBulk,
  useContactInteractions,
  type InteractionRow,
} from '../../hooks/useInteractions';
import { useTeamMembers, teamMemberInitials, teamMemberDisplayName, type TeamMemberRow } from '../../hooks/useTeamMembers';
import { useAuth } from '../../contexts/AuthContext';
import type { NoteRow, NoteScope } from '../../types/note';
import {
  type CalendarEvent,
  eventDate,
  eventMeetLink,
  eventTime,
  CalendarAuthError,
} from '../../lib/google-calendar';
import {
  type GmailMessageMeta,
  GmailAuthError,
  getHeader,
  gmailMessageUrl,
  isOutgoing,
  messageDate,
  messageTime,
  parseAddress,
} from '../../lib/google-gmail';
import { colors, z } from '../../styles/tokens';
import { useConfirm } from '../modals/ConfirmProvider';
import { LIcon, LAvatar } from '../primitives';
import { todayLocalISO } from '../../lib/dateUtil';
import type { LinkedOpportunity } from '../../hooks/useLinkedOpportunities';
import { findTrack, formatDueRelative } from '../../types/opportunity';
import { useNavigate } from 'react-router-dom';

interface TimelineProps {
  scope: NoteScope;
  targetId: string;
  /** Emails to look up calendar meetings + Gmail messages for */
  calendarEmails?: string[];
  /** Linked opportunities to show as timeline rows (for Contact/Org views) */
  linkedOpportunities?: LinkedOpportunity[];
}

type FeedItem =
  | { kind: 'note'; date: string; isFuture: boolean; note: NoteRow }
  | { kind: 'meeting'; date: string; isFuture: boolean; event: CalendarEvent }
  | { kind: 'email'; date: string; isFuture: boolean; message: GmailMessageMeta }
  | { kind: 'interaction'; date: string; isFuture: boolean; interaction: InteractionRow }
  | { kind: 'opportunity'; date: string; isFuture: boolean; opp: LinkedOpportunity };

function todayISO(): string {
  return todayLocalISO();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function daysFromToday(iso: string): string {
  const today = new Date(todayISO());
  const target = new Date(iso);
  const diffMs = target.getTime() - today.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days > 0) return `in ${days}d`;
  return `${Math.abs(days)}d ago`;
}

export function Timeline({ scope, targetId, calendarEmails = [], linkedOpportunities = [] }: TimelineProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myEmail = user?.email ?? '';

  const { data: notes = [], isLoading: notesLoading } = useNotes(scope, targetId);
  const {
    data: events = [],
    error: calendarError,
    isLoading: calendarLoading,
  } = useCalendarEvents(calendarEmails);
  const {
    data: messages = [],
    error: gmailError,
    isLoading: gmailLoading,
  } = useGmailMessages(calendarEmails);

  // Share-to-team — only meaningful when scope is a contact (interactions are contact-scoped)
  const isContactScope = scope === 'contact';
  const contactId = isContactScope ? targetId : undefined;
  const { sharedKeys, sharedByMap } = useSharedExternalIds(contactId);
  const { data: interactions = [] } = useContactInteractions(contactId);
  const promoteGmail = usePromoteGmail();
  const promoteCalendar = usePromoteCalendar();
  const promoteBulk = usePromoteBulk();
  const { data: team = [] } = useTeamMembers();
  const teamById = useMemo(() => Object.fromEntries(team.map((t) => [t.id, t])), [team]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const deleteNote = useDeleteNote();
  const today = todayISO();

  // Count items the team doesn't see yet
  const unsharedCounts = useMemo(() => {
    if (!isContactScope) return { gmail: 0, calendar: 0 };
    let gmail = 0;
    let calendar = 0;
    for (const m of messages) if (!sharedKeys.has(`gmail:${m.id}`)) gmail++;
    for (const e of events) {
      if (!sharedKeys.has(`calendar:${e.id}`)) {
        const d = eventDate(e);
        if (d && d <= today) calendar++; // only count past events (no point sharing future-tense)
      }
    }
    return { gmail, calendar };
  }, [messages, events, sharedKeys, isContactScope, today]);
  const totalUnshared = unsharedCounts.gmail + unsharedCounts.calendar;

  const handleShareAll = () => {
    if (!contactId) return;
    const gmailToShare = messages.filter((m) => !sharedKeys.has(`gmail:${m.id}`));
    const calendarToShare = events.filter((e) => {
      if (sharedKeys.has(`calendar:${e.id}`)) return false;
      const d = eventDate(e);
      return d != null && d <= today;
    });
    promoteBulk.mutate(
      { gmailMessages: gmailToShare, calendarEvents: calendarToShare, contactId },
      { onSettled: () => setBulkConfirmOpen(false) },
    );
  };

  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];

    for (const note of notes) {
      items.push({ kind: 'note', date: note.date, isFuture: note.date > today, note });
    }

    for (const event of events) {
      const d = eventDate(event);
      if (!d) continue;
      items.push({ kind: 'meeting', date: d, isFuture: d > today, event });
    }

    for (const message of messages) {
      const d = messageDate(message);
      if (!d) continue;
      // Emails are always past — never "future"
      items.push({ kind: 'email', date: d, isFuture: false, message });
    }

    // Interactions logged manually (or promoted from gmail/calendar)
    for (const i of interactions) {
      items.push({
        kind: 'interaction',
        date: i.date,
        isFuture: i.date > today,
        interaction: i,
      });
    }

    for (const opp of linkedOpportunities) {
      // Use due_date if exists (it's the event-relevant date), else created_at
      const rawDate = opp.due_date ?? opp.created_at.slice(0, 10);
      items.push({
        kind: 'opportunity',
        date: rawDate,
        isFuture: rawDate > today,
        opp,
      });
    }

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [notes, events, messages, interactions, linkedOpportunities, today]);

  const todayIndex = useMemo(() => {
    for (let i = 0; i < feed.length; i++) {
      if (feed[i].date <= today) return i;
    }
    return feed.length;
  }, [feed, today]);

  const calendarAuthError = calendarError instanceof CalendarAuthError;
  const gmailAuthError = gmailError instanceof GmailAuthError;
  const externalAuthError = calendarAuthError || gmailAuthError;
  const loadingExternal = calendarLoading || gmailLoading;

  if (notesLoading && !notes.length) {
    return <div style={{ color: colors.dim, fontSize: 12, padding: 12 }}>กำลังโหลด timeline…</div>;
  }

  if (feed.length === 0 && !loadingExternal) {
    return (
      <div>
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            background: colors.bgSoft,
            border: `1px dashed ${colors.line}`,
            borderRadius: '14px 0 14px 0',
            color: colors.dim,
            fontSize: 12.5,
          }}
        >
          ยังไม่มี note / meeting / email — เพิ่ม note แรกด้านบนเลย
        </div>
        {externalAuthError && <ExternalAuthNotice />}
      </div>
    );
  }

  return (
    <div>
      {(loadingExternal || externalAuthError) && (
        <div
          style={{
            marginBottom: 10,
            padding: '6px 12px',
            background: externalAuthError ? colors.warnBg : colors.bgSoft,
            border: `1px solid ${externalAuthError ? colors.warnDk : colors.line}`,
            borderRadius: '6px 0 6px 0',
            fontSize: 11,
            color: externalAuthError ? colors.warn : colors.dim,
            letterSpacing: 0.3,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {externalAuthError ? (
            <>⚠ Google {calendarAuthError && gmailAuthError ? 'Calendar + Gmail' : calendarAuthError ? 'Calendar' : 'Gmail'} access หมดอายุ — logout + login ใหม่</>
          ) : (
            <>
              {calendarLoading && <span>📅 กำลังดึง Calendar…</span>}
              {gmailLoading && <span>📧 กำลังดึง Gmail…</span>}
            </>
          )}
        </div>
      )}

      {/* Share-to-team banner */}
      {isContactScope && totalUnshared > 0 && (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            background: colors.greenBg,
            border: `1px solid ${colors.greenDk}`,
            borderRadius: '10px 0 10px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: colors.green, fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>
              💎 มี {totalUnshared} รายการที่ทีมยังมองไม่เห็น
            </div>
            <div style={{ fontSize: 11, color: colors.dimSoft, lineHeight: 1.4 }}>
              {unsharedCounts.gmail > 0 && <>✉ {unsharedCounts.gmail} emails </>}
              {unsharedCounts.gmail > 0 && unsharedCounts.calendar > 0 && '· '}
              {unsharedCounts.calendar > 0 && <>📅 {unsharedCounts.calendar} meetings </>}
              · Share เพื่อให้ทีมเห็นใน Interactions
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBulkConfirmOpen(true)}
            disabled={promoteBulk.isPending}
            style={{
              padding: '7px 14px',
              background: colors.green,
              color: colors.bg,
              border: 'none',
              borderRadius: '8px 0 8px 0',
              cursor: promoteBulk.isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              opacity: promoteBulk.isPending ? 0.6 : 1,
            }}
          >
            📤 Share all
          </button>
        </div>
      )}

      {/* Bulk confirm modal */}
      {bulkConfirmOpen && (
        <BulkConfirmModal
          gmailCount={unsharedCounts.gmail}
          calendarCount={unsharedCounts.calendar}
          isPending={promoteBulk.isPending}
          onConfirm={handleShareAll}
          onCancel={() => setBulkConfirmOpen(false)}
        />
      )}

      <div style={{ position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 79,
            top: 8,
            bottom: 8,
            width: 1,
            background: colors.line,
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {feed.slice(0, todayIndex).map((item) => (
            <FeedRow
              key={feedKey(item)}
              item={item}
              myEmail={myEmail}
              contactId={contactId}
              sharedKeys={sharedKeys}
              sharedByMap={sharedByMap}
              teamById={teamById}
              currentUserId={user?.id ?? null}
              onShareGmail={(m) => contactId && promoteGmail.mutate({ message: m, contactId })}
              onShareCalendar={(e) => contactId && promoteCalendar.mutate({ event: e, contactId })}
              gmailPending={promoteGmail.isPending}
              calendarPending={promoteCalendar.isPending}
              onDeleteNote={(noteId) => deleteNote.mutate({ id: noteId, scope, targetId })}
              onOpenOpportunity={(oid) => navigate(`/inbox/${oid}`)}
            />
          ))}

          {/* Today divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
            <div style={{ width: 70, textAlign: 'right', position: 'relative', zIndex: 1 }}>
              <span
                style={{
                  background: colors.green,
                  color: colors.bg,
                  padding: '3px 10px',
                  fontSize: 10,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  borderRadius: '6px 0 6px 0',
                }}
              >
                TODAY
              </span>
            </div>
            <div style={{ flex: 1, height: 1, background: colors.greenDk, opacity: 0.5 }} />
          </div>

          {feed.slice(todayIndex).map((item) => (
            <FeedRow
              key={feedKey(item)}
              item={item}
              myEmail={myEmail}
              contactId={contactId}
              sharedKeys={sharedKeys}
              sharedByMap={sharedByMap}
              teamById={teamById}
              currentUserId={user?.id ?? null}
              onShareGmail={(m) => contactId && promoteGmail.mutate({ message: m, contactId })}
              onShareCalendar={(e) => contactId && promoteCalendar.mutate({ event: e, contactId })}
              gmailPending={promoteGmail.isPending}
              calendarPending={promoteCalendar.isPending}
              onDeleteNote={(noteId) => deleteNote.mutate({ id: noteId, scope, targetId })}
              onOpenOpportunity={(oid) => navigate(`/inbox/${oid}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function feedKey(item: FeedItem): string {
  if (item.kind === 'note') return `note-${item.note.id}`;
  if (item.kind === 'meeting') return `evt-${item.event.id}`;
  if (item.kind === 'email') return `email-${item.message.id}`;
  if (item.kind === 'interaction') return `int-${item.interaction.id}`;
  return `opp-${item.opp.id}-${item.opp.link_role}`;
}

interface FeedRowProps {
  item: FeedItem;
  myEmail: string;
  contactId: string | undefined;
  sharedKeys: Set<string>;
  sharedByMap: Map<string, string | null>;
  teamById: Record<string, TeamMemberRow | undefined>;
  currentUserId: string | null;
  onShareGmail: (message: GmailMessageMeta) => void;
  onShareCalendar: (event: CalendarEvent) => void;
  gmailPending: boolean;
  calendarPending: boolean;
  onDeleteNote: (id: string) => void;
  onOpenOpportunity: (id: string) => void;
}

function FeedRow({
  item,
  myEmail,
  contactId,
  sharedKeys,
  sharedByMap,
  teamById,
  currentUserId,
  onShareGmail,
  onShareCalendar,
  gmailPending,
  calendarPending,
  onDeleteNote,
  onOpenOpportunity,
}: FeedRowProps) {
  if (item.kind === 'meeting') {
    const key = `calendar:${item.event.id}`;
    const isShared = sharedKeys.has(key);
    const sharedById = isShared ? sharedByMap.get(key) ?? null : null;
    const sharedByName = sharedById
      ? sharedById === currentUserId
        ? 'you'
        : teamById[sharedById]?.full_name?.split(' ')[0] ?? teamById[sharedById]?.email?.split('@')[0] ?? 'team'
      : null;
    return (
      <MeetingRow
        event={item.event}
        isFuture={item.isFuture}
        canShare={!!contactId && !item.isFuture}
        isShared={isShared}
        sharedByName={sharedByName}
        sharePending={calendarPending}
        onShare={() => onShareCalendar(item.event)}
      />
    );
  }
  if (item.kind === 'email') {
    const key = `gmail:${item.message.id}`;
    const isShared = sharedKeys.has(key);
    const sharedById = isShared ? sharedByMap.get(key) ?? null : null;
    const sharedByName = sharedById
      ? sharedById === currentUserId
        ? 'you'
        : teamById[sharedById]?.full_name?.split(' ')[0] ?? teamById[sharedById]?.email?.split('@')[0] ?? 'team'
      : null;
    return (
      <EmailRow
        message={item.message}
        myEmail={myEmail}
        canShare={!!contactId}
        isShared={isShared}
        sharedByName={sharedByName}
        sharePending={gmailPending}
        onShare={() => onShareGmail(item.message)}
      />
    );
  }
  if (item.kind === 'opportunity')
    return <OpportunityRow opp={item.opp} isFuture={item.isFuture} onOpen={() => onOpenOpportunity(item.opp.id)} />;
  if (item.kind === 'interaction') {
    const member = item.interaction.logged_by ? teamById[item.interaction.logged_by] : null;
    return <InteractionRowView interaction={item.interaction} loggedBy={member ?? null} />;
  }
  const noteAuthor = item.note.created_by ? teamById[item.note.created_by] : null;
  return (
    <NoteRowItem
      note={item.note}
      isFuture={item.isFuture}
      author={noteAuthor ?? null}
      onDelete={() => onDeleteNote(item.note.id)}
    />
  );
}

// Bulk-share confirmation modal
function BulkConfirmModal({
  gmailCount,
  calendarCount,
  isPending,
  onConfirm,
  onCancel,
}: {
  gmailCount: number;
  calendarCount: number;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: z.toast,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.bgCard,
          border: `1px solid ${colors.lineHi}`,
          borderRadius: '14px 0 14px 0',
          padding: 24,
          maxWidth: 460,
          width: '100%',
        }}
      >
        <div style={{ fontSize: 16, color: colors.text, fontWeight: 600, marginBottom: 10 }}>
          📤 Share {gmailCount + calendarCount} รายการกับทีม?
        </div>
        <div style={{ fontSize: 13, color: colors.dimSoft, lineHeight: 1.6, marginBottom: 18 }}>
          ทีมจะเห็น <b style={{ color: colors.text }}>subject + snippet + เวลา</b> ของ:
          {gmailCount > 0 && (
            <div style={{ marginTop: 6 }}>· ✉ <b>{gmailCount}</b> Gmail messages</div>
          )}
          {calendarCount > 0 && (
            <div style={{ marginTop: 2 }}>· 📅 <b>{calendarCount}</b> Calendar meetings</div>
          )}
          <div style={{ marginTop: 10, fontSize: 12, color: colors.dim, fontStyle: 'italic' }}>
            💡 รายการที่ share แล้วจะอยู่ใน <b>Interactions</b> ของ contact นี้ · ลบทีหลังได้
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: `1px solid ${colors.lineHi}`,
              color: colors.dimSoft,
              borderRadius: '8px 0 8px 0',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            style={{
              padding: '8px 16px',
              background: colors.green,
              border: 'none',
              color: colors.bg,
              borderRadius: '8px 0 8px 0',
              cursor: isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              fontWeight: 700,
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'กำลังแชร์…' : '📤 Share all'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExternalAuthNotice() {
  return (
    <div
      style={{
        marginTop: 10,
        padding: '8px 12px',
        background: colors.warnBg,
        border: `1px solid ${colors.warnDk}`,
        borderRadius: '6px 0 6px 0',
        fontSize: 11,
        color: colors.warn,
      }}
    >
      ⚠ Google Calendar / Gmail access หมดอายุ — logout + login ใหม่
    </div>
  );
}

function NoteRowItem({
  note,
  isFuture,
  author,
  onDelete,
}: {
  note: NoteRow;
  isFuture: boolean;
  author: TeamMemberRow | null;
  onDelete: () => void;
}) {
  const confirm = useConfirm();
  const isFutureWithReminder = isFuture && note.is_future;
  const opacity = isFuture ? 0.78 : 1;

  return (
    <div style={{ display: 'flex', gap: 12, opacity }}>
      <DateColumn date={note.date} />
      <Rail isFuture={isFuture} accent={colors.green} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: colors.bgSoft,
          border: `1px solid ${colors.line}`,
          borderRadius: '12px 0 12px 0',
          padding: '10px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <KindChip color={colors.green} bg={colors.greenBg} border={colors.greenDk}>
            NOTE
          </KindChip>
          {author && (
            <span
              title={`เขียนโดย ${teamMemberDisplayName(author)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 10.5,
                color: colors.dimSoft,
              }}
            >
              <LAvatar initials={teamMemberInitials(author)} size={16} />
              {author.full_name?.split(' ')[0] ?? author.email.split('@')[0]}
            </span>
          )}
          {isFuture && (
            <KindChip color={colors.warn} bg={colors.warnBg} border={colors.warnDk}>
              SCHEDULED
            </KindChip>
          )}
          {isFutureWithReminder && (
            <KindChip color={colors.green} bg="transparent" border={colors.greenDk} dashed>
              🔔 REMINDER
            </KindChip>
          )}
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={async () => {
              if (await confirm({ title: 'ลบ note นี้?', danger: true })) onDelete();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.dim,
              cursor: 'pointer',
              fontSize: 11,
              padding: 0,
              opacity: 0.6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.danger)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.dim)}
          >
            <LIcon kind="warn" size={11} color="currentColor" />
          </button>
        </div>
        <div style={{ fontSize: 13.5, color: colors.surface, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
          {renderNoteText(note.text)}
        </div>
        {note.tags && note.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {note.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 10.5,
                  color: colors.dimSoft,
                  padding: '1px 6px',
                  border: `1px solid ${colors.line}`,
                  borderRadius: '4px 0 4px 0',
                }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingRow({
  event,
  isFuture,
  canShare,
  isShared,
  sharedByName,
  sharePending,
  onShare,
}: {
  event: CalendarEvent;
  isFuture: boolean;
  canShare: boolean;
  isShared: boolean;
  sharedByName: string | null;
  sharePending: boolean;
  onShare: () => void;
}) {
  const time = eventTime(event);
  const meetLink = eventMeetLink(event);
  const opacity = isFuture ? 0.85 : 1;
  const accent = colors.danger;

  return (
    <div style={{ display: 'flex', gap: 12, opacity }}>
      <DateColumn date={eventDate(event)} />
      <Rail isFuture={isFuture} accent={accent} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: '#1a1010',
          border: `1px solid #3a1818`,
          borderRadius: '12px 0 12px 0',
          padding: '10px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <KindChip color={accent} bg={colors.dangerBg} border={colors.dangerDk}>
            📅 MEETING
          </KindChip>
          {time && (
            <span style={{ fontSize: 11, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
              {time}
            </span>
          )}
          {isFuture && (
            <KindChip color={colors.warn} bg={colors.warnBg} border={colors.warnDk}>
              UPCOMING
            </KindChip>
          )}
          <span style={{ flex: 1 }} />
          {canShare && (
            <ShareButton isShared={isShared} sharedByName={sharedByName} pending={sharePending} onShare={onShare} />
          )}
          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 10.5,
                color: colors.dim,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = colors.green)}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = colors.dim)}
            >
              OPEN ↗
            </a>
          )}
        </div>

        <div style={{ fontSize: 14, color: colors.text, fontWeight: 500, lineHeight: 1.4 }}>
          {event.summary ?? '(no title)'}
        </div>

        {event.location && (
          <div style={{ fontSize: 12, color: colors.dimSoft, marginTop: 4 }}>📍 {event.location}</div>
        )}

        {meetLink && (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginTop: 6,
              fontSize: 11.5,
              color: colors.green,
              textDecoration: 'none',
              letterSpacing: 0.3,
            }}
          >
            🎥 Join Meet
          </a>
        )}

        {event.attendees && event.attendees.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {event.attendees.slice(0, 6).map((a) => (
              <span
                key={a.email}
                title={a.email}
                style={{
                  fontSize: 10.5,
                  color: a.responseStatus === 'accepted' ? colors.green : colors.dimSoft,
                  padding: '1px 6px',
                  border: `1px solid ${colors.line}`,
                  borderRadius: '4px 0 4px 0',
                  background: a.organizer ? colors.greenBg : 'transparent',
                }}
              >
                {a.displayName ?? a.email.split('@')[0]}
                {a.organizer && ' ★'}
              </span>
            ))}
            {event.attendees.length > 6 && (
              <span style={{ fontSize: 10.5, color: colors.dim, padding: '1px 6px' }}>
                +{event.attendees.length - 6}
              </span>
            )}
          </div>
        )}

        {event.description && (
          <details style={{ marginTop: 8 }}>
            <summary
              style={{
                fontSize: 11,
                color: colors.dim,
                cursor: 'pointer',
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              รายละเอียด
            </summary>
            <div
              style={{
                fontSize: 12.5,
                color: colors.dimSoft,
                marginTop: 6,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
              }}
            >
              {event.description}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function EmailRow({
  message,
  myEmail,
  canShare,
  isShared,
  sharedByName,
  sharePending,
  onShare,
}: {
  message: GmailMessageMeta;
  myEmail: string;
  canShare: boolean;
  isShared: boolean;
  sharedByName: string | null;
  sharePending: boolean;
  onShare: () => void;
}) {
  const accent = colors.olive; // olive
  const outgoing = myEmail && isOutgoing(message, myEmail);

  const from = parseAddress(getHeader(message, 'From'))[0];
  const tos = parseAddress(getHeader(message, 'To'));
  const subject = getHeader(message, 'Subject') || '(no subject)';
  const time = messageTime(message);

  const isUnread = message.labelIds.includes('UNREAD');
  const isImportant = message.labelIds.includes('IMPORTANT');

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <DateColumn date={messageDate(message)} />
      <Rail isFuture={false} accent={accent} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: '#161812',
          border: `1px solid #2a2d1f`,
          borderRadius: '12px 0 12px 0',
          padding: '10px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <KindChip color={accent} bg={colors.oliveBg} border={colors.oliveDk}>
            ✉ EMAIL · {outgoing ? 'SENT' : 'RECEIVED'}
          </KindChip>
          {isUnread && (
            <KindChip color={colors.green} bg={colors.greenBg} border={colors.greenDk}>
              UNREAD
            </KindChip>
          )}
          {isImportant && (
            <KindChip color={colors.warn} bg={colors.warnBg} border={colors.warnDk}>
              ★ IMPORTANT
            </KindChip>
          )}
          {time && (
            <span style={{ fontSize: 11, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
              {time}
            </span>
          )}
          <span style={{ flex: 1 }} />
          {canShare && (
            <ShareButton isShared={isShared} sharedByName={sharedByName} pending={sharePending} onShare={onShare} />
          )}
          <a
            href={gmailMessageUrl(message)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 10.5,
              color: colors.dim,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = colors.green)}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = colors.dim)}
          >
            OPEN IN GMAIL ↗
          </a>
        </div>

        <div style={{ fontSize: 13.5, color: colors.text, fontWeight: 500, lineHeight: 1.4 }}>
          {subject}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, fontSize: 11, color: colors.dimSoft }}>
          <span>
            <b style={{ color: colors.dim, marginRight: 4 }}>{outgoing ? 'TO' : 'FROM'}:</b>
            {outgoing
              ? tos.map((p) => p.name || p.email).join(', ')
              : from?.name || from?.email || '?'}
          </span>
        </div>

        {message.snippet && (
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 12,
              color: colors.dim,
              lineHeight: 1.5,
              fontStyle: 'italic',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            "{message.snippet}"
          </p>
        )}
      </div>
    </div>
  );
}

function OpportunityRow({
  opp,
  isFuture,
  onOpen,
}: {
  opp: LinkedOpportunity;
  isFuture: boolean;
  onOpen: () => void;
}) {
  const meta = findTrack(opp.track);
  const opacity = isFuture ? 0.85 : 1;

  return (
    <div style={{ display: 'flex', gap: 12, opacity }}>
      <DateColumn date={opp.due_date ?? opp.created_at.slice(0, 10)} />
      <Rail isFuture={isFuture} accent={meta.color.ink} />
      <div
        onClick={onOpen}
        style={{
          flex: 1,
          minWidth: 0,
          background: meta.color.soft,
          border: `1px solid ${meta.color.chip}`,
          borderRadius: '12px 0 12px 0',
          padding: '10px 14px',
          cursor: 'pointer',
          transition: 'border-color 150ms',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = meta.color.ink)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = meta.color.chip)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <KindChip color={meta.color.ink} bg={meta.color.soft} border={meta.color.chip}>
            🎯 OPPORTUNITY · {meta.name}
          </KindChip>
          <KindChip color={meta.color.ink} bg="transparent" border={meta.color.chip} dashed>
            {opp.stage}
          </KindChip>
          <KindChip
            color={opp.link_role === 'organizer' ? colors.green : colors.warn}
            bg={opp.link_role === 'organizer' ? colors.greenBg : colors.warnBg}
            border={opp.link_role === 'organizer' ? colors.greenDk : colors.warnDk}
          >
            {opp.link_role}
          </KindChip>
          {opp.link_status && (
            <KindChip color={colors.dimSoft} bg="transparent" border={colors.lineHi}>
              {opp.link_status}
            </KindChip>
          )}
          <span style={{ flex: 1 }} />
          {opp.due_date && (
            <span style={{ fontSize: 11, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
              {formatDueRelative(opp.due_date)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 14, color: colors.text, fontWeight: 500, lineHeight: 1.4 }}>{opp.title}</div>
      </div>
    </div>
  );
}

function DateColumn({ date }: { date: string }) {
  return (
    <div style={{ width: 70, textAlign: 'right', flexShrink: 0, paddingTop: 8 }}>
      <div style={{ fontWeight: 500, fontSize: 12, color: colors.text }}>{formatDate(date)}</div>
      <div style={{ fontSize: 10, color: colors.dim, marginTop: 2 }}>{daysFromToday(date)}</div>
    </div>
  );
}

function Rail({ isFuture, accent }: { isFuture: boolean; accent: string }) {
  return (
    <div style={{ position: 'relative', width: 18, flexShrink: 0, paddingTop: 10 }}>
      <span
        style={{
          position: 'absolute',
          left: 4,
          width: 9,
          height: 9,
          background: isFuture ? 'transparent' : accent,
          border: `1.5px solid ${isFuture ? colors.dim : accent}`,
          borderRadius: 99,
          zIndex: 2,
        }}
      />
    </div>
  );
}

function KindChip({
  children,
  color,
  bg,
  border,
  dashed = false,
}: {
  children: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  dashed?: boolean;
}) {
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: 0.8,
        padding: '2px 7px',
        background: bg,
        color,
        border: `1px ${dashed ? 'dashed' : 'solid'} ${border}`,
        borderRadius: '4px 0 4px 0',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

function InteractionRowView({
  interaction,
  loggedBy,
}: {
  interaction: InteractionRow;
  loggedBy: TeamMemberRow | null;
}) {
  // Choose visual based on source/channel
  const sourceMeta = (() => {
    if (interaction.source === 'gmail') {
      return { accent: colors.olive, bg: colors.oliveBg, border: colors.oliveDk, icon: '✉', label: 'EMAIL (TEAM)' };
    }
    if (interaction.source === 'calendar') {
      return { accent: colors.danger, bg: colors.dangerBg, border: colors.dangerDk, icon: '📅', label: 'MEETING (TEAM)' };
    }
    // Manual entries
    if (interaction.channel === 'Email') {
      return { accent: colors.olive, bg: colors.oliveBg, border: colors.oliveDk, icon: '✉', label: 'EMAIL' };
    }
    if (interaction.channel === 'Phone') {
      return { accent: colors.warn, bg: colors.warnBg, border: colors.warnDk, icon: '📞', label: 'PHONE' };
    }
    if (interaction.channel === 'Line') {
      return { accent: '#99CE24', bg: colors.greenBg, border: '#6e9618', icon: '💬', label: 'LINE' };
    }
    if (interaction.channel === 'In Person') {
      return { accent: '#d99a66', bg: '#2a1d10', border: '#6a3f1c', icon: '🤝', label: 'IN PERSON' };
    }
    if (interaction.channel === 'Video Call') {
      return { accent: colors.danger, bg: colors.dangerBg, border: colors.dangerDk, icon: '🎥', label: 'VIDEO CALL' };
    }
    return { accent: colors.green, bg: colors.greenBg, border: colors.greenDk, icon: '·', label: 'INTERACTION' };
  })();

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <DateColumn date={interaction.date} />
      <Rail isFuture={false} accent={sourceMeta.accent} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: sourceMeta.bg,
          border: `1px solid ${sourceMeta.border}`,
          borderRadius: '12px 0 12px 0',
          padding: '10px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <KindChip color={sourceMeta.accent} bg={sourceMeta.bg} border={sourceMeta.border}>
            {sourceMeta.icon} {sourceMeta.label}
            {interaction.direction === 'outbound' && ' · OUT'}
            {interaction.direction === 'inbound' && ' · IN'}
          </KindChip>
          {loggedBy && (
            <span
              title={`Logged by ${teamMemberDisplayName(loggedBy)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 10.5,
                color: colors.dimSoft,
              }}
            >
              <LAvatar initials={teamMemberInitials(loggedBy)} size={16} />
              {loggedBy.full_name?.split(' ')[0] ?? loggedBy.email.split('@')[0]}
            </span>
          )}
          <span style={{ flex: 1 }} />
          {interaction.external_url && (
            <a
              href={interaction.external_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 10.5,
                color: colors.dim,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = colors.green)}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = colors.dim)}
            >
              OPEN ↗
            </a>
          )}
        </div>
        {interaction.subject && (
          <div style={{ fontSize: 13, color: colors.text, fontWeight: 500, marginBottom: 4 }}>
            {interaction.subject}
          </div>
        )}
        <div style={{ fontSize: 12.5, color: colors.surface, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {interaction.summary}
        </div>
        {interaction.outcome && (
          <div style={{ fontSize: 11.5, color: colors.dimSoft, marginTop: 6, fontStyle: 'italic' }}>
            → {interaction.outcome}
          </div>
        )}
      </div>
    </div>
  );
}

function ShareButton({
  isShared,
  sharedByName,
  pending,
  onShare,
}: {
  isShared: boolean;
  sharedByName: string | null;
  pending: boolean;
  onShare: () => void;
}) {
  if (isShared) {
    return (
      <span
        title={sharedByName ? `Shared by ${sharedByName}` : 'Shared with team'}
        style={{
          fontSize: 10.5,
          color: colors.green,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          fontWeight: 600,
          padding: '2px 6px',
          background: colors.greenBg,
          border: `1px solid ${colors.greenDk}`,
          borderRadius: '4px 0 4px 0',
          whiteSpace: 'nowrap',
        }}
      >
        ✓ SHARED{sharedByName ? ` · ${sharedByName}` : ''}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onShare}
      disabled={pending}
      title="Share with team — saves to interactions"
      style={{
        fontSize: 10.5,
        color: colors.dimSoft,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        fontWeight: 600,
        padding: '2px 7px',
        background: 'transparent',
        border: `1px dashed ${colors.lineHi}`,
        borderRadius: '4px 0 4px 0',
        cursor: pending ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        opacity: pending ? 0.5 : 1,
        transition: 'color 100ms, border-color 100ms',
      }}
      onMouseEnter={(e) => {
        if (!pending) {
          e.currentTarget.style.color = colors.green;
          e.currentTarget.style.borderColor = colors.greenDk;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = colors.dimSoft;
        e.currentTarget.style.borderColor = colors.lineHi;
      }}
    >
      {pending ? '…' : '📤 SHARE'}
    </button>
  );
}

function renderNoteText(text: string) {
  const parts = text.split(/(#[\w฀-๿-]+|@[\w฀-๿-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span key={i} style={{ color: colors.green, fontWeight: 500 }}>
          {part}
        </span>
      );
    }
    if (part.startsWith('@')) {
      return (
        <span key={i} style={{ color: colors.warn, fontWeight: 500 }}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
