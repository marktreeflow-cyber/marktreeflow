// components/UpdatesColumnsBar.jsx — FINAL CLEAN 2025
import React from "react";
import { updatesColumns } from "@/utils/columnsUtils";

/**
 * Header grid untuk tabel UpdateTable.
 * Sinkron 100% dengan colgroup body lewat updatesColumns.widths
 * Sorting dikontrol dari UpdateTable.jsx via props (onSort, getSortIcon)
 */
export default function UpdatesColumnsBar({ onSort, getSortIcon }) {
  return (
    <div
      className="grid text-xs font-semibold uppercase border-b border-slate-700 text-slate-200 bg-[var(--bg-header)] sticky top-0 z-30"
      style={{
        gridTemplateColumns: updatesColumns.widths.join(" "),
        textAlign: "left",
      }}
    >
      {updatesColumns.headers.map((label) => {
        const sortable = !!updatesColumns.sortableKeys[label];
        return (
          <div
            key={label}
            className={`px-3 py-2 flex items-center select-none ${
              sortable ? "cursor-pointer hover:bg-[var(--bg-hover)]" : ""
            }`}
            onClick={() => sortable && onSort(label)}
            title={sortable ? "Klik untuk sort" : undefined}
          >
            <span className="truncate">{label}</span>
            {sortable && (
              <span className="ml-1 text-[10px] text-slate-400">
                {getSortIcon(label)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
