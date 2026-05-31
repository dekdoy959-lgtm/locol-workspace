/**
 * Promise-based confirm dialog — a drop-in async replacement for window.confirm
 * that renders the styled, accessible ConfirmModal instead of the native popup.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'ลบรายการนี้?', danger: true })) { ... }
 *
 * Only one dialog shows at a time; a second call while one is open rejects the
 * earlier promise as `false` (cancelled) before opening the new one.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { ConfirmModal } from './ConfirmModal';

export interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // If a dialog is already open, resolve it as cancelled before reopening.
    resolverRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPending(opts);
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setPending(null);
    resolve?.(result);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <ConfirmModal
          title={pending.title}
          body={pending.body ?? ''}
          confirmLabel={pending.confirmLabel}
          danger={pending.danger}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
