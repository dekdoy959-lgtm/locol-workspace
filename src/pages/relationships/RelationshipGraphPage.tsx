import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContacts } from '../../hooks/useContacts';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useOpportunities } from '../../hooks/useOpportunities';
import { useAllRelations } from '../../hooks/useRelations';
import { contactDisplayName, contactInitials, type ContactRow } from '../../types/contact';
import { orgInitials, type OrgRow } from '../../types/organization';
import { findTrack, type OpportunityRow } from '../../types/opportunity';
import { findRelationType, RELATION_TYPES, type RelationType } from '../../types/relation';
import { LCard, LH, LBtn, LIcon, LInput, LNote, LAvatar } from '../../components/primitives';
import { colors } from '../../styles/tokens';

type EntityKind = 'contact' | 'org' | 'opportunity';

interface Node {
  id: string;
  entityKind: EntityKind;
  contact?: ContactRow;
  org?: OrgRow;
  opportunity?: OpportunityRow;
  x: number;
  y: number;
  ring: 'focus' | 'direct' | 'two-hop';
  /** For 2-hop nodes: which direct neighbor they're connected through */
  bridgeId?: string;
}

interface Edge {
  from: string;
  to: string;
  type: RelationType;
  note: string | null;
  isTwoHop: boolean;
}

const CANVAS_W = 820;
const CANVAS_H = 640;
const FOCUS_RADIUS = 36;
const DIRECT_RADIUS = 24;
const TWO_HOP_RADIUS = 18;
const R1 = 180; // direct ring
const R2 = 295; // 2-hop ring

