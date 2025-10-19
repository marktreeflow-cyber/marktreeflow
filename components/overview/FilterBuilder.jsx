// /components/overview/FilterBuilder.jsx — v2025.10Z
"use client";

import { useState } from "react";
import { useGlobalFilter } from "@/contexts/FilterContext";
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "@/lib/filterOptions";
import { Calendar, Filter, X } from "lucide-react";

export default function FilterBuilder({ onApply }) {
  const { filters, setFilters } = useGlobalFilter();
  const [open, setOpen] = useState(false);
  const [localFilter, setLocalFilter] = useState(filters);

  const toggleArray = (arr, val) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const applyFilters = () => {
    setFilters(localFilter);
    onApply?.(localFilter);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Filter size={16} /> Filter
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex justify-center items-end sm:items-center">
          <div className="bg-white dark:bg-gray-900 w-full sm:w-[500px] rounded-t-2xl sm:rounded-2xl p-5 shadow-xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Filter size={16} /> Advanced Filters
              </h2>
              <button onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Kategori */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 text-gray-500">Kategori</h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((k) => (
                  <button
                    key={k}
                    onClick={() =>
                      setLocalFilter({
                        ...localFilter,
                        kategori: toggleArray(localFilter.kategori, k),
                      })
                    }
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      localFilter.kategori.includes(k)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 text-gray-500">Status</h3>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      setLocalFilter({
                        ...localFilter,
                        status: toggleArray(localFilter.status, s),
                      })
                    }
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      localFilter.status.includes(s)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 text-gray-500">Tanggal Update</h3>
              <div className="flex gap-2 items-center">
                <Calendar size={14} />
                <input
                  type="date"
                  value={localFilter.dateStart ?? ""}
                  onChange={(e) =>
                    setLocalFilter({ ...localFilter, dateStart: e.target.value })
                  }
                  className="border px-2 py-1 rounded text-sm bg-transparent flex-1"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="date"
                  value={localFilter.dateEnd ?? ""}
                  onChange={(e) =>
                    setLocalFilter({ ...localFilter, dateEnd: e.target.value })
                  }
                  className="border px-2 py-1 rounded text-sm bg-transparent flex-1"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setOpen(false)}
                className="text-sm px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={applyFilters}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
