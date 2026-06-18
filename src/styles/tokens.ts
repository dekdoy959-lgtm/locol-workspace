// LOCOL Design Tokens — single source of truth
// Ported from prototype locol-components.jsx

// Aligned to the official LOCOL Design System (June 2026).
// THEME MODEL: surfaces / text / borders are CSS vars that flip per theme
// (light = :root, dark = [data-theme="dark"] — both defined in global.css).
// ACCENTS (lime, status, cacao, teal…) stay constant across themes per the DS
// ("Lime stays constant"), so they're literal hex — safe in SVG attributes too.
export const colors = {
  // ── Surface elevation ladder (theme-reactive) ─────────────────────
  bg: 'var(--bg)',           // L0 · canvas
  bgSoft: 'var(--bg-soft)',  // L1 · sunken / inset bands
  bgCard: 'var(--bg-card)',  // L2 · cards
  bgRaise: 'var(--bg-raise)',// L3 · raised / hover / active
  bgOverlay: 'var(--bg-overlay)', // L4 · dropdowns · modals
  bgInput: 'var(--bg-input)',// input inset
  // ── Border progression (theme-reactive) ───────────────────────────
  lineSubtle: 'var(--line-subtle)',
  line: 'var(--line)',
  lineHi: 'var(--line-hi)',
  lineStrong: 'var(--line-strong)',
  // ── Text hierarchy (theme-reactive) ───────────────────────────────
  text: 'var(--text)',
  surface: 'var(--surface)',
  dimSoft: 'var(--dim-soft)',
  dim: 'var(--dim)',
  // ── Brand — Logo Lime #9BCF25 (constant both themes) ──────────────
  green: '#9BCF25',     // PRIMARY (lime-500)
  greenDk: '#7FAF1C',   // lime-600
  greenBg: 'rgba(155,207,37,0.14)', // surface-brand-soft
  // ── Status / semantic (constant) ──────────────────────────────────
  danger: '#E5484D',
  dangerDk: '#7a2327',
  dangerBg: 'rgba(229,72,77,0.13)',
  warn: '#F2A541',
  warnDk: '#6a4a16',
  warnBg: 'rgba(242,165,65,0.13)',
  // ── Supporting accents (constant) ─────────────────────────────────
  cacao: '#6B4226',
  cacaoSoft: '#B08A6E',
  climate: '#45BBAB',
  emerald: '#2E9E5B',
  olive: '#9aa56a',
  oliveDk: '#3a3f1f',
  oliveBg: 'rgba(154,165,106,0.14)',
  discord: '#5865F2',
} as const;


export const fonts = {
  // DS: headings = IBM Plex Sans (Thai); body = Noto Sans (Thai); data = IBM Plex Mono.
  heading: "'IBM Plex Sans Thai', 'IBM Plex Sans', system-ui, sans-serif",
  body: "'Noto Sans Thai', 'Noto Sans', system-ui, sans-serif",
  sans: "'Noto Sans Thai', 'Noto Sans', system-ui, sans-serif", // back-compat alias = body
  mono: "'IBM Plex Mono', ui-monospace, monospace",
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

// DS signature corners: round TOP-LEFT + BOTTOM-RIGHT, small off-corner
// (echoes the interlocking logo mark). Format: TL TR BR BL.
export const radius = {
  card: '22px 5px 22px 5px',   // brand-lg
  cardSm: '16px 4px 16px 4px', // brand-md
  cardXs: '12px 3px 12px 3px',
  chip: '10px 3px 10px 3px',   // brand-sm
  chipSm: '8px 2px 8px 2px',
  chipXs: '6px 2px 6px 2px',
  btn: '12px 3px 12px 3px',
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

