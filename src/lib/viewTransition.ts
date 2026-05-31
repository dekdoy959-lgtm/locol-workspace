/**
 * Run a DOM-updating callback inside a View Transition where supported (#2),
 * giving a smooth cross-fade between routes. Falls back to calling it directly
 * when the API is missing or the user prefers reduced motion.
 */
export function withViewTransition(update: () => void): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (typeof doc.startViewTransition === 'function' && !reduce) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}
