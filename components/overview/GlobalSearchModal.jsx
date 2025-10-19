// /components/overview/GlobalSearchModal.jsx — v2025.10W (Command-K Jump)
"use client";

import { useState, useEffect, useRef } from "react";
import { Command, Search, X } from "lucide-react";

const SECTIONS = [
  { id: "kpi_category", label: "KPI Detail per Kategori" },
  { id: "status_distribution", label: "Jumlah Update per Status" },
  { id: "update_activity", label: "Aktivitas Update per Bulan" },
  { id: "revenue", label: "Revenue Trend per Kategori" },
  { id: "compare_chart", label: "Perbandingan Chart" },
  { id: "event_log", label: "Event Log Panel" },
];

export default function GlobalSearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const modalRef = useRef();

  // 🎹 Shortcut Ctrl+K
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const results = SECTIONS.filter((s) =>
    s.label.toLowerCase().includes(query.toLowerCase())
  );

  const jumpToSection = (id) => {
    setOpen(false);
    const el = document.querySelector(`[data-section-key="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-indigo-500");
      setTimeout(() => el.classList.remove("ring-2", "ring-indigo-500"), 1000);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === modalRef.current) setOpen(false);
      }}
    >
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl shadow-xl p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search section or feature..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {results.length ? (
            results.map((s) => (
              <div
                key={s.id}
                onClick={() => jumpToSection(s.id)}
                className="cursor-pointer px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
              >
                {s.label}
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-sm italic px-2">
              No matches found
            </div>
          )}
        </div>

        {/* Shortcut hint */}
        <div className="text-[11px] text-gray-400 mt-3 flex justify-between">
          <span>Press <kbd className="border px-1">Esc</kbd> to close</span>
          <span className="flex items-center gap-1">
            <Command size={10} /> K
          </span>
        </div>
      </div>
    </div>
  );
}
