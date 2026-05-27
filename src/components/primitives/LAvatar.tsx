import { colors } from '../../styles/tokens';

interface LAvatarProps {
  initials?: string;
  size?: number;
  color?: string;
  ring?: boolean;
}

export function LAvatar({ initials = 'JD', size = 26, color = colors.surface, ring = false }: LAvatarProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        background: colors.bgRaise,
        color,
        border: `1px solid ${ring ? colors.green : colors.lineHi}`,
        borderRadius: '8px 0 8px 0',
        fontWeight: 600,
        fontSize: size * 0.4,
        letterSpacing: 0.5,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

interface LAvatarStackProps {
  people?: string[];
}

export function LAvatarStack({ people = [] }: LAvatarStackProps) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {people.map((p, i) => (
        <LAvatar key={i} initials={p} />
      ))}
    </span>
  );
}
