import { useCallback, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { ToastViewport, type ToastKind } from '../components/feedback/ToastViewport';
import { ToastContext, type ToastApi, type ToastInput } from './toast-context';

type ToastItem = ToastInput & {
  id: string;
  kind: ToastKind;
};

function createToastId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((kind: ToastKind, toast: ToastInput) => {
    const nextToast: ToastItem = {
      id: createToastId(),
      kind,
      title: toast.title,
      description: toast.description,
      durationMs: toast.durationMs,
    };

    setToasts((current) => [...current, nextToast]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (toast) => pushToast('success', toast),
      error: (toast) => pushToast('error', toast),
      info: (toast) => pushToast('info', toast),
      warning: (toast) => pushToast('warning', toast),
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}
