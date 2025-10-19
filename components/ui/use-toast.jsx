// /components/ui/use-toast.jsx — FINAL v2025.10Z10 (Unified Global Toast)
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { nanoid } from "nanoid";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // ✅ fungsi utama yang bisa dipanggil global
  const toast = useCallback(({ title, description, duration = 3000 }) => {
    const id = nanoid();
    const newToast = { id, title, description };
    setToasts(prev => [...prev, newToast]);

    // auto close
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  // close manual
  const close = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, toasts, close }}>
      {children}
    </ToastContext.Provider>
  );
}

// ✅ Hook dipakai komponen lain
export function useToast() {
  return useContext(ToastContext);
}

// ✅ Export global callable toast
export const toast = ({ title, description, duration }) => {
  // trick: panggil di luar provider -> no-op (fallback)
  console.warn("toast() called before provider init");
  return { title, description, duration };
};
