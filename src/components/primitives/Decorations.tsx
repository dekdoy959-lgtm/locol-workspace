import type { CSSProperties } from 'react';
import { colors } from '../../styles/tokens';

interface ZigzagStripProps {
  width?: number;
  color?: string;
  accentEvery?: number;
  height?: number | string;
  style?: CSSProperties;
}

export function ZigzagStrip({
  width = 56,
  color = colors.text,
  accentEvery = 0,
  height = '100%',
  style = {},
}: ZigzagStripProps) {
  const unit = 32;
  const cells = 24;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${unit} ${unit * cells}`}
      preserveAspectRatio="xMidYMin slice"
      style={{ display: 'block', ...style }}
    >
      {Array.from({ length: cells }).map((_, i) => {
        const y = i * unit;
        const fill = accentEvery && i % accentEvery === 0 ? colors.green : color;
        return (
          <g key={i} transform={`translate(${(i % 2) * 6}, ${y})`}>
            {/* style (not the fill attr) so CSS var() colors resolve */}
            <rect x="4" y="2" width="6" height="22" style={{ fill }} />
            <rect x="4" y="18" width="22" height="6" style={{ fill }} />
          </g>
        );
      })}
    </svg>
  );
}

interface MiniLProps {
  size?: number;
  color?: string;
}

export function MiniL({ size = 14, color = colors.green }: MiniLProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <rect x="3" y="1" width="3" height="10" style={{ fill: color }} />
      <rect x="3" y="9" width="9" height="3" style={{ fill: color }} />
    </svg>
  );
}

interface CowhideGrainProps {
  opacity?: number;
}

export function CowhideGrain({ opacity = 0.06 }: CowhideGrainProps) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.4 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: url,
        mixBlendMode: 'overlay',
        opacity,
      }}
    />
  );
}
