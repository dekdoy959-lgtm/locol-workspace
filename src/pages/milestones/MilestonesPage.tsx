import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllMilestones } from '../../hooks/useAllMilestones';
import { useContacts } from '../../hooks/useContacts';
import {
  contactDisplayName,
  contactInitials,
  type ContactRow,
} from '../../types/contact';
import { SIDE_LABEL, type MilestoneRow, type MilestoneSide } from '../../types/milestone';
import { LCard, LH, LIcon, LNote, LAvatar, LChip } from '../../components/primitives';
import { colors } from '../../styles/tokens';
import { todayLocalISO } from '../../lib/dateUtil';

type SideFilter = 'all' | MilestoneSide;
type StatusFilter = 'all' | 'open' | 'done';
type GroupMode = 'tier' | 'date';

const SIDE_COLORS: Record<MilestoneSide, string> = {
  them: colors.warn,
  us: colors.green,
  shared: colors.olive,
};

interface TierMeta {
  tier: 1 | 2 | 3 | 'none';
  label: string;
  sublabel: string;
  color: string;
  soft: string;
}

const TIER_META: TierMeta[] = [
  { tier: 1, label: 'T1 · INNER',  sublabel: 'คนสำคัญที่สุด · cadence สั้น', color: colors.green, soft: colors.greenBg },
  { tier: 2, label: 'T2 · ACTIVE', sublabel: 'คนที่ดูแลแบบ active',          color: colors.warn,    soft: colors.warnBg },
  { tier: 3, label: 'T3 · WIDE',   sublabel: 'เครือข่ายกว้าง',                color: colors.olive,    soft: colors.oliveBg },
  { tier: 'none', label: 'NO TIER', sublabel: 'ยังไม่ได้กำหนด tier',          color: colors.dim,   soft: colors.bgSoft },
];

