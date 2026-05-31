import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useContacts } from '../../hooks/useContacts';
import { orgInitials } from '../../types/organization';
import { RELATIONSHIP_STATUS_META, type RelationshipStatus, type OrgEntry } from '../../types/contact';
import { LCard, LH, LBtn, LIcon, LInput, LNote, LChip } from '../../components/primitives';
import { colors } from '../../styles/tokens';

export function OrgListPage() {
  const navigate = useNavigate();
  const { data: orgs = [], isLoading } = useOrganizations();
  const { data: contacts = [] } = useContacts();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RelationshipStatus | 'all'>('all');

  // Roll up people per org by org_id (stable across renames). Entries with a
  // null org_id are free-text orgs — fall back to name-matching for those only.
  const peopleCountByOrg = useMemo(() => {
    const byId: Record<string, number> = {};
    const byName: Record<string, number> = {};
    for (const c of contacts) {
      for (const o of c.orgs as OrgEntry[]) {
        if (o.org_id) byId[o.org_id] = (byId[o.org_id] ?? 0) + 1;
        else {
          const key = o.org_name.toLowerCase().trim();
          byName[key] = (byName[key] ?? 0) + 1;
        }
      }
    }
    return { byId, byName };
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orgs.filter((o) => {
      if (statusFilter !== 'all' && o.relationship_status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        (o.industry ?? '').toLowerCase().includes(q) ||
        (o.type ?? '').toLowerCase().includes(q)
      );
    });
  }, [orgs, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { all: orgs.length, known: 0, prospect: 0, cold: 0, archived: 0 };
    for (const o of orgs) m[o.relationship_status as RelationshipStatus] = (m[o.relationship_status as RelationshipStatus] ?? 0) + 1;
    return m;
  }, [orgs]);

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <LNote>People Layer · Database 2</LNote>
          <div style={{ height: 12 }} />
          <LH level={2} sub="องค์กรทั้งหมดที่ทีมเราติดต่อ — ดู people · cross-layer items · timeline ของทั้ง org">
            ORGANIZATIONS
          </LH>
        </div>
        <LBtn primary onClick={() => navigate('/organizations/new')}>
          <LIcon kind="plus" size={12} color={colors.bg} /> NEW ORG
        </LBtn>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <LIcon kind="search" size={14} color={colors.dim} />
          </span>
          <LInput value={search} onChange={setSearch} placeholder="ค้นหา org · industry · type" style={{ paddingLeft: 36 }} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'known', 'prospect', 'cold', 'archived'] as const).map((s) => {
            const meta = s === 'all' ? null : RELATIONSHIP_STATUS_META[s];
            const selected = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '7px 12px',
                  background: selected ? (meta?.color ?? colors.green) : 'transparent',
                  color: selected ? colors.bg : (meta?.color ?? colors.dimSoft),
                  border: `1px solid ${selected ? (meta?.color ?? colors.green) : colors.lineHi}`,
                  borderRadius: '8px 0 8px 0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 11.5,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                {s === 'all' ? 'ทั้งหมด' : meta?.label} · {statusCounts[s] ?? 0}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>
      ) : filtered.length === 0 ? (
        <LCard padding={40}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: colors.dimSoft, marginBottom: 12 }}>
              {orgs.length === 0 ? 'ยังไม่มี organization ในระบบ' : 'ไม่พบตามที่ค้น'}
            </div>
            {orgs.length === 0 && (
              <LBtn primary onClick={() => navigate('/organizations/new')}>
                <LIcon kind="plus" size={12} color={colors.bg} /> สร้าง org แรก
              </LBtn>
            )}
          </div>
        </LCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map((o) => {
            const peopleCount =
              (peopleCountByOrg.byId[o.id] ?? 0) +
              (peopleCountByOrg.byName[o.name.toLowerCase().trim()] ?? 0);
            return (
              <LCard
                key={o.id}
                padding={16}
                bg={colors.bgCard}
                style={{ cursor: 'pointer', transition: 'border-color 150ms' }}
                onClick={() => navigate(`/organizations/${o.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      background: colors.oliveBg,
                      border: `1px solid #3a3f1f`,
                      borderRadius: '10px 0 10px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.olive,
                      fontWeight: 700,
                      fontSize: 14,
                      letterSpacing: 0.5,
                      flexShrink: 0,
                    }}
                  >
                    {orgInitials(o.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14.5,
                        color: colors.text,
                        lineHeight: 1.3,
                        marginBottom: 4,
                      }}
                    >
                      {o.name}
                    </div>
                    {(o.industry || o.type) && (
                      <div style={{ fontSize: 11.5, color: colors.dimSoft }}>
                        {[o.type, o.industry].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {(() => {
                    const rsMeta = RELATIONSHIP_STATUS_META[o.relationship_status as RelationshipStatus];
                    return (
                      <LChip ink={rsMeta.color} border={rsMeta.border} bg={rsMeta.bg}>
                        {rsMeta.label}
                      </LChip>
                    );
                  })()}
                  {o.our_tier && (
                    <LChip ink={colors.olive} border={colors.oliveDk} bg={colors.oliveBg}>
                      T{o.our_tier}
                    </LChip>
                  )}
                  {o.health && <LChip ink={colors.dimSoft}>{o.health}</LChip>}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: colors.dim,
                    paddingTop: 10,
                    borderTop: `1px solid ${colors.line}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    <b style={{ color: colors.text, fontFamily: "'IBM Plex Mono', monospace" }}>{peopleCount}</b> people
                  </span>
                  {o.hq && <span>📍 {o.hq}</span>}
                </div>
              </LCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
