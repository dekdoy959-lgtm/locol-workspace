import { useEffect, useState } from 'react';

/**
 * useMediaQuery — reactive media query matcher
 * Returns true when the document matches the given query string.
 * SSR-safe: returns false on first render, updates after mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mq.matches);
    // Safari < 14 uses addListener; modern uses addEventListener
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } else {
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, [query]);

  return matches;
}

// ─── Convenience hooks for LOCOL breakpoints ───────────────────────────
// Breakpoints aligned with common device sizes:
//   mobile  : < 640px  (phones)
//   tablet  : 640-1023px (large phones, small tablets, narrow desktop)
//   desktop : >= 1024px (full-width app)

export const useIsMobile = () => useMediaQuery('(max-width: 639px)');
export const useIsTablet = () => useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsTouch = () => useMediaQuery('(hover: none) and (pointer: coarse)');
export const usePrefersDark = () => useMediaQuery('(prefers-color-scheme: dark)');
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
