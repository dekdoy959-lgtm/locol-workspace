import type { Database } from './database';

export type MilestoneRow = Database['public']['Tables']['milestones']['Row'];
export type MilestoneInsert = Database['public']['Tables']['milestones']['Insert'];
export type MilestoneUpdate = Database['public']['Tables']['milestones']['Update'];

export type MilestoneSide = 'them' | 'us' | 'shared';

export const SIDE_LABEL: Record<MilestoneSide, string> = {
  them: 'ฝั่งเขา · THEIR GOALS',
  us: 'ฝั่งเรา · OUR GOALS',
  shared: 'ร่วมกัน · SHARED',
};

export const SIDE_DESCRIPTION: Record<MilestoneSide, string> = {
  them: 'สิ่งที่เขาอยากทำ · อยากได้',
  us: 'สิ่งที่เราอยากทำร่วม · อยากได้จากเขา',
  shared: 'เป้าหมายที่ทั้งสองฝั่งทำด้วยกัน',
};
