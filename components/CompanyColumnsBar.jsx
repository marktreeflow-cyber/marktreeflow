// components/CompanyColumnsBar.jsx — FINAL 2025
import React from "react";

/**
 * Header grid untuk CompanyTable — sejajar 1:1 dengan body <colgroup>
 * Gunakan bersama HEADERS & COL_WIDTHS dari CompanyTable.jsx
 */

export default function CompanyColumnsBar({
  headers = [],
  colWidths = [],
  sortConfig,
  setSortConfig,
  sortKeyByHeader = {},
}) {
  const onSort = (label) => {
    const key = sortKeyByHeader[label];
    if (!key) return;
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev?.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortIcon = (label) => {
    const key = sortKeyByHeader[label];
    if (!key || sortConfig?.key !== key) return "⇅";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  return (
    <div
      className="grid text-xs font-semibold uppercase border-b border-slate-700 text-slate-200 bg-[var(--bg-header)] sticky top-0 z-30"
      style={{
        gridTemplateColumns: colWidths.join(" "),
        textAlign: "left",
      }}
    >
      {headers.map((label) => {
        const sortable = !!sortKeyByHeader[label];
        return (
          <div
            key={label}
            onClick={() => sortable && onSort(label)}
            className={`px-3 py-2 flex items-center select-none ${
              sortable ? "cursor-pointer hover:bg-[var(--bg-hover)]" : ""
            }`}
            title={sortable ? "Klik untuk sort" : undefined}
          >
            <span className="truncate">{label}</span>
            {sortable && (
              <span className="ml-1 text-[10px] text-slate-400">{sortIcon(label)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
