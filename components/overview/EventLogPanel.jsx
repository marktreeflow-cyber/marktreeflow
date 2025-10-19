// /components/overview/EventLogPanel.jsx — FINAL v2025.10Y (Phase2.20 – Export Logs + Severity Logic)
"use client";

import { useSnapshot } from "@/contexts/SnapshotContext";
import {
  Clock,
  Pause,
  Play,
  Trash2,
  Database,
  Filter,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  FileSpreadsheet,
  FileJson,
} from "lucide-react";
import { determineSeverity, SEVERITY_COLORS } from "@/lib/severityUtils";
import { exportLogsToCSV, exportLogsToJSON } from "@/lib/exportUtils";

export default function EventLogPanel() {
  const {
    eventLogs,
    paused,
    setPaused,
    clearAll,
    expanded,
    setExpanded,
    filterType,
    setFilterType,
    analytics,
  } = useSnapshot();

  if (expanded) return <ExpandedEventLog onClose={() => setExpanded(false)} />;
  if (!eventLogs?.length) return null;

  // 🔎 Filter event sesuai tipe
  const filteredLogs =
    filterType === "ALL"
      ? eventLogs
      : eventLogs.filter((log) => log.type === filterType);

  // 🔹 Tentukan severity + warna otomatis
  const renderSeverity = (log) => {
    const level = determineSeverity(log);
    const color = SEVERITY_COLORS[level];
    const icon =
      level === "critical" ? (
        <AlertOctagon size={10} />
      ) : level === "warning" ? (
        <AlertTriangle size={10} />
      ) : (
        <CheckCircle2 size={10} />
      );
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${color}`}
      >
        {icon}
        {level}
      </span>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/85 text-gray-100 text-xs p-3 border-t border-gray-700 z-[9998] backdrop-blur">
      <div className="max-w-6xl mx-auto flex justify-between items-start">
        {/* 🧮 Summary */}
        <div>
          <div className="flex items-center gap-3 text-gray-400 mb-1">
            <Clock size={12} />
            <span>Realtime Event Log</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-green-400">Insert: {analytics.insert}</span>
              <span className="text-blue-400">Update: {analytics.update}</span>
              <span className="text-red-400">Delete: {analytics.del}</span>
            </div>
          </div>

          {/* short list dengan severity color */}
          <div className="flex flex-wrap gap-2">
            {filteredLogs.slice(0, 8).map((log) => {
              const level = determineSeverity(log);
              const highlight =
                level === "critical"
                  ? "border-red-500/60 bg-red-950/40"
                  : level === "warning"
                  ? "border-yellow-400/60 bg-yellow-950/40"
                  : "border-gray-700 bg-gray-800";
              return (
                <span
                  key={log.id}
                  className={`px-2 py-1 rounded border ${highlight} flex items-center gap-1`}
                >
                  <b>{log.time}</b> · {log.type} · {log.section} ({log.status})
                  {renderSeverity(log)}
                </span>
              );
            })}
          </div>
        </div>

        {/* ⚙️ Controls */}
        <div className="flex gap-2 items-center">
          {/* Filter dropdown */}
          <div className="relative group">
            <button
              className="p-1.5 rounded hover:bg-gray-800 flex items-center gap-1"
              title="Filter Event Type"
            >
              <Filter size={14} />
              <span className="hidden sm:inline">{filterType}</span>
            </button>
            <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg hidden group-hover:block z-10">
              {["ALL", "INSERT", "UPDATE", "DELETE"].map((type) => (
                <div
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 cursor-pointer hover:bg-gray-700 ${
                    filterType === type ? "text-indigo-400" : ""
                  }`}
                >
                  {type}
                </div>
              ))}
            </div>
          </div>

          {/* Pause/Play */}
          <button
            onClick={() => setPaused((p) => !p)}
            className="p-1.5 rounded hover:bg-gray-800"
            title={paused ? "Resume Realtime" : "Pause Realtime"}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>

          {/* Export CSV */}
          <button
            onClick={() => exportLogsToCSV(filteredLogs)}
            className="p-1.5 rounded hover:bg-gray-800"
            title="Export Logs to CSV"
          >
            <FileSpreadsheet size={14} />
          </button>

          {/* Export JSON */}
          <button
            onClick={() => exportLogsToJSON(filteredLogs)}
            className="p-1.5 rounded hover:bg-gray-800"
            title="Export Logs to JSON"
          >
            <FileJson size={14} />
          </button>

          {/* Clear */}
          <button
            onClick={clearAll}
            className="p-1.5 rounded hover:bg-gray-800"
            title="Clear Log"
          >
            <Trash2 size={14} />
          </button>

          {/* Expand */}
          <button
            onClick={() => setExpanded(true)}
            className="p-1.5 rounded hover:bg-gray-800"
            title="Expand History View"
          >
            <Database size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