export function RelationshipGraphPage() {
  const navigate = useNavigate();
  const { data: contacts = [] } = useContacts();
  const { data: orgs = [] } = useOrganizations();
  const { data: opps = [] } = useOpportunities();
  const { data: relations = [] } = useAllRelations();
  const [focusId, setFocusId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showTwoHop, setShowTwoHop] = useState(true);

  // Drag state
  const svgRef = useRef<SVGSVGElement | null>(null);
  const justDraggedRef = useRef(false);
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number; startX: number; startY: number } | null>(
    null,
  );

  // Reset custom positions when focus changes
  useEffect(() => {
    setCustomPositions({});
  }, [focusId]);

  // Helper: convert client coords → SVG viewBox coords
  const getSvgPoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  // Global mouse handlers while dragging
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const p = getSvgPoint(e.clientX, e.clientY);
      if (!p) return;
      // Threshold: consider it a "real" drag only after moving > 4px
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      if (Math.hypot(dx, dy) > 4) {
        justDraggedRef.current = true;
      }
      setCustomPositions((prev) => ({
        ...prev,
        [dragging.id]: { x: p.x - dragging.offsetX, y: p.y - dragging.offsetY },
      }));
    };

    const onUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const contactById = useMemo(() => {
    const m: Record<string, ContactRow> = {};
    for (const c of contacts) m[c.id] = c;
    return m;
  }, [contacts]);

  const orgById = useMemo(() => {
    const m: Record<string, OrgRow> = {};
    for (const o of orgs) m[o.id] = o;
    return m;
  }, [orgs]);

  const oppById = useMemo(() => {
    const m: Record<string, OpportunityRow> = {};
    for (const o of opps) m[o.id] = o;
    return m;
  }, [opps]);

  // Index: contact id → list of relations touching it
  const relationsByContact = useMemo(() => {
    const m: Record<string, typeof relations> = {};
    for (const r of relations) {
      if (r.from_contact_id) (m[r.from_contact_id] ??= []).push(r);
      if (r.to_contact_id) (m[r.to_contact_id] ??= []).push(r);
    }
    return m;
  }, [relations]);

  const { nodes, edges, focusContact, directNeighbors, twoHopCount } = useMemo(() => {
    if (!focusId || !contactById[focusId]) {
      return {
        nodes: [] as Node[],
        edges: [] as Edge[],
        focusContact: null,
        directNeighbors: [] as ContactRow[],
        twoHopCount: 0,
      };
    }

    const focus = contactById[focusId];
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;

    const directRels = relationsByContact[focusId] ?? [];

    // ─── Collect direct neighbors of all 3 kinds ────────────────────────────
    interface DirectItem {
      id: string;
      kind: EntityKind;
      relType: RelationType;
      note: string | null;
    }

    const directItems: DirectItem[] = [];
    const seenDirect = new Set<string>([focusId]);

    for (const r of directRels) {
      // Contact-to-contact
      if (r.to_contact_id || (!r.to_org_id && !r.to_opportunity_id)) {
        const otherId = r.from_contact_id === focusId ? r.to_contact_id : r.from_contact_id;
        if (otherId && contactById[otherId] && !seenDirect.has(otherId)) {
          seenDirect.add(otherId);
          directItems.push({ id: otherId, kind: 'contact', relType: findRelationType(r.type), note: r.note });
        }
      }
      // Cross-layer to org
      if (r.to_org_id && r.from_contact_id === focusId && !seenDirect.has(r.to_org_id) && orgById[r.to_org_id]) {
        seenDirect.add(r.to_org_id);
        directItems.push({ id: r.to_org_id, kind: 'org', relType: findRelationType(r.type), note: r.note });
      }
      // Cross-layer to opportunity
      if (
        r.to_opportunity_id &&
        r.from_contact_id === focusId &&
        !seenDirect.has(r.to_opportunity_id) &&
        oppById[r.to_opportunity_id]
      ) {
        seenDirect.add(r.to_opportunity_id);
        directItems.push({ id: r.to_opportunity_id, kind: 'opportunity', relType: findRelationType(r.type), note: r.note });
      }
    }

    const directIds = directItems.filter((d) => d.kind === 'contact').map((d) => d.id);

    const nodesArr: Node[] = [
      { id: focus.id, entityKind: 'contact', contact: focus, x: cx, y: cy, ring: 'focus' },
    ];

    const edgesArr: Edge[] = [];

    // ─── Place direct neighbors evenly around the focus ─────────────────────
    const directAngles: Record<string, number> = {};
    directItems.forEach((item, i) => {
      const angle = (i / directItems.length) * 2 * Math.PI - Math.PI / 2;
      directAngles[item.id] = angle;
      const x = cx + R1 * Math.cos(angle);
      const y = cy + R1 * Math.sin(angle);
      const baseNode = { id: item.id, x, y, ring: 'direct' as const };
      if (item.kind === 'contact') {
        nodesArr.push({ ...baseNode, entityKind: 'contact', contact: contactById[item.id] });
      } else if (item.kind === 'org') {
        nodesArr.push({ ...baseNode, entityKind: 'org', org: orgById[item.id] });
      } else {
        nodesArr.push({ ...baseNode, entityKind: 'opportunity', opportunity: oppById[item.id] });
      }
      edgesArr.push({ from: focusId, to: item.id, type: item.relType, note: item.note, isTwoHop: false });
    });

    // Place 2-hop neighbors
    const seenAll = new Set<string>(seenDirect);
    let twoHopTotal = 0;

    if (showTwoHop) {
      // Pass 1: Discover all unique 2-hop neighbors + place them near the FIRST direct neighbor that bridges
      for (const directId of directIds) {
        const dnAngle = directAngles[directId];
        const dnRels = relationsByContact[directId] ?? [];
        const newTwoHopIds: string[] = [];

        for (const r of dnRels) {
          const otherId = r.from_contact_id === directId ? r.to_contact_id : r.from_contact_id;
          if (otherId && contactById[otherId] && !seenAll.has(otherId)) {
            seenAll.add(otherId);
            newTwoHopIds.push(otherId);
          }
        }

        if (newTwoHopIds.length > 0) {
          twoHopTotal += newTwoHopIds.length;

          // Spread 2-hops around the direct neighbor's angle
          const spread = Math.min(1.1, 0.18 + 0.18 * newTwoHopIds.length);
          newTwoHopIds.forEach((thId, k) => {
            const offset =
              newTwoHopIds.length === 1
                ? 0
                : (k - (newTwoHopIds.length - 1) / 2) * (spread / (newTwoHopIds.length - 1)) * 2;
            const angle = dnAngle + offset;
            nodesArr.push({
              id: thId,
              entityKind: 'contact',
              contact: contactById[thId],
              x: cx + R2 * Math.cos(angle),
              y: cy + R2 * Math.sin(angle),
              ring: 'two-hop',
              bridgeId: directId,
            });
          });
        }
      }

      // Pass 2: Build ALL bridge edges — every direct neighbor → every 2-hop it knows.
      //  This shows multiple bridges to the same 2-hop person (the user's concern).
      const twoHopNodeIds = new Set(
        nodesArr.filter((n) => n.ring === 'two-hop').map((n) => n.id),
      );
      const seenEdge = new Set<string>(); // dedupe within this pass

      for (const directId of directIds) {
        const dnRels = relationsByContact[directId] ?? [];
        for (const r of dnRels) {
          const otherId = r.from_contact_id === directId ? r.to_contact_id : r.from_contact_id;
          if (!otherId || !contactById[otherId]) continue;
          if (!twoHopNodeIds.has(otherId)) continue; // only edges to 2-hop nodes
          const key = `${directId}|${otherId}`;
          if (seenEdge.has(key)) continue;
          seenEdge.add(key);
          edgesArr.push({
            from: directId,
            to: otherId,
            type: findRelationType(r.type),
            note: r.note,
            isTwoHop: true,
          });
        }
      }
    }

    const directContacts = directIds.map((id) => contactById[id]);

    return {
      nodes: nodesArr,
      edges: edgesArr,
      focusContact: focus,
      directNeighbors: directContacts,
      twoHopCount: twoHopTotal,
    };
  }, [focusId, contactById, orgById, oppById, relationsByContact, showTwoHop]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [] as ContactRow[];
    return contacts.filter((c) => contactDisplayName(c).toLowerCase().includes(q)).slice(0, 8);
  }, [contacts, search]);

  // Apply custom positions (from drag) overriding computed positions
  const positionedNodes = useMemo(
    () =>
      nodes.map((n) => {
        const custom = customPositions[n.id];
        return custom ? { ...n, x: custom.x, y: custom.y } : n;
      }),
    [nodes, customPositions],
  );

  const nodeById: Record<string, Node> = {};
  for (const n of positionedNodes) nodeById[n.id] = n;

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1500, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <LNote>People Layer · Network</LNote>
        <div style={{ height: 12 }} />
        <LH
          level={2}
          sub="Relate-with map · เห็นคนรู้จัก + คนรู้จักของคนรู้จัก (2-hop) · คลิก node ใดก็ได้เพื่อ refocus"
        >
          RELATIONSHIP MAP
        </LH>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        {/* Graph canvas */}
        <LCard padding={0} bg={colors.bgCard} style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${colors.line}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 10, letterSpacing: 1.2, color: colors.dim, textTransform: 'uppercase' }}>
              GRAPH
            </span>
            <span style={{ flex: 1 }} />
            {focusContact && (
              <>
                <span style={{ fontSize: 10.5, color: colors.dim }}>
                  Direct: <b style={{ color: colors.text }}>{directNeighbors.length}</b>
                </span>
                {showTwoHop && (
                  <span style={{ fontSize: 10.5, color: colors.dim }}>
                    · 2-hop: <b style={{ color: colors.warn }}>{twoHopCount}</b>
                  </span>
                )}
                {Object.keys(customPositions).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCustomPositions({})}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${colors.lineHi}`,
                      color: colors.dim,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 10,
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: '5px 2px 5px 2px',
                    }}
                  >
                    ↻ Reset layout
                  </button>
                )}
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 10.5,
                    color: colors.dimSoft,
                    cursor: 'pointer',
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    marginLeft: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showTwoHop}
                    onChange={(e) => setShowTwoHop(e.target.checked)}
                    style={{ accentColor: colors.green }}
                  />
                  Show 2-hop
                </label>
              </>
            )}
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            width="100%"
            style={{ display: 'block', background: colors.bg, cursor: dragging ? 'grabbing' : 'default' }}
          >
            {/* Concentric rings */}
            {focusContact && (
              <g opacity={0.12}>
                <circle cx={CANVAS_W / 2} cy={CANVAS_H / 2} r={R1} fill="none" stroke={colors.lineHi} strokeWidth={1} />
                {showTwoHop && (
                  <circle cx={CANVAS_W / 2} cy={CANVAS_H / 2} r={R2} fill="none" stroke={colors.lineHi} strokeWidth={1} strokeDasharray="3 6" />
                )}
              </g>
            )}

            {/* Ring labels */}
            {focusContact && (
              <g>
                <text
                  x={CANVAS_W / 2}
                  y={CANVAS_H / 2 - R1 - 10}
                  textAnchor="middle"
                  fill={colors.dim}
                  fontSize="9"
                  letterSpacing="1"
                  style={{ textTransform: 'uppercase' }}
                >
                  DIRECT
                </text>
                {showTwoHop && (
                  <text
                    x={CANVAS_W / 2}
                    y={CANVAS_H / 2 - R2 - 10}
                    textAnchor="middle"
                    fill={colors.warnDk}
                    fontSize="9"
                    letterSpacing="1"
                    style={{ textTransform: 'uppercase' }}
                  >
                    2-HOP
                  </text>
                )}
              </g>
            )}

            {/* Edges — render 2-hop first (so they're behind) */}
            {edges
              .slice()
              .sort((a, b) => Number(b.isTwoHop) - Number(a.isTwoHop))
              .map((e) => {
                const from = nodeById[e.from];
                const to = nodeById[e.to];
                if (!from || !to) return null;

                const dashArray =
                  e.type.style === 'dashed' ? '5 4' : e.type.style === 'dotted' ? '2 4' : undefined;

                const opacity = e.isTwoHop ? 0.4 : 0.75;
                const strokeWidth = e.isTwoHop ? 1 : 1.5;

                // Midpoint for label
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2;

                // Stable key — survives focus changes if same pair still connected
                const key = `edge-${e.from}-${e.to}-${e.type.value}`;

                // Disable transition if either endpoint is being actively dragged
                const isDragging = dragging?.id === e.from || dragging?.id === e.to;
                const transitionStyle = isDragging
                  ? 'none'
                  : 'x1 500ms cubic-bezier(.4,0,.2,1), y1 500ms cubic-bezier(.4,0,.2,1), x2 500ms cubic-bezier(.4,0,.2,1), y2 500ms cubic-bezier(.4,0,.2,1), opacity 300ms';

                return (
                  <g key={key}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={e.type.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={dashArray}
                      opacity={opacity}
                      style={{ transition: transitionStyle }}
                    />
                    {!e.isTwoHop && (
                      <g
                        transform={`translate(${mx}, ${my})`}
                        style={{ transition: isDragging ? 'none' : 'transform 500ms cubic-bezier(.4,0,.2,1)' }}
                      >
                        <rect
                          x={-36}
                          y={-8}
                          width={72}
                          height={16}
                          fill={colors.bg}
                          stroke={e.type.color}
                          strokeWidth={0.5}
                          rx={2}
                          opacity={0.85}
                        />
                        <text
                          x={0}
                          y={3}
                          textAnchor="middle"
                          fill={e.type.color}
                          fontSize="9"
                          fontWeight="600"
                          fontFamily="IBM Plex Sans Thai, sans-serif"
                          style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          {e.type.value.toUpperCase().slice(0, 12)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

            {/* Nodes — render 2-hop first */}
            {positionedNodes
              .slice()
              .sort((a, b) => {
                const order = { 'two-hop': 0, direct: 1, focus: 2 };
                return order[a.ring] - order[b.ring];
              })
              .map((n) => {
                const r = n.ring === 'focus' ? FOCUS_RADIUS : n.ring === 'direct' ? DIRECT_RADIUS : TWO_HOP_RADIUS;
                const isDraggingThis = dragging?.id === n.id;

                // Compute label + initials + colors based on entity kind
                let label = '';
                let initials = '';
                let fillColor: string = colors.bgRaise;
                let strokeColor: string = colors.lineHi;
                let labelColor: string = colors.surface;
                let avatarUrl: string | null = null;
                let typeBadge: string | null = null;

                if (n.entityKind === 'contact' && n.contact) {
                  label = contactDisplayName(n.contact);
                  initials = contactInitials(n.contact);
                  avatarUrl = n.contact.avatar_url;
                  fillColor = n.ring === 'focus' ? colors.green : colors.bgRaise;
                  strokeColor = n.ring === 'focus' ? colors.green : n.ring === 'two-hop' ? colors.line : colors.lineHi;
                  labelColor = n.ring === 'focus' ? colors.green : n.ring === 'two-hop' ? colors.dimSoft : colors.surface;
                } else if (n.entityKind === 'org' && n.org) {
                  label = n.org.name;
                  initials = orgInitials(n.org.name);
                  fillColor = colors.oliveBg;
                  strokeColor = '#695935';
                  labelColor = colors.olive;
                  typeBadge = 'ORG';
                } else if (n.entityKind === 'opportunity' && n.opportunity) {
                  label = n.opportunity.title;
                  initials = '🎯';
                  const meta = findTrack(n.opportunity.track);
                  fillColor = meta.color.soft;
                  strokeColor = meta.color.chip;
                  labelColor = meta.color.ink;
                  typeBadge = meta.name.toUpperCase();
                }

                const strokeWidth = n.ring === 'focus' ? 2 : 1;
                const opacity = n.ring === 'two-hop' ? 0.78 : 1;

                const groupStyle: React.CSSProperties = {
                  cursor: isDraggingThis ? 'grabbing' : 'grab',
                  opacity,
                  transition: isDraggingThis
                    ? 'none'
                    : 'transform 500ms cubic-bezier(.4, 0, .2, 1), opacity 300ms',
                };

                const handleClick = (e: React.MouseEvent) => {
                  if (justDraggedRef.current) {
                    e.preventDefault();
                    justDraggedRef.current = false;
                    return;
                  }
                  // Cross-layer: navigate instead of refocus
                  if (n.entityKind === 'org') {
                    navigate(`/organizations/${n.id}`);
                  } else if (n.entityKind === 'opportunity') {
                    navigate(`/inbox/${n.id}`);
                  } else {
                    setFocusId(n.id);
                  }
                };

                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    style={groupStyle}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const p = getSvgPoint(e.clientX, e.clientY);
                      if (!p) return;
                      justDraggedRef.current = false;
                      setDragging({
                        id: n.id,
                        offsetX: p.x - n.x,
                        offsetY: p.y - n.y,
                        startX: e.clientX,
                        startY: e.clientY,
                      });
                    }}
                    onClick={handleClick}
                  >
                    <circle
                      cx={0}
                      cy={0}
                      r={r}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      style={{ transition: isDraggingThis ? 'none' : 'r 400ms, fill 400ms, stroke 400ms' }}
                    />
                    {avatarUrl ? (
                      <>
                        <defs>
                          <clipPath id={`clip-${n.id}`}>
                            <circle cx={0} cy={0} r={r - 2} />
                          </clipPath>
                        </defs>
                        <image
                          href={avatarUrl}
                          x={-r + 2}
                          y={-r + 2}
                          width={(r - 2) * 2}
                          height={(r - 2) * 2}
                          clipPath={`url(#clip-${n.id})`}
                          preserveAspectRatio="xMidYMid slice"
                          style={{ transition: isDraggingThis ? 'none' : 'x 400ms, y 400ms, width 400ms, height 400ms' }}
                        />
                      </>
                    ) : (
                      <text
                        x={0}
                        y={n.ring === 'focus' ? 5 : n.ring === 'direct' ? 4 : 3}
                        textAnchor="middle"
                        fill={n.ring === 'focus' ? colors.bg : labelColor}
                        fontSize={n.ring === 'focus' ? 14 : n.ring === 'direct' ? 11 : 9}
                        fontWeight="700"
                        fontFamily="IBM Plex Sans Thai, sans-serif"
                        style={{ transition: isDraggingThis ? 'none' : 'font-size 400ms, fill 400ms, y 400ms' }}
                      >
                        {initials}
                      </text>
                    )}
                    {typeBadge && (
                      <text
                        x={0}
                        y={-r - 6}
                        textAnchor="middle"
                        fill={labelColor}
                        fontSize="8"
                        fontWeight="700"
                        fontFamily="IBM Plex Sans Thai, sans-serif"
                        style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}
                      >
                        {typeBadge}
                      </text>
                    )}
                    <text
                      x={0}
                      y={r + (n.ring === 'two-hop' ? 11 : 14)}
                      textAnchor="middle"
                      fill={labelColor}
                      fontSize={n.ring === 'focus' ? 12 : n.ring === 'direct' ? 11 : 9.5}
                      fontWeight={n.ring === 'focus' ? 700 : 500}
                      fontFamily="IBM Plex Sans Thai, sans-serif"
                      style={{ transition: isDraggingThis ? 'none' : 'y 400ms, font-size 400ms, fill 400ms' }}
                    >
                      {label.slice(0, n.ring === 'two-hop' ? 14 : 22)}
                    </text>
                  </g>
                );
              })}

            {/* Empty state */}
            {!focusContact && (
              <g>
                <text
                  x={CANVAS_W / 2}
                  y={CANVAS_H / 2 - 12}
                  textAnchor="middle"
                  fill={colors.dim}
                  fontSize="14"
                  fontWeight="500"
                  fontFamily="IBM Plex Sans Thai, sans-serif"
                >
                  เลือก contact ทางขวาเพื่อดู relationship map
                </text>
                <text
                  x={CANVAS_W / 2}
                  y={CANVAS_H / 2 + 14}
                  textAnchor="middle"
                  fill={colors.dim}
                  fontSize="11"
                  fontFamily="IBM Plex Sans Thai, sans-serif"
                >
                  ระบบจะแสดงคนรู้จัก + คนรู้จักของคนรู้จัก (2-hop)
                </text>
              </g>
            )}
          </svg>
        </LCard>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Search */}
          <LCard padding={20}>
            <LH level={5} accent={false} color={colors.green}>
              FOCUS ON
            </LH>
            <LInput value={search} onChange={setSearch} placeholder="พิมพ์ชื่อ contact เพื่อ focus..." />
            {search && searchResults.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  maxHeight: 200,
                  overflowY: 'auto',
                  background: colors.bgSoft,
                  border: `1px solid ${colors.line}`,
                  borderRadius: '8px 2px 8px 2px',
                }}
              >
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setFocusId(c.id);
                      setSearch('');
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      color: colors.text,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgCard)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LAvatar initials={contactInitials(c)} size={22} />
                    <span>{contactDisplayName(c)}</span>
                  </button>
                ))}
              </div>
            )}

            {!focusId && contacts.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 11, color: colors.dim }}>
                หรือลอง:{' '}
                {contacts.slice(0, 3).map((c, i) => (
                  <span key={c.id}>
                    <button
                      type="button"
                      onClick={() => setFocusId(c.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: colors.green,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 11,
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      {contactDisplayName(c)}
                    </button>
                    {i < Math.min(2, contacts.length - 1) && ', '}
                  </span>
                ))}
              </div>
            )}
          </LCard>

          {/* Warm Intro Suggestions (2-hop) */}
          {focusContact && twoHopCount > 0 && showTwoHop && (
            <LCard padding={20}>
              <LH
                level={5}
                accent={false}
                color={colors.warn}
                sub="คนที่ยังไม่รู้จัก แต่ติดต่อผ่านคนรู้จักได้ — โอกาส warm intro"
              >
                WARM INTRO OPPORTUNITIES · {twoHopCount}
              </LH>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {nodes
                  .filter((n) => n.ring === 'two-hop' && n.contact)
                  .map((n) => {
                    const contact = n.contact!;
                    const bridge = n.bridgeId ? contactById[n.bridgeId] : undefined;
                    return (
                      <div
                        key={n.id}
                        style={{
                          padding: '8px 10px',
                          background: colors.warnBg,
                          border: `1px solid ${colors.warnDk}`,
                          borderRadius: '8px 2px 8px 2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <LAvatar initials={contactInitials(contact)} size={22} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{ fontSize: 12.5, fontWeight: 500, color: colors.text, cursor: 'pointer' }}
                            onClick={() => setFocusId(n.id)}
                          >
                            {contactDisplayName(contact)}
                          </div>
                          {bridge && (
                            <div style={{ fontSize: 10, color: colors.warn, marginTop: 2, letterSpacing: 0.3 }}>
                              ผ่าน <b style={{ color: colors.text }}>{contactDisplayName(bridge)}</b>
                            </div>
                          )}
                        </div>
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
                          <LIcon kind="arrow-r" size={11} color="currentColor" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </LCard>
          )}

          {/* Direct relations list */}
          {focusContact && (
            <LCard padding={20}>
              <LH level={5} accent={false} color={colors.green}>
                DIRECT · {directNeighbors.length}
              </LH>
              {directNeighbors.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    background: colors.bgSoft,
                    border: `1px dashed ${colors.line}`,
                    borderRadius: '10px 3px 10px 3px',
                    color: colors.dim,
                    fontSize: 12,
                    textAlign: 'center',
                  }}
                >
                  {contactDisplayName(focusContact)} ยังไม่มี relations กับใคร —{' '}
                  <button
                    type="button"
                    onClick={() => navigate(`/contacts/${focusContact.id}`)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: colors.green,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 12,
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    ไปเพิ่ม
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {edges
                    .filter((e) => !e.isTwoHop)
                    .map((e, i) => {
                      const other = contactById[e.to];
                      if (!other) return null;
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            background: colors.bgSoft,
                            border: `1px solid ${colors.line}`,
                            borderRadius: '8px 2px 8px 2px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 9,
                              color: e.type.color,
                              border: `1px ${e.type.style === 'dashed' ? 'dashed' : 'solid'} ${e.type.color}`,
                              padding: '1px 5px',
                              borderRadius: '4px 1px 4px 1px',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {e.type.value}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFocusId(other.id)}
                            style={{
                              flex: 1,
                              background: 'transparent',
                              border: 'none',
                              color: colors.text,
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontFamily: 'inherit',
                              fontSize: 12.5,
                              padding: 0,
                            }}
                          >
                            {contactDisplayName(other)}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/contacts/${other.id}`)}
                            title="เปิด contact"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: colors.dim,
                              cursor: 'pointer',
                              padding: 4,
                            }}
                            onMouseEnter={(e2) => (e2.currentTarget.style.color = colors.green)}
                            onMouseLeave={(e2) => (e2.currentTarget.style.color = colors.dim)}
                          >
                            <LIcon kind="arrow-r" size={11} color="currentColor" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <LBtn ghost small onClick={() => navigate(`/contacts/${focusContact.id}`)}>
                  เปิด {contactDisplayName(focusContact)}
                </LBtn>
              </div>
            </LCard>
          )}

          {/* Legend */}
          <LCard padding={16}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: colors.dim,
                marginBottom: 10,
              }}
            >
              LEGEND
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {RELATION_TYPES.slice(0, 8).map((rt) => (
                <div key={rt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <svg width={28} height={6}>
                    <line
                      x1={0}
                      y1={3}
                      x2={28}
                      y2={3}
                      stroke={rt.color}
                      strokeWidth={1.5}
                      strokeDasharray={rt.style === 'dashed' ? '4 3' : rt.style === 'dotted' ? '1.5 3' : undefined}
                    />
                  </svg>
                  <span style={{ color: colors.dimSoft }}>{rt.label}</span>
                </div>
              ))}
            </div>
          </LCard>
        </div>
      </div>
    </div>
  );
}
