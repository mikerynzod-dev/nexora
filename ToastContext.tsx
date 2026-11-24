import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import React, { createContext, useCallback, useContext, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-xl backdrop-blur-md transition-all ${
              toast.kind === 'success'
                ? 'bg-[#18181B]/95 border-emerald-500/40 text-[#FAFAFA]'
                : toast.kind === 'error'
                ? 'bg-[#18181B]/95 border-rose-500/50 text-[#FAFAFA]'
                : 'bg-[#18181B]/95 border-[#8B5CF6]/40 text-[#FAFAFA]'
            }`}
          >
            {toast.kind === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {toast.kind === 'error' && (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            {toast.kind === 'info' && (
              <Info className="w-4 h-4 text-[#06B6D4] shrink-0 mt-0.5" />
            )}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
