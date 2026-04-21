import { createContext } from 'react';

export type ToastInput = {
  title: string;
  description?: string;
  durationMs?: number;
};

export type ToastApi = {
  success: (toast: ToastInput) => void;
  error: (toast: ToastInput) => void;
  info: (toast: ToastInput) => void;
  warning: (toast: ToastInput) => void;
};

export const ToastContext = createContext<ToastApi | null>(null);
