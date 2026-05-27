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
} as const;

export const trackColors = {
  apply:    { ink: '#E8B923', soft: '#3a2a0a', chip: '#BD8E23' },
  act:      { ink: '#99CE24', soft: '#1f2a08', chip: '#6e9618' },
  watch:    { ink: '#D9D9D9', soft: '#1f1f1f', chip: '#747474' },
  contract: { ink: '#9aa56a', soft: '#1d1f12', chip: '#695935' },
  event:    { ink: '#d96a66', soft: '#2a1212', chip: '#A12F2D' },
} as const;

export const statusColors = {
  'On Track':   { fg: '#99CE24', bg: '#19250a', border: '#6e9618' },
  'Watch':      { fg: '#E8B923', bg: '#241a06', border: '#5a3f10' },
  'Going Cold': { fg: '#d99a66', bg: '#2a1d10', border: '#6a3f1c' },
  'Overdue':    { fg: '#d96a66', bg: '#241010', border: '#5a1a18' },
  'In Window':  { fg: '#99CE24', bg: '#19250a', border: '#6e9618' },
  'Too Soon':   { fg: '#747474', bg: '#181818', border: '#2a2a2a' },
  'Due':        { fg: '#E8B923', bg: '#241a06', border: '#5a3f10' },
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

export type TrackKey = keyof typeof trackColors;
export type StatusKey = keyof typeof statusColors;
