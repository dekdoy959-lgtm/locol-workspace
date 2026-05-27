import { colors } from '../../styles/tokens';

export type IconKind =
  | 'arrow-r'
  | 'arrow-down'
  | 'search'
  | 'plus'
  | 'bell'
  | 'clock'
  | 'link'
  | 'comment'
  | 'flag'
  | 'warn'
  | 'filter'
  | 'doc'
  | 'cal'
  | 'money'
  | 'home'
  | 'inbox'
  | 'user'
  | 'users'
  | 'building'
  | 'folder'
  | 'graph'
  | 'target'
  | 'menu'
  | 'settings'
  | 'close'
  | 'check';

interface LIconProps {
  kind: IconKind;
  size?: number;
  color?: string;
}

export function LIcon({ kind, size = 14, color = colors.text }: LIconProps) {
  const s = size;
  const st = {
    stroke: color,
    strokeWidth: 1.5,
    fill: 'none' as const,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
  };

  switch (kind) {
    case 'arrow-r':
      return (
        <svg width={s} height={s} viewBox="0 0 14 14">
          <path d="M5,2 V8 H12" {...st} />
          <path d="M9,5 L12,8 L9,11" {...st} />
        </svg>
      );
    case 'arrow-down':
      return (
        <svg width={s} height={s} viewBox="0 0 14 14">
          <path d="M2,5 H8 V12" {...st} />
          <path d="M5,9 L8,12 L11,9" {...st} />
        </svg>
      );
    case 'search':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="10" cy="10" r="6.5" {...st} />
          <line x1="14.5" y1="14.5" x2="20" y2="20" {...st} />
        </svg>
      );
    case 'plus':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <line x1="4" y1="12" x2="20" y2="12" {...st} />
          <line x1="12" y1="4" x2="12" y2="20" {...st} />
        </svg>
      );
    case 'bell':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M6,17 V10 Q6,7 12,7 Q18,7 18,10 V17 L20,19 H4 Z" {...st} />
          <path d="M10,21 H14" {...st} />
        </svg>
      );
    case 'clock':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" {...st} />
          <path d="M12,7 V12 L15,14" {...st} />
        </svg>
      );
    case 'link':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M9,15 L15,9" {...st} />
          <path d="M14,5 Q19,5 19,10 Q19,12 17,14" {...st} />
          <path d="M10,19 Q5,19 5,14 Q5,12 7,10" {...st} />
        </svg>
      );
    case 'comment':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M4,5 H20 V16 H10 L6,20 V16 H4 Z" {...st} />
        </svg>
      );
    case 'flag':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <line x1="6" y1="4" x2="6" y2="20" {...st} />
          <path d="M6,5 L18,5 L15,9 L18,13 L6,13 Z" {...st} />
        </svg>
      );
    case 'warn':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M12,4 L22,20 H2 Z" {...st} />
          <line x1="12" y1="10" x2="12" y2="15" {...st} />
          <circle cx="12" cy="17.5" r="0.8" fill={color} stroke="none" />
        </svg>
      );
    case 'filter':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M4,5 H20 L14,12 V19 L10,17 V12 Z" {...st} />
        </svg>
      );
    case 'doc':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M6,3 H15 L19,7 V21 H6 Z" {...st} />
          <path d="M15,3 V7 H19" {...st} />
        </svg>
      );
    case 'cal':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <rect x="4" y="5" width="16" height="15" {...st} />
          <line x1="4" y1="10" x2="20" y2="10" {...st} />
          <line x1="9" y1="3" x2="9" y2="7" {...st} />
          <line x1="15" y1="3" x2="15" y2="7" {...st} />
        </svg>
      );
    case 'money':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M15,7 H10 Q7,7 7,10 Q7,12 10,12 H14 Q17,12 17,15 Q17,17 14,17 H8" {...st} />
          <line x1="12" y1="4" x2="12" y2="20" {...st} />
        </svg>
      );
    case 'home':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M4,11 L12,4 L20,11 V20 H4 Z" {...st} />
          <path d="M10,20 V14 H14 V20" {...st} />
        </svg>
      );
    case 'inbox':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M4,4 H20 V20 H4 Z" {...st} />
          <path d="M4,14 H8 L10,16 H14 L16,14 H20" {...st} />
        </svg>
      );
    case 'user':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" {...st} />
          <path d="M4,21 Q4,14 12,14 Q20,14 20,21" {...st} />
        </svg>
      );
    case 'users':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="9" cy="8" r="3.5" {...st} />
          <path d="M2,20 Q2,14 9,14 Q16,14 16,20" {...st} />
          <circle cx="17" cy="6" r="2.5" {...st} />
          <path d="M16,11 Q22,11 22,17" {...st} />
        </svg>
      );
    case 'building':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M4,21 V5 H20 V21 Z" {...st} />
          <line x1="4" y1="21" x2="20" y2="21" {...st} />
          <line x1="8" y1="9" x2="10" y2="9" {...st} />
          <line x1="14" y1="9" x2="16" y2="9" {...st} />
          <line x1="8" y1="13" x2="10" y2="13" {...st} />
          <line x1="14" y1="13" x2="16" y2="13" {...st} />
          <path d="M10,21 V17 H14 V21" {...st} />
        </svg>
      );
    case 'folder':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M3,6 H10 L12,8 H21 V19 H3 Z" {...st} />
        </svg>
      );
    case 'graph':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="6" cy="6" r="2.5" {...st} />
          <circle cx="18" cy="6" r="2.5" {...st} />
          <circle cx="12" cy="18" r="2.5" {...st} />
          <line x1="7.5" y1="7.5" x2="10.5" y2="16.5" {...st} />
          <line x1="16.5" y1="7.5" x2="13.5" y2="16.5" {...st} />
          <line x1="8" y1="6" x2="16" y2="6" {...st} />
        </svg>
      );
    case 'target':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" {...st} />
          <circle cx="12" cy="12" r="5" {...st} />
          <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
        </svg>
      );
    case 'menu':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <line x1="4" y1="7" x2="20" y2="7" {...st} />
          <line x1="4" y1="12" x2="20" y2="12" {...st} />
          <line x1="4" y1="17" x2="20" y2="17" {...st} />
        </svg>
      );
    case 'settings':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" {...st} />
          <path d="M12,2 V5 M12,19 V22 M2,12 H5 M19,12 H22 M5,5 L7,7 M17,17 L19,19 M5,19 L7,17 M17,7 L19,5" {...st} />
        </svg>
      );
    case 'close':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <line x1="6" y1="6" x2="18" y2="18" {...st} />
          <line x1="18" y1="6" x2="6" y2="18" {...st} />
        </svg>
      );
    case 'check':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M5,12 L10,17 L19,7" {...st} />
        </svg>
      );
  }
}