export function MilestonesPage() {
  const navigate = useNavigate();
  const { data: milestones = [], isLoading } = useAllMilestones();
  const { data: contacts = [] } = useContacts();

  const [side, setSide] = useState<SideFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [group, setGroup] = useState<GroupMode>('tier');

  const contactById = useMemo(() => Object.fromEntries(contacts.map((c) => [c.id, c])), [contacts]);

  const filtered = useMemo(() => {
    return milestones.filter((m) => {
      // Drop orphaned milestones whose contact no longer exists (or isn't in
      // useContacts) — they render as nothing but were still counted in the
      // section badges, producing "NO TIER · 4" with zero visible rows.
      if (!contactById[m.contact_id]) return false;
      if (side !== 'all' && m.side !== side) return false;
      if (status === 'open' && m.achieved) return false;
      if (status === 'done' && !m.achieved) return false;
      return true;
    });
  }, [milestones, contactById, side, status]);

  const today = todayLocalISO();

  // Group by Tier (primary)
  const byTier = useMemo(() => {
    const m: Record<string, MilestoneRow[]> = { '1': [], '2': [], '3': [], none: [] };
    for (const ms of filtered) {
      const contact = contactById[ms.contact_id];
      const tier = contact?.tier ?? 'none';
      const key = String(tier);
      (m[key] ??= []).push(ms);
    }
    // Sort each tier by date: upcoming first then no-date then past
    for (const key of Object.keys(m)) {
      m[key].sort((a, b) => {
        // Future > today > undated > past
        const ad = a.date ?? '';
        const bd = b.date ?? '';
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        const aFuture = ad >= today;
        const bFuture = bd >= today;
        if (aFuture && bFuture) return ad.localeCompare(bd);
        if (!aFuture && !bFuture) return bd.localeCompare(ad);
        return aFuture ? -1 : 1;
      });
    }
    return m;
  }, [filtered, contactById, today]);

  // Group by Date (secondary mode)
  const byDate = useMemo(() => {
    const upcoming: MilestoneRow[] = [];
    const undated: MilestoneRow[] = [];
    const past: MilestoneRow[] = [];
    for (const ms of filtered) {
      if (!ms.date) undated.push(ms);
      else if (ms.date >= today) upcoming.push(ms);
      else past.push(ms);
    }
    upcoming.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    past.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    return { upcoming, undated, past };
  }, [filtered, today]);

  const counts = useMemo(() => {
    const total = milestones.length;
    const done = milestones.filter((m) => m.achieved).length;
    const open = total - done;
    const them = milestones.filter((m) => m.side === 'them').length;
    const us = milestones.filter((m) => m.side === 'us').length;
    const shared = milestones.filter((m) => m.side === 'shared').length;
    return { total, done, open, them, us, shared };
  }, [milestones]);

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <LNote>People Layer · Goals</LNote>
          <div style={{ height: 10 }} />
          <LH level={3} sub="Milestones ของทุก contact · จัดกลุ่มตาม Tier · เห็นภาพรวมเป้าหมาย">
            MILESTONES
          </LH>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18 }}>
        <Stat label="Total" value={counts.total} />
        <Stat label="Open" value={counts.open} color={colors.green} />
        <Stat label="Done ✓" value={counts.done} color={colors.dimSoft} />
        <Stat label="Their / Our" value={`${counts.them} / ${counts.us}`} color="#E8B923" />
        <Stat label="Shared" value={counts.shared} color="#9aa56a" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        <FilterGroup
          label="Group by"
          value={group}
          options={[
            { value: 'tier', label: 'Tier' },
            { value: 'date', label: 'Date status' },
          ]}
          onChange={(v) => setGroup(v as GroupMode)}
        />
        <FilterGroup
          label="Side"
          value={side}
          options={[
            { value: 'all', label: 'ทั้งหมด' },
            { value: 'them', label: 'ฝั่งเขา' },
            { value: 'us', label: 'ฝั่งเรา' },
            { value: 'shared', label: 'ร่วมกัน' },
          ]}
          onChange={(v) => setSide(v as SideFilter)}
        />
        <FilterGroup
          label="Status"
          value={status}
          options={[
            { value: 'all', label: 'ทั้งหมด' },
            { value: 'open', label: 'ยังไม่สำเร็จ' },
            { value: 'done', label: 'สำเร็จแล้ว' },
          ]}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>
      ) : filtered.length === 0 ? (
        <LCard padding={40}>
          <div style={{ textAlign: 'center', color: colors.dimSoft, fontSize: 13 }}>
            {milestones.length === 0
              ? 'ยังไม่มี milestones — ไปที่ Contact คนไหนคนนึงเพื่อเพิ่ม'
              : 'ไม่พบตาม filter ที่เลือก'}
          </div>
        </LCard>
      ) : group === 'tier' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {TIER_META.map((tier) => {
            const items = byTier[String(tier.tier)] ?? [];
            if (items.length === 0) return null;
            return (
              <TierSection
                key={tier.tier}
                meta={tier}
                milestones={items}
                contactById={contactById}
                navigate={navigate}
                today={today}
              />
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {byDate.upcoming.length > 0 && (
            <DateSection
              title="UPCOMING · ยังไม่ถึง"
              count={byDate.upcoming.length}
              accent={colors.green}
              milestones={byDate.upcoming}
              contactById={contactById}
              navigate={navigate}
            />
          )}
          {byDate.undated.length > 0 && (
            <DateSection
              title="NO DATE · ไม่ระบุวัน"
              count={byDate.undated.length}
              accent={colors.dimSoft}
              milestones={byDate.undated}
              contactById={contactById}
              navigate={navigate}
            />
          )}
          {byDate.past.length > 0 && (
            <DateSection
              title="PAST · ผ่านวันที่แล้ว"
              count={byDate.past.length}
              accent="#d99a66"
              milestones={byDate.past}
              contactById={contactById}
              navigate={navigate}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <LCard padding={14}>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: -0.5,
          color: color ?? colors.text,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: colors.dim, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6 }}>
        {label}
      </div>
    </LCard>
  );
}

function FilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 9.5,
          color: colors.dim,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 5,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              padding: '6px 12px',
              background: value === o.value ? colors.green : 'transparent',
              color: value === o.value ? colors.bg : colors.dimSoft,
              border: `1px solid ${value === o.value ? colors.green : colors.lineHi}`,
              borderRadius: '6px 0 6px 0',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TierSection({
  meta,
  milestones,
  contactById,
  navigate,
  today,
}: {
  meta: TierMeta;
  milestones: MilestoneRow[];
  contactById: Record<string, ContactRow>;
  navigate: (path: string) => void;
  today: string;
}) {
  return (
    <LCard padding={20} bg={colors.bgCard} style={{ borderLeft: `4px solid ${meta.color}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: meta.color,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {meta.label}
        </span>
        <span style={{ fontSize: 12, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>
          · {milestones.length}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: colors.dim, letterSpacing: 0.3 }}>{meta.sublabel}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {milestones.map((m) => (
          <MilestoneItem key={m.id} milestone={m} contactById={contactById} navigate={navigate} today={today} />
        ))}
      </div>
    </LCard>
  );
}

function DateSection({
  title,
  count,
  accent,
  milestones,
  contactById,
  navigate,
}: {
  title: string;
  count: number;
  accent: string;
  milestones: MilestoneRow[];
  contactById: Record<string, ContactRow>;
  navigate: (path: string) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, background: accent, borderRadius: 99 }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: accent,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
        <span style={{ fontSize: 11, color: colors.dim, fontFamily: "'IBM Plex Mono', monospace" }}>· {count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {milestones.map((m) => (
          <MilestoneItem key={m.id} milestone={m} contactById={contactById} navigate={navigate} today={todayLocalISO()} />
        ))}
      </div>
    </div>
  );
}

function MilestoneItem({
  milestone,
  contactById,
  navigate,
  today,
}: {
  milestone: MilestoneRow;
  contactById: Record<string, ContactRow>;
  navigate: (path: string) => void;
  today: string;
}) {
  const contact = contactById[milestone.contact_id];
  if (!contact) return null;
  const sideColor = SIDE_COLORS[milestone.side];
  const isOverdue = milestone.date && milestone.date < today && !milestone.achieved;

  return (
    <div
      style={{
        padding: 12,
        background: colors.bgSoft,
        border: `1px solid ${isOverdue ? colors.dangerDk : colors.line}`,
        borderRadius: '10px 0 10px 0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div onClick={() => navigate(`/contacts/${contact.id}`)} style={{ cursor: 'pointer', flexShrink: 0 }}>
        {contact.avatar_url ? (
          <img
            src={contact.avatar_url}
            alt=""
            style={{
              width: 30,
              height: 30,
              objectFit: 'cover',
              border: `1px solid ${colors.lineHi}`,
              borderRadius: '7px 0 7px 0',
            }}
          />
        ) : (
          <LAvatar initials={contactInitials(contact)} size={28} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              color: sideColor,
              border: `1px solid ${sideColor}`,
              padding: '1px 5px',
              borderRadius: '3px 0 3px 0',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {SIDE_LABEL[milestone.side].split('·')[0].trim()}
          </span>
          <span
            onClick={() => navigate(`/contacts/${contact.id}`)}
            style={{ fontSize: 11, color: colors.dimSoft, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {contactDisplayName(contact)}
          </span>
          {milestone.achieved && (
            <LChip ink={colors.green} bg="#19250a" border={colors.greenDk}>
              ✓ DONE
            </LChip>
          )}
          {isOverdue && (
            <LChip ink="#d96a66" bg="#241010" border="#5a1a18">
              OVERDUE
            </LChip>
          )}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: colors.text,
            textDecoration: milestone.achieved ? 'line-through' : 'none',
            lineHeight: 1.3,
          }}
        >
          {milestone.title}
        </div>
        {milestone.description && (
          <div style={{ fontSize: 12, color: colors.dimSoft, marginTop: 3, lineHeight: 1.5 }}>
            {milestone.description}
          </div>
        )}
      </div>
      {milestone.date && (
        <div
          style={{
            fontSize: 11,
            color: sideColor,
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: 0.3,
            flexShrink: 0,
          }}
        >
          {milestone.date}
        </div>
      )}
      <button
        type="button"
        onClick={() => navigate(`/contacts/${contact.id}`)}
        title="เปิด contact"
        style={{
          background: 'transparent',
          border: 'none',
          color: colors.dim,
          cursor: 'pointer',
          padding: 4,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = colors.green)}
        onMouseLeave={(e) => (e.currentTarget.style.color = colors.dim)}
      >
        <LIcon kind="arrow-r" size={12} color="currentColor" />
      </button>
    </div>
  );
}
