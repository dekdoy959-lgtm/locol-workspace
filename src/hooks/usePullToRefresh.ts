import { useEffect, useRef, useState, useCallback } from 'react';
import { useIsTouch } from './useMediaQuery';

interface PullState {
  pulling: boolean;
  distance: number;
  refreshing: boolean;
}

/**
 * usePullToRefresh — document-level pull-to-refresh.
 * Triggers `onRefresh` when user pulls down past `threshold` while at top of page.
 * No-op on non-touch devices.
 *
 * Returns:
 *   state.pulling       — user is currently pulling
 *   state.distance      — pixels pulled (capped at 120)
 *   state.refreshing    — refresh in progress
 *   state.ready         — distance >= threshold (visual cue: "release to refresh")
 */
export function usePullToRefresh(
  onRefresh: () => Promise<unknown> | unknown,
  options: { threshold?: number; resistance?: number; disabled?: boolean } = {},
) {
  const { threshold = 70, resistance = 2, disabled = false } = options;
  const isTouch = useIsTouch();
  const [state, setState] = useState<PullState>({ pulling: false, distance: 0, refreshing: false });
  const startY = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setState({ pulling: false, distance: 40, refreshing: true });
    try {
      await onRefresh();
    } finally {
      refreshingRef.current = false;
      setState({ pulling: false, distance: 0, refreshing: false });
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!isTouch || disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only allow pull when scrolled to top
      if (window.scrollY > 0 || document.documentElement.scrollTop > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      if (refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        if (distanceRef.current !== 0) {
          distanceRef.current = 0;
          setState({ pulling: false, distance: 0, refreshing: false });
        }
        return;
      }
      const distance = Math.min(dy / resistance, 120);
      distanceRef.current = distance;
      setState({ pulling: true, distance, refreshing: false });
    };

    const onTouchEnd = () => {
      const distance = distanceRef.current;
      startY.current = null;
      distanceRef.current = 0;
      if (distance >= threshold) {
        refresh();
      } else if (distance > 0) {
        setState({ pulling: false, distance: 0, refreshing: false });
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isTouch, disabled, threshold, resistance, refresh]);

  return {
    ...state,
    ready: state.distance >= threshold,
  };
}
