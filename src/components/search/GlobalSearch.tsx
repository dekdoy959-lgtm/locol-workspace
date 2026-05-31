import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContacts } from '../../hooks/useContacts';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useOpportunities } from '../../hooks/useOpportunities';
import { useGroups } from '../../hooks/useGroups';
import { contactDisplayName, contactInitials, type ContactRow } from '../../types/contact';
import { orgInitials, type OrgRow } from '../../types/organization';
import { findTrack, formatDueRelative, type OpportunityRow } from '../../types/opportunity';
import type { GroupRow } from '../../types/group';
import { LIcon, LAvatar } from '../primitives';
import { colors, z } from '../../styles/tokens';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  kind: 'contact' | 'organization' | 'opportunity' | 'group';
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
  /** Lower = higher priority */
  score: number;
  data?: ContactRow | OrgRow | OpportunityRow | GroupRow;
}

function matchScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 0;
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  const idx = t.indexOf(q);
  if (idx >= 0) return 2 + idx * 0.01;
  return Infinity;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: contacts = [] } = useContacts();
  const { data: orgs = [] } = useOrganizations();
  const { data: opps = [] } = useOpportunities();
  const { data: groups = [] } = useGroups();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build results
  const results: SearchResult[] = useMemo(() => {
    if (!query.trim()) {
      // Empty query → show top recent items as hints
      const hints: SearchResult[] = [];
      for (const c of contacts.slice(0, 3)) {
        hints.push({
          kind: 'contact',
          id: c.id,
          title: contactDisplayName(c),
          subtitle: (c.orgs as { org_name: string }[])[0]?.org_name,
          meta: c.tier ? `T${c.tier}` : undefined,
          href: `/contacts/${c.id}`,
          score: 0,
          data: c,
        });
      }
      for (const o of opps.slice(0, 4)) {
        hints.push({
          kind: 'opportunity',
          id: o.id,
          title: o.title,
          subtitle: `${findTrack(o.track).name} · ${o.stage}`,
          meta: o.due_date ? formatDueRelative(o.due_date) : undefined,
          href: `/inbox/${o.id}`,
          score: 0,
          data: o,
        });
      }
      return hints;
    }

    const out: SearchResult[] = [];
    const q = query.trim().toLowerCase();

    // Contacts
    for (const c of contacts) {
      const name = contactDisplayName(c);
      const orgs = (c.orgs as { org_name: string }[]).map((o) => o.org_name).join(' ');
      const emails = (c.emails as { value: string }[]).map((e) => e.value).join(' ');
      const tags = c.tags.join(' ');
      const haystack = `${name} ${orgs} ${emails} ${tags} ${c.bio ?? ''}`;
      const score = matchScore(name, q);
      const fallback = haystack.toLowerCase().includes(q) ? 10 : Infinity;
      const finalScore = Math.min(score, fallback);
      if (finalScore < Infinity) {
        out.push({
          kind: 'contact',
          id: c.id,
          title: name,
          subtitle: (c.orgs as { org_name: string }[])[0]?.org_name,
          meta: c.tier ? `T${c.tier}` : undefined,
          href: `/contacts/${c.id}`,
          score: finalScore,
          data: c,
        });
      }
    }

    // Organizations
    for (const o of orgs) {
      const haystack = `${o.name} ${o.industry ?? ''} ${o.type ?? ''} ${o.tags.join(' ')}`;
      const score = matchScore(o.name, q);
      const fallback = haystack.toLowerCase().includes(q) ? 10 : Infinity;
      const finalScore = Math.min(score, fallback);
      if (finalScore < Infinity) {
        out.push({
          kind: 'organization',
          id: o.id,
          title: o.name,
          subtitle: [o.type, o.industry].filter(Boolean).join(' · '),
          meta: o.our_tier ? `T${o.our_tier}` : undefined,
          href: `/organizations/${o.id}`,
          score: finalScore,
          data: o,
        });
      }
    }

    // Opportunities
    for (const o of opps) {
      const details = o.details as Record<string, unknown> | null;
      const summary = typeof o.ai_summary === 'string' ? o.ai_summary : '';
      const detailsText = details ? JSON.stringify(details) : '';
      const haystack = `${o.title} ${o.track} ${o.stage} ${summary} ${detailsText}`;
      const score = matchScore(o.title, q);
      const fallback = haystack.toLowerCase().includes(q) ? 10 : Infinity;
      const finalScore = Math.min(score, fallback);
      if (finalScore < Infinity) {
        out.push({
          kind: 'opportunity',
          id: o.id,
          title: o.title,
          subtitle: `${findTrack(o.track).name} · ${o.stage}`,
          meta: o.due_date ? formatDueRelative(o.due_date) : undefined,
          href: `/inbox/${o.id}`,
          score: finalScore,
          data: o,
        });
      }
    }

    // Groups
    for (const g of groups) {
      const score = matchScore(g.name, q);
      if (score < Infinity) {
        out.push({
          kind: 'group',
          id: g.id,
          title: g.name,
          subtitle: g.cadence_days ? `Cadence: ${g.cadence_days}d` : undefined,
          href: `/groups/${g.id}`,
          score,
          data: g,
        });
      }
    }

    return out.sort((a, b) => a.score - b.score).slice(0, 30);
  }, [query, contacts, orgs, opps, groups]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIdx(0);
  }, [results.length]);

  const handleSelect = (r: SearchResult) => {
    navigate(r.href);
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[selectedIdx];
      if (r) handleSelect(r);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  // Group results by kind for display
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results) {
    (grouped[r.kind] ??= []).push(r);
  }

  const GROUP_ORDER: { kind: SearchResult['kind']; label: string }[] = [
    { kind: 'opportunity', label: 'OPPORTUNITIES' },
    { kind: 'contact', label: 'CONTACTS' },
    { kind: 'organization', label: 'ORGANIZATIONS' },
    { kind: 'group', label: 'GROUPS' },
  ];

  // Flat index for keyboard nav
  const flatIndex: SearchResult[] = [];
  for (const g of GROUP_ORDER) {
    for (const r of grouped[g.kind] ?? []) flatIndex.push(r);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: z.modalBackdrop,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 20px 20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          background: colors.bgCard,
          border: `1px solid ${colors.lineHi}`,
          borderRadius: '16px 0 16px 0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 100px)',
        }}
      >
        {/* Input bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderBottom: `1px solid ${colors.line}`,
            background: colors.bg,
          }}
        >
          <LIcon kind="search" size={16} color={colors.dimSoft} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ค้นหา contact, opportunity, org, group..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: colors.text,
              fontSize: 15,
              fontFamily: 'inherit',
              padding: 0,
            }}
          />
          <kbd
            style={{
              padding: '2px 8px',
              background: colors.bgSoft,
              border: `1px solid ${colors.lineHi}`,
              borderRadius: '5px 0 5px 0',
              color: colors.dimSoft,
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: 0.5,
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {results.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: colors.dim,
                fontSize: 13,
              }}
            >
              {query ? `ไม่พบผลลัพธ์สำหรับ "${query}"` : 'พิมพ์เพื่อค้นหา...'}
            </div>
          ) : (
            GROUP_ORDER.map((g) => {
              const items = grouped[g.kind] ?? [];
              if (items.length === 0) return null;
              return (
                <div key={g.kind} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      padding: '6px 12px',
                      fontSize: 9.5,
                      letterSpacing: 1.3,
                      textTransform: 'uppercase',
                      color: colors.dim,
                      fontWeight: 700,
                    }}
                  >
                    {g.label} · {items.length}
                  </div>
                  {items.map((r) => {
                    const globalIdx = flatIndex.indexOf(r);
                    const selected = globalIdx === selectedIdx;
                    return (
                      <ResultRow
                        key={`${r.kind}-${r.id}`}
                        result={r}
                        selected={selected}
                        onClick={() => handleSelect(r)}
                        onHover={() => setSelectedIdx(globalIdx)}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div
          style={{
            padding: '8px 14px',
            borderTop: `1px solid ${colors.line}`,
            background: colors.bg,
            display: 'flex',
            gap: 14,
            fontSize: 10.5,
            color: colors.dim,
            letterSpacing: 0.4,
          }}
        >
          <span>
            <kbd style={kbdStyle}>↑</kbd>
            <kbd style={kbdStyle}>↓</kbd> navigate
          </span>
          <span>
            <kbd style={kbdStyle}>↵</kbd> open
          </span>
          <span>
            <kbd style={kbdStyle}>esc</kbd> close
          </span>
          <span style={{ flex: 1 }} />
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0 5px',
  background: colors.bgSoft,
  border: `1px solid ${colors.lineHi}`,
  borderRadius: 3,
  color: colors.dimSoft,
  fontSize: 9.5,
  fontFamily: "'IBM Plex Mono', monospace",
  marginRight: 4,
  marginLeft: 2,
};

function ResultRow({
  result,
  selected,
  onClick,
  onHover,
}: {
  result: SearchResult;
  selected: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  const accent = (() => {
    if (result.kind === 'opportunity') {
      const opp = result.data as OpportunityRow | undefined;
      return opp ? findTrack(opp.track).color.ink : colors.green;
    }
    if (result.kind === 'contact') return colors.green;
    if (result.kind === 'organization') return '#9aa56a';
    return colors.dimSoft;
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        background: selected ? colors.bgSoft : 'transparent',
        border: `1px solid ${selected ? colors.lineHi : 'transparent'}`,
        borderLeft: `2px solid ${selected ? accent : 'transparent'}`,
        borderRadius: '8px 0 8px 0',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: colors.text,
        marginBottom: 1,
      }}
    >
      <ResultIcon result={result} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: colors.text,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {result.title}
        </div>
        {result.subtitle && (
          <div
            style={{
              fontSize: 11,
              color: colors.dimSoft,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {result.subtitle}
          </div>
        )}
      </div>
      {result.meta && (
        <span
          style={{
            fontSize: 10.5,
            color: accent,
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: 0.3,
            padding: '2px 8px',
            border: `1px solid ${accent}`,
            borderRadius: '5px 0 5px 0',
            flexShrink: 0,
          }}
        >
          {result.meta}
        </span>
      )}
      <LIcon kind="arrow-r" size={11} color={selected ? accent : colors.dim} />
    </button>
  );
}

function ResultIcon({ result }: { result: SearchResult }) {
  if (result.kind === 'contact') {
    const c = result.data as ContactRow | undefined;
    if (c?.avatar_url) {
      return (
        <img
          src={c.avatar_url}
          alt=""
          style={{
            width: 28,
            height: 28,
            objectFit: 'cover',
            border: `1px solid ${colors.lineHi}`,
            borderRadius: '7px 0 7px 0',
            flexShrink: 0,
          }}
        />
      );
    }
    return c ? <LAvatar initials={contactInitials(c)} size={26} /> : null;
  }

  if (result.kind === 'organization') {
    const o = result.data as OrgRow | undefined;
    return (
      <span
        style={{
          width: 28,
          height: 28,
          background: '#1d1f12',
          border: `1px solid #3a3f1f`,
          color: '#9aa56a',
          fontSize: 11,
          fontWeight: 700,
          borderRadius: '7px 0 7px 0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {o ? orgInitials(o.name) : '?'}
      </span>
    );
  }

  if (result.kind === 'opportunity') {
    const opp = result.data as OpportunityRow | undefined;
    const meta = opp ? findTrack(opp.track) : null;
    return (
      <span
        style={{
          width: 28,
          height: 28,
          background: meta?.color.soft ?? colors.bgSoft,
          border: `1px solid ${meta?.color.chip ?? colors.line}`,
          color: meta?.color.ink ?? colors.text,
          fontSize: 13,
          borderRadius: '7px 0 7px 0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        🎯
      </span>
    );
  }

  // group
  return (
    <span
      style={{
        width: 28,
        height: 28,
        background: '#19250a',
        border: `1px solid ${colors.greenDk}`,
        color: colors.green,
        fontSize: 13,
        borderRadius: '7px 0 7px 0',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      📁
    </span>
  );
}
