// /components/overview/AnomalyPanel.jsx — FINAL v2025.10Z
"use client";

import { useEffect, useState } from "react";
import { getAnomalies } from "@/lib/fetchers/anomaly";
import {
  AlertTriangle,
  Loader2,
  RefreshCcw,
  Activity,
  CheckCircle2,
} from "lucide-react";

export default function AnomalyPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await getAnomalies();
      setRows(res || []);
    } catch (err) {
      console.error("Error loading anomalies:", err);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 mt-6">
      {/* 🔹 Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="text-blue-500" size={18} />
          Performance Anomaly Detector
        </h2>

        <button
          onClick={load}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition"
        >
          <RefreshCcw size={14} />
          Refresh
        </button>
      </div>

      {/* 🔹 Loading State */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-200/60 dark:bg-gray-700/50 animate-pulse rounded-lg"
            ></div>
          ))}
        </div>
      ) : !rows.length ? (
        <div className="text-center text-gray-500 py-8">
          ✅ No anomalies detected in the last 7 days.
        </div>
      ) : (
        <>
          {/* 🔹 Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-700/60">
                <tr>
                  <th className="text-left px-3 py-2">Section</th>
                  <th className="text-right px-3 py-2">Day</th>
                  <th className="text-right px-3 py-2">Fetch Avg</th>
                  <th className="text-right px-3 py-2">Render Avg</th>
                  <th className="text-center px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isAnomaly = r.fetch_anomaly || r.render_anomaly;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-200 dark:border-gray-700 ${
                        isAnomaly
                          ? "bg-red-50 dark:bg-red-900/20"
                          : "bg-green-50/30 dark:bg-green-900/10"
                      }`}
                    >
                      <td className="px-3 py-2 font-medium">
                        {r.section_key}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatDate(r.day)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {Math.round(r.avg_fetch_ms)} ms
                      </td>
                      <td className="px-3 py-2 text-right">
                        {Math.round(r.avg_render_ms)} ms
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isAnomaly ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <AlertTriangle size={12} /> Anomaly
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 size={12} /> Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 🔹 Mobile Card View */}
          <div className="md:hidden space-y-3">
            {rows.map((r, i) => {
              const isAnomaly = r.fetch_anomaly || r.render_anomaly;
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-3 ${
                    isAnomaly
                      ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                      : "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-sm">{r.section_key}</p>
                    <p className="text-xs text-gray-500">{formatDate(r.day)}</p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Fetch: {Math.round(r.avg_fetch_ms)} ms • Render:{" "}
                    {Math.round(r.avg_render_ms)} ms
                  </p>
                  <p className="text-xs mt-1">
                    {isAnomaly ? (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertTriangle size={12} /> Anomaly detected
                      </span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Normal performance
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
