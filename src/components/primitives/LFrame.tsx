import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../../styles/tokens';
import { CowhideGrain, ZigzagStrip } from './Decorations';

interface LFrameProps {
  children: ReactNode;
  showStrip?: boolean;
  stripAccent?: number;
  style?: CSSProperties;
}

export function LFrame({ children, showStrip = true, stripAccent = 6, style = {} }: LFrameProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: colors.bg,
        color: colors.text,
        overflow: 'hidden',
        ...style,
      }}
    >
      <CowhideGrain opacity={0.05} />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
        }}
      >
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>{children}</div>
        {showStrip && (
          <div
            style={{
              width: 44,
              borderLeft: `1px solid ${colors.line}`,
              background: colors.bg,
              position: 'relative',
            }}
          >
            <ZigzagStrip width={44} color="#262626" accentEvery={stripAccent} />
          </div>
        )}
      </div>
    </div>
  );
}
