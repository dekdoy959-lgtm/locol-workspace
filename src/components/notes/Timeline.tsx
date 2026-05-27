import { useMemo } from 'react';
import { useNotes, useDeleteNote } from '../../hooks/useNotes';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { useGmailMessages } from '../../hooks/useGmailMessages';
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
import { colors } from '../../styles/tokens';
import { LIcon } from '../primitives';
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
  | { kind: 'opportunity'; date: string; isFuture: boolean; opp: LinkedOpportunity };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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

  const deleteNote = useDeleteNote();
  const today = todayISO();

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
  }, [notes, events, messages, linkedOpportunities, today]);

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
            background: externalAuthError ? '#241a06' : colors.bgSoft,
            border: `1px solid ${externalAuthError ? '#5a3f10' : colors.line}`,
            borderRadius: '6px 0 6px 0',
            fontSize: 11,
            color: externalAuthError ? '#E8B923' : colors.dim,
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
  return `opp-${item.opp.id}-${item.opp.link_role}`;
}

function FeedRow({
  item,
  myEmail,
  onDeleteNote,
  onOpenOpportunity,
}: {
  item: FeedItem;
  myEmail: string;
  onDeleteNote: (id: string) => void;
  onOpenOpportunity: (id: string) => void;
}) {
  if (item.kind === 'meeting') return <MeetingRow event={item.event} isFuture={item.isFuture} />;
  if (item.kind === 'email') return <EmailRow message={item.message} myEmail={myEmail} />;
  if (item.kind === 'opportunity')
    return <OpportunityRow opp={item.opp} isFuture={item.isFuture} onOpen={() => onOpenOpportunity(item.opp.id)} />;
  return <NoteRowItem note={item.note} isFuture={item.isFuture} onDelete={() => onDeleteNote(item.note.id)} />;
}

function ExternalAuthNotice() {
  return (
    <div
      style={{
        marginTop: 10,
        padding: '8px 12px',
        background: '#241a06',
        border: '1px solid #5a3f10',
        borderRadius: '6px 0 6px 0',
        fontSize: 11,
        color: '#E8B923',
      }}
    >
      ⚠ Google Calendar / Gmail access หมดอายุ — logout + login ใหม่
    </div>
  );
}

function NoteRowItem({
  note,
  isFuture,
  onDelete,
}: {
  note: NoteRow;
  isFuture: boolean;
  onDelete: () => void;
}) {
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
          <KindChip color={colors.green} bg="#19250a" border={colors.greenDk}>
            NOTE
          </KindChip>
          {isFuture && (
            <KindChip color="#E8B923" bg="#241a06" border="#5a3f10">
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
            onClick={() => {
              if (confirm('ลบ note นี้?')) onDelete();
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
            onMouseEnter={(e) => (e.currentTarget.style.color = '#d96a66')}
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

function MeetingRow({ event, isFuture }: { event: CalendarEvent; isFuture: boolean }) {
  const time = eventTime(event);
  const meetLink = eventMeetLink(event);
  const opacity = isFuture ? 0.85 : 1;
  const accent = '#d96a66';

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
          <KindChip color={accent} bg="#241010" border="#5a1a18">
            📅 MEETING
          </KindChip>
          {time && (
            <span style={{ fontSize: 11, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
              {time}
            </span>
          )}
          {isFuture && (
            <KindChip color="#E8B923" bg="#241a06" border="#5a3f10">
              UPCOMING
            </KindChip>
          )}
          <span style={{ flex: 1 }} />
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
                  background: a.organizer ? '#19250a' : 'transparent',
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

function EmailRow({ message, myEmail }: { message: GmailMessageMeta; myEmail: string }) {
  const accent = '#9aa56a'; // olive — matches Contract track
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
          <KindChip color={accent} bg="#1d1f12" border="#3a3f1f">
            ✉ EMAIL · {outgoing ? 'SENT' : 'RECEIVED'}
          </KindChip>
          {isUnread && (
            <KindChip color={colors.green} bg="#19250a" border={colors.greenDk}>
              UNREAD
            </KindChip>
          )}
          {isImportant && (
            <KindChip color="#E8B923" bg="#241a06" border="#5a3f10">
              ★ IMPORTANT
            </KindChip>
          )}
          {time && (
            <span style={{ fontSize: 11, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
              {time}
            </span>
          )}
          <span style={{ flex: 1 }} />
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
            color={opp.link_role === 'organizer' ? colors.green : '#E8B923'}
            bg={opp.link_role === 'organizer' ? '#19250a' : '#241a06'}
            border={opp.link_role === 'organizer' ? colors.greenDk : '#5a3f10'}
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
        <span key={i} style={{ color: '#E8B923', fontWeight: 500 }}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
