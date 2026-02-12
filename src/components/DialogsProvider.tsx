'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmConfig {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogsContextValue {
  confirm: (config: ConfirmConfig) => Promise<boolean>;
  toast: (message: string, type?: ToastType) => void;
}

const DialogsContext = createContext<DialogsContextValue | null>(null);

let toastId = 0;

export function useDialogs() {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error('useDialogs must be used within DialogsProvider');
  return ctx;
}

export default function DialogsProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<(ConfirmConfig & { open: boolean }) | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const confirm = useCallback((config: ConfirmConfig) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({ ...config, open: true });
    });
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setConfirmState(null);
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <DialogsContext.Provider value={{ confirm, toast }}>
      {children}

      {/* Modal de confirmação */}
      {confirmState?.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h3 id="confirm-title" className="text-lg font-bold text-blue-800 mb-2">
              {confirmState.title || 'Confirmar'}
            </h3>
            <p className="text-slate-600 mb-6">{confirmState.message}</p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="px-4 py-3 sm:py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 min-h-[44px] sm:min-h-0"
              >
                {confirmState.cancelLabel || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`px-4 py-3 sm:py-2 rounded-lg font-medium min-h-[44px] sm:min-h-0 ${
                  confirmState.danger
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {confirmState.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[99] flex flex-col gap-2 pointer-events-none pb-safe">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg shadow-lg border px-4 py-3 flex items-center justify-between gap-3 min-h-[48px] ${
              t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 rounded hover:bg-black/10 text-inherit"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </DialogsContext.Provider>
  );
}
