"use client";
import { usePerf } from "@/contexts/PerfContext";
import { X } from "lucide-react";

export default function PerfPanel({ open, onClose }) {
  const { samples } = usePerf();
  if (!open) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-white max-h-[60vh] overflow-auto z-50 rounded-t-2xl p-4 text-xs">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold">Performance Log ({samples.length})</h2>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
          <X size={14} />
        </button>
      </div>
      <table className="w-full border-collapse">
        <thead className="text-gray-400 border-b border-white/10">
          <tr>
            <th className="text-left p-1">Section</th>
            <th className="text-left p-1">Phase</th>
            <th className="text-right p-1">Render (ms)</th>
            <th className="text-right p-1">Fetch (ms)</th>
            <th className="text-right p-1">Rows</th>
            <th className="text-right p-1">Time</th>
          </tr>
        </thead>
        <tbody>
          {samples.slice(0, 200).map((s, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5">
              <td className="p-1">{s.section}</td>
              <td className="p-1">{s.phase}</td>
              <td className="p-1 text-right">{s.actualDuration.toFixed(1)}</td>
              <td className="p-1 text-right">
                {s.fetchMs ? Math.round(s.fetchMs) : "-"}
              </td>
              <td className="p-1 text-right">{s.rows ?? "-"}</td>
              <td className="p-1 text-right text-gray-400">
                {new Date(s.ts).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
