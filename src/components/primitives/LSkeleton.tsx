import type { CSSProperties } from 'react';

/** Shimmer placeholder block (#9). Animation is gated behind
 *  prefers-reduced-motion in global.css (.l-skeleton). */
export function LSkeleton({
  w = '100%',
  h = 14,
  radius = '8px 0 8px 0',
  style = {},
}: {
  w?: string | number;
  h?: string | number;
  radius?: string;
  style?: CSSProperties;
}) {
  return <div className="l-skeleton" style={{ width: w, height: h, borderRadius: radius, ...style }} />;
}

/** A card-shaped skeleton for kanban / list loading states. */
export function LSkeletonCard() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        border: '1px solid #2a2a2a',
        borderRadius: '10px 0 10px 0',
        background: '#1c1c1c',
      }}
    >
      <LSkeleton w="70%" h={12} />
      <LSkeleton w="45%" h={9} />
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <LSkeleton w={40} h={8} />
        <LSkeleton w={28} h={8} />
      </div>
    </div>
  );
}
