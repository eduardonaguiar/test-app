import { useEffect } from 'react';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  durationMs?: number;
};

type ToastViewportProps = {
  toasts: ToastItem[];
  onClose: (id: string) => void;
};

const DEFAULT_DURATION_MS = 3600;

export function ToastViewport({ toasts, onClose }: ToastViewportProps) {
  useEffect(() => {
    const timeouts = toasts.map((toast) => {
      const timeout = window.setTimeout(() => {
        onClose(toast.id);
      }, toast.durationMs ?? DEFAULT_DURATION_MS);

      return timeout;
    });

    return () => {
      for (const timeout of timeouts) {
        window.clearTimeout(timeout);
      }
    };
  }, [onClose, toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <aside className="toast-viewport" aria-live="polite" aria-label="Notificações">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast toast--${toast.kind}`}>
          <div className="toast__content">
            <p className="toast__title">{toast.title}</p>
            {toast.description ? <p className="toast__description">{toast.description}</p> : null}
          </div>
          <button type="button" className="toast__close" onClick={() => onClose(toast.id)} aria-label="Fechar notificação">
            ×
          </button>
        </article>
      ))}
    </aside>
  );
}
