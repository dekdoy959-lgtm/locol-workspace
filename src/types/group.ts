import type { Database } from './database';

export type GroupRow = Database['public']['Tables']['groups']['Row'];
export type GroupInsert = Database['public']['Tables']['groups']['Insert'];
export type GroupUpdate = Database['public']['Tables']['groups']['Update'];

export type GroupMemberRow = Database['public']['Tables']['group_members']['Row'];

export interface GroupTreeNode extends GroupRow {
  children: GroupTreeNode[];
  memberCount: number;
  depth: number;
}

export const CADENCE_PRESETS = [
  { value: '', label: 'ไม่มี cadence' },
  { value: '7', label: 'รายสัปดาห์ (7 วัน)' },
  { value: '14', label: 'ทุก 2 สัปดาห์' },
  { value: '30', label: 'รายเดือน (30 วัน)' },
  { value: '60', label: 'ทุก 2 เดือน' },
  { value: '90', label: 'รายไตรมาส (90 วัน)' },
  { value: '180', label: 'ครึ่งปี (180 วัน)' },
  { value: '365', label: 'รายปี (365 วัน)' },
];

export function formatCadence(days: number | null): string {
  if (!days) return '—';
  if (days === 7) return 'รายสัปดาห์';
  if (days === 14) return 'ทุก 2 สัปดาห์';
  if (days === 30) return 'รายเดือน';
  if (days === 60) return 'ทุก 2 เดือน';
  if (days === 90) return 'รายไตรมาส';
  if (days === 180) return 'ครึ่งปี';
  if (days === 365) return 'รายปี';
  return `ทุก ${days} วัน`;
}

export function buildGroupTree(groups: GroupRow[], memberCounts: Record<string, number>): GroupTreeNode[] {
  const byId: Record<string, GroupTreeNode> = {};
  for (const g of groups) {
    byId[g.id] = { ...g, children: [], memberCount: memberCounts[g.id] ?? 0, depth: 0 };
  }
  const roots: GroupTreeNode[] = [];
  for (const g of groups) {
    const node = byId[g.id];
    if (g.parent_id && byId[g.parent_id]) {
      byId[g.parent_id].children.push(node);
    } else {
      roots.push(node);
    }
  }
  const setDepth = (nodes: GroupTreeNode[], depth: number) => {
    for (const n of nodes) {
      n.depth = depth;
      setDepth(n.children, depth + 1);
    }
  };
  setDepth(roots, 0);
  // Recursively sum descendants
  const aggregate = (n: GroupTreeNode): number => {
    let total = n.memberCount;
    for (const c of n.children) total += aggregate(c);
    return total;
  };
  return roots.map((r) => ({ ...r, memberCount: aggregate(r) }));
}
