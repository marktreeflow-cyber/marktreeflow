// /components/overview/TableSection.jsx — FINAL v2025.10AD (Phase2.23+ Virtualized + Cross-Sync Optimized)
"use client";

import { useState, useEffect, useCallback } from "react";
import { OverviewService } from "@/lib/overviewService";
import { useOverviewSync } from "@/contexts/OverviewSyncContext";
import { Loader2, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

export default function TableSection({ title, type, dateStart, dateEnd }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { refreshKey, activeSource } = useOverviewSync();

  // 🚀 Ambil data tabel
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result =
        type === "kategori"
          ? await OverviewService.getTableKategori(dateStart, dateEnd)
          : await OverviewService.getTableStatus(dateStart, dateEnd);
      setData(result || []);
    } catch (err) {
      console.error("❌ Failed to load table:", err);
    }
    setLoading(false);
  }, [type, dateStart, dateEnd]);

  // ⏱ Initial fetch
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🔁 Listen refresh global
  useEffect(() => {
    if (activeSource !== type) loadData();
  }, [refreshKey]);

  // 📤 Export ke CSV
  function handleExportCSV() {
    if (!data.length) return alert("Tidak ada data untuk diekspor.");
    const header = Object.keys(data[0]);
    const csvRows = [
      header.join(","),
      ...data.map((row) =>
        header.map((key) => `"${row[key] ?? ""}"`).join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 🎨 Renderer untuk tiap baris (virtualized)
  const Row = ({ index, style }) => {
    const row = data[index];
    const keys = Object.keys(row);
    return (
      <div
        style={style}
        className={`grid grid-cols-${keys.length} border-b border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800`}
      >
        {keys.map((key) => (
          <div key={key} className="px-3 py-2 truncate">
            {row[key]}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border"
      data-section-key={`table_${type}`}
    >
      {/* 🔹 Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold flex items-center gap-2">{title}</h2>
        <div className="flex gap-2 items-center">
          <button
            onClick={loadData}
            className="flex items-center gap-1 px-2 py-1 text-sm rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Refresh Table"
          >
            <RefreshCcw size={14} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1 text-sm rounded-lg border hover:bg-indigo-50 dark:hover:bg-gray-700"
          >
            <FileSpreadsheet size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* 🔹 Konten Tabel */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          Tidak ada data untuk ditampilkan.
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Header kolom */}
          <div className="grid text-sm font-semibold bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
            {Object.keys(data[0]).map((key) => (
              <div
                key={key}
                className="px-3 py-2 uppercase border-r border-gray-300 dark:border-gray-600 last:border-none"
              >
                {key.replace(/_/g, " ")}
              </div>
            ))}
          </div>

          {/* Body virtualized */}
          <div style={{ height: 300 }}>
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  width={width}
                  itemCount={data.length}
                  itemSize={38}
                  overscanCount={6}
                >
                  {Row}
                </List>
              )}
            </AutoSizer>
          </div>
        </div>
      )}
    </div>
  );
}
