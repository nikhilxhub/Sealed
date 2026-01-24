"use client";

import * as React from "react";
import { X } from "lucide-react";

export type ToastType = "neutral" | "success" | "error";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((message: string, type: ToastType = "neutral") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      const newToasts = [...prev, { id, message, type }];
      if (newToasts.length > 3) {
        return newToasts.slice(newToasts.length - 3);
      }
      return newToasts;
    });

    // Auto-dismiss
    const duration = type === "error" ? 6000 : 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed z-50 flex flex-col gap-2 
        bottom-4 left-1/2 -translate-x-1/2 w-full max-w-[320px] px-4
        md:left-auto md:right-6 md:translate-x-0 md:px-0">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  // Styles based on type
  const borderStyles = {
    neutral: "border-l-0",
    success: "border-l-2 border-l-white",
    error: "border-l-2 border-l-[#C35A5A]",
  };

  return (
    <div
      className={`
        relative flex items-center justify-between
        w-full p-4 rounded-sm
        bg-[#1A1C22] border border-[#24262D]
        shadow-lg
        font-sans text-sm text-white
        animate-rise-up
        ${borderStyles[toast.type]}
      `}
      role="alert"
    >
      <span>{toast.message}</span>
      <button
        onClick={onDismiss}
        className="ml-4 text-[#B5B8C1] hover:text-white transition-colors"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}
