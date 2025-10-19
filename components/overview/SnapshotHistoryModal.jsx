// /components/overview/SnapshotHistoryModal.jsx — v2025.10X
"use client";
import { useState, useEffect } from "react";
import { listSnapshots, clearSnapshots } from "@/lib/snapshotUtils";
import { Clock, Database, Trash2, X } from "lucide-react";

export default function SnapshotHistoryModal({ open, onClose }) {
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    if (open) setSnapshots(listSnapshots());
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-5 w-full max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database size={16} /> Snapshot History
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>

        {/* Table */}
        {snapshots.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-10">
            Tidak ada snapshot cache.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse border border-gray-300 dark:border-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-left">Section</th>
                  <th className="px-3 py-2 border text-left">Timestamp</th>
                  <th className="px-3 py-2 border text-right">Size (KB)</th>
                  <th className="px-3 py-2 border text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s, i) => (
                  <tr
                    key={i}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-3 py-2 border">{s.sectionKey}</td>
                    <td className="px-3 py-2 border">
                      <Clock className="inline mr-1" size={12} />
                      {s.timestamp.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 border text-right">{s.sizeKB}</td>
                    <td className="px-3 py-2 border text-center">
                      <button
                        onClick={() => {
                          const el = document.querySelector(
                            `[data-section-key="${s.sectionKey}"]`
                          );
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth" });
                            el.classList.add("ring-2", "ring-green-500");
                            setTimeout(
                              () =>
                                el.classList.remove("ring-2", "ring-green-500"),
                              1200
                            );
                          }
                          onClose();
                        }}
                        className="px-2 py-1 text-xs bg-green-100 dark:bg-green-700/50 text-green-700 dark:text-green-100 rounded"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-4 text-sm">
          <span className="text-gray-500">{snapshots.length} snapshot tersimpan</span>
          <button
            onClick={() => {
              clearSnapshots();
              setSnapshots([]);
            }}
            className="flex items-center gap-1 text-red-500 hover:text-red-700"
          >
            <Trash2 size={14} /> Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
