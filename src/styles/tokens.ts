// LOCOL Design Tokens — single source of truth
// Ported from prototype locol-components.jsx

export const colors = {
  bg: '#101010',
  bgSoft: '#181818',
  bgCard: '#1c1c1c',
  bgRaise: '#222222',
  line: '#2a2a2a',
  lineHi: '#3a3a3a',
  text: '#FFFFFF',
  surface: '#D9D9D9',
  dimSoft: '#9a9a9a',
  dim: '#747474',
  green: '#99CE24',
  greenDk: '#6e9618',
  greenBg: '#19250a',
  // Semantic accents (previously hardcoded across the app)
  danger: '#d96a66',
  dangerDk: '#5a1a18',
  dangerBg: '#241010',
  warn: '#E8B923',
  warnDk: '#5a3f10',
  warnBg: '#241a06',
  olive: '#9aa56a',
  oliveDk: '#3a3f1f',
  oliveBg: '#1d1f12',
  discord: '#5865F2',
} as const;


export const fonts = {
  sans: "'IBM Plex Sans Thai', sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const;

export const fontSize = {
  h1: 64,
  h2: 36,
  h3: 26,
  h4: 20,
  h5: 16,
  body: 13.5,
  small: 12,
  micro: 11,
  microSm: 10,
} as const;

export const radius = {
  card: '24px 0 24px 0',
  cardSm: '14px 0 14px 0',
  cardXs: '12px 0 12px 0',
  chip: '8px 0 8px 0',
  chipSm: '5px 0 5px 0',
  chipXs: '4px 0 4px 0',
  btn: '10px 0 10px 0',
} as const;

export const space = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  '3xl': 18,
  '4xl': 22,
  '5xl': 28,
  '6xl': 36,
  '7xl': 44,
} as const;

// ─── z-index scale ──────────────────────────────────────────────────
// Semantic layers so stacking is predictable instead of scattered raw numbers.
// Ordering: content < sticky header < bottom nav < banner < modal < toast < dropdown.
export const z = {
  raised: 10,
  sticky: 20,
  header: 50,
  bottomNav: 100,
  banner: 150,
  modalBackdrop: 200,
  modal: 201,
  toast: 500,
  dropdown: 1000,
} as const;

// ─── Breakpoints (mobile-first) ─────────────────────────────────────
export const breakpoints = {
  mobile: 0,      // < 640px
  tablet: 640,    // 640-1023px
  desktop: 1024,  // >= 1024px
} as const;

export const mq = {
  mobile: `(max-width: ${breakpoints.tablet - 1}px)`,
  tablet: `(min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.desktop - 1}px)`,
  desktop: `(min-width: ${breakpoints.desktop}px)`,
  // tabletUp = tablet + desktop (i.e., not mobile)
  tabletUp: `(min-width: ${breakpoints.tablet}px)`,
  // Touch device detection
  touch: '(hover: none) and (pointer: coarse)',
} as const;

// ─── Bottom-nav height (used by mobile layout) ──────────────────────
export const layout = {
  bottomNavHeight: 60,
  topChromeHeight: 56,
  mobilePagePadding: '14px 14px 80px',  // bottom padding leaves room for bottom nav
  desktopPagePadding: '28px 36px',
} as const;

