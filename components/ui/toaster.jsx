// /components/ui/toaster.jsx — FINAL v2025.10Z10
"use client";

import React from "react";
import { X } from "lucide-react";
import { useToast } from "./use-toast";

export function Toaster() {
  const { toasts, close } = useToast();

  if (!toasts?.length) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col items-end z-[9999] space-y-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className="bg-slate-800 text-white p-3 rounded shadow-lg w-[300px] border border-slate-700"
        >
          <div className="flex justify-between items-start gap-2">
            <div>
              {t.title && <p className="font-semibold">{t.title}</p>}
              {t.description && (
                <p className="text-xs text-slate-300 mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => close(t.id)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
