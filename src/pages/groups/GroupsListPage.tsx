import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroups, useGroupMemberCounts } from '../../hooks/useGroups';
import { buildGroupTree, formatCadence, type GroupTreeNode } from '../../types/group';
import { LCard, LH, LBtn, LIcon, LNote } from '../../components/primitives';
import { colors } from '../../styles/tokens';

export function GroupsListPage() {
  const navigate = useNavigate();
  const { data: groups = [], isLoading } = useGroups();
  const { data: memberCounts = {} } = useGroupMemberCounts();

  const tree = useMemo(() => buildGroupTree(groups, memberCounts), [groups, memberCounts]);

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <LNote>People Layer · Groups</LNote>
          <div style={{ height: 12 }} />
          <LH level={2} sub="แบ่ง contacts เป็นกลุ่ม · มี sub-group ได้ · ตั้ง cadence (จังหวะติดต่อ) override ราย group">
            GROUPS
          </LH>
        </div>
        <LBtn primary onClick={() => navigate('/groups/new')}>
          <LIcon kind="plus" size={12} color={colors.bg} /> NEW GROUP
        </LBtn>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>
      ) : tree.length === 0 ? (
        <LCard padding={40}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: colors.dimSoft, marginBottom: 12 }}>ยังไม่มี group ในระบบ</div>
            <LBtn primary onClick={() => navigate('/groups/new')}>
              <LIcon kind="plus" size={12} color={colors.bg} /> สร้าง group แรก
            </LBtn>
          </div>
        </LCard>
      ) : (
        <LCard padding={0} bg={colors.bgCard}>
          <div style={{ padding: 8 }}>
            {tree.map((node) => (
              <GroupNode key={node.id} node={node} onClick={(id) => navigate(`/groups/${id}`)} />
            ))}
          </div>
        </LCard>
      )}
    </div>
  );
}

function GroupNode({
  node,
  onClick,
}: {
  node: GroupTreeNode;
  onClick: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          marginLeft: node.depth * 24,
          background: node.depth === 0 ? colors.bgSoft : 'transparent',
          border: node.depth === 0 ? `1px solid ${colors.line}` : 'none',
          borderRadius: '10px 0 10px 0',
          marginBottom: 4,
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 150ms',
        }}
        onClick={() => onClick(node.id)}
        onMouseEnter={(e) => {
          if (node.depth === 0) e.currentTarget.style.background = colors.bgRaise;
          else e.currentTarget.style.background = colors.bgSoft;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = node.depth === 0 ? colors.bgSoft : 'transparent';
        }}
      >
        {node.depth > 0 && (
          <svg
            width={14}
            height={14}
            viewBox="0 0 14 14"
            style={{ flexShrink: 0, position: 'relative', left: -16, opacity: 0.5 }}
          >
            <path d="M3,-4 V8 H12" stroke={colors.dim} strokeWidth="1" fill="none" />
          </svg>
        )}

        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: colors.dim,
              transition: 'transform 150ms',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            <LIcon kind="arrow-r" size={10} color={colors.dim} />
          </button>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}

        <span
          style={{
            width: 8,
            height: 8,
            background: node.rule ? colors.warn : colors.green,
            borderRadius: 99,
            flexShrink: 0,
            opacity: node.depth === 0 ? 1 : 0.4,
          }}
        />

        <span
          style={{
            fontWeight: node.depth === 0 ? 700 : 500,
            fontSize: node.depth === 0 ? 14 : 13,
            color: colors.text,
            letterSpacing: node.depth === 0 ? 0.5 : 0,
            textTransform: node.depth === 0 ? 'uppercase' : 'none',
            flex: 1,
          }}
        >
          {node.name}
          {node.rule && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 9,
                color: colors.warn,
                background: colors.warnBg,
                border: `1px solid ${colors.warnDk}`,
                padding: '1px 5px',
                borderRadius: '4px 0 4px 0',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              ⚡ SMART
            </span>
          )}
        </span>

        {node.cadence_days && (
          <span
            style={{
              fontSize: 10.5,
              color: colors.green,
              fontFamily: "'IBM Plex Mono', monospace",
              background: colors.greenBg,
              border: `1px solid ${colors.greenDk}`,
              padding: '2px 8px',
              borderRadius: '5px 0 5px 0',
              letterSpacing: 0.3,
            }}
          >
            {formatCadence(node.cadence_days)}
          </span>
        )}

        <span
          style={{
            fontSize: 11,
            color: colors.dim,
            minWidth: 24,
            textAlign: 'right',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {node.memberCount}
        </span>
      </div>

      {expanded &&
        hasChildren &&
        node.children.map((child) => <GroupNode key={child.id} node={child} onClick={onClick} />)}
    </div>
  );
}
