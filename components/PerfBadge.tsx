"use client";
import { usePerf } from "@/contexts/PerfContext";

export default function PerfBadge() {
  const { enabled, setEnabled, samples, refresh } = usePerf();
  const last = samples[0];
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-black/80 text-white rounded-2xl px-4 py-2 shadow-lg flex items-center gap-3">
        <button
          onClick={() => setEnabled(!enabled)}
          className={`text-xs px-2 py-1 rounded ${enabled ? "bg-emerald-600" : "bg-slate-600"}`}
          title="Toggle Profiler"
        >
          PERF {enabled ? "ON" : "OFF"}
        </button>
        <button onClick={refresh} className="text-xs bg-slate-700 px-2 py-1 rounded">↻</button>
        {last ? (
          <div className="text-xs opacity-90">
            <div>{last.section} · {last.phase}</div>
            <div>render {last.actualDuration.toFixed(1)}ms {last.fetchMs?`· fetch ${Math.round(last.fetchMs)}ms`: ""}</div>
          </div>
        ) : <div className="text-xs opacity-70">no samples</div>}
      </div>
    </div>
  );
}
