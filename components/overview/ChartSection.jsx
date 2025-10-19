"use client";

import { useEffect, useState, useCallback, useRef, Profiler } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSnapshot } from "@/contexts/SnapshotContext";
import { useOverviewSync } from "@/contexts/OverviewSyncContext";
import { usePresence } from "@/contexts/PresenceContext";
import { RefreshCcw, Loader2, Database } from "lucide-react";
import dynamic from "next/dynamic";
import TrendlineMini from "./TrendlineMini";
import SnapshotHistoryModal from "./SnapshotHistoryModal";
import PresenceBar from "./PresenceBar";
import LiveCursor from "./LiveCursor";

/* ⏬ Dynamic import Recharts */
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });

export default function ChartSection({ title, sectionKey }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState("bar");
  const [cacheAge, setCacheAge] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fetchMs, setFetchMs] = useState(null);

  const { ttl, lastGlobalRefresh } = useSnapshot();
  const { refreshKey, triggerGlobalRefresh, activeSource } = useOverviewSync();
  const { updatePresence } = usePresence();

  const sectionRef = useRef(null);
  const abortRef = useRef(null);

  /* 🧱 Cache util */
  const CACHE_KEY = "overview_cache_v1";
  const MAX_AGE = 1000 * 60 * 30; // 30 menit

  const getCache = useCallback(() => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
      const s = cache[sectionKey];
      if (!s) return null;
      const expired = Date.now() - s.timestamp > MAX_AGE;
      return expired ? null : s;
    } catch {
      return null;
    }
  }, [sectionKey]);

  const setCache = useCallback(
    (payload) => {
      try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
        cache[sectionKey] = { ...payload, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch (err) {
        console.error("Cache write error:", err);
      }
    },
    [sectionKey]
  );

  /* 👁 Visibility observer */
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => setVisible(entries[0].isIntersecting),
      { threshold: 0.25, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  /* ⚙️ Fetch + Persistent Cache + Profiling */
  const fetchData = useCallback(
    async (force = false) => {
      if (!visible) return;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const cached = getCache();
      if (cached && !force) {
        setData(cached.data);
        setCacheAge(Math.floor((Date.now() - cached.timestamp) / 1000));
        setLoading(false);
      } else setLoading(true);

      const valid = cached && Date.now() - cached.timestamp < ttl;
      if (!force && valid) return;

      const t0 = performance.now();
      const { data: res, error } = await supabase.rpc(
        "get_analytics_section_v1",
        { section: sectionKey, date_start: null, date_end: null, kategori_filter: null },
        { signal: ctrl.signal }
      );
      const dur = performance.now() - t0;
      setFetchMs(dur);

      if (error) {
        console.error("Fetch error:", error);
        setLoading(false);
        return;
      }

      const snapshot = { data: res || [] };
      setCache(snapshot);
      setData(snapshot.data);
      setCacheAge(0);
      setLoading(false);

      console.table([{ section: sectionKey, fetchMs: dur.toFixed(1), rows: res?.length ?? 0 }]);
    },
    [sectionKey, ttl, visible, getCache, setCache]
  );

  /* ⏱ Initial load + refresh trigger */
  useEffect(() => {
    if (visible) fetchData();
  }, [fetchData, lastGlobalRefresh, visible]);

  /* ⏳ Update age setiap 5 detik */
  useEffect(() => {
    const timer = setInterval(() => {
      const c = getCache();
      if (c) setCacheAge(Math.floor((Date.now() - c.timestamp) / 1000));
    }, 5000);
    return () => clearInterval(timer);
  }, [getCache]);

  /* 🔁 Global refresh */
  useEffect(() => {
    if (activeSource !== sectionKey) fetchData(true);
  }, [refreshKey]);

  /* 👥 Presence */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => updatePresence({ sectionKey: entries[0].isIntersecting ? sectionKey : null }),
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sectionKey, updatePresence]);

  /* 🧩 Profiler callback */
  const onRender = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    console.table([
      {
        section: sectionKey,
        phase,
        renderMs: actualDuration.toFixed(1),
        commit: commitTime.toFixed(1),
        fetchMs: fetchMs?.toFixed?.(1) || "-",
        rows: data?.length ?? 0,
      },
    ]);
  };

  return (
    <div
      ref={sectionRef}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 md:p-6 relative overflow-hidden"
      data-section-key={sectionKey}
    >
      {/* 🔹 Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {title}
          {cacheAge !== null && (
            <span className="text-xs text-gray-400">
              ({cacheAge < ttl / 1000 ? `cached ${cacheAge}s ago` : "expired"})
            </span>
          )}
        </h2>

        <div className="flex items-center gap-3">
          <PresenceBar sectionKey={sectionKey} />
          <button
            onClick={() => setChartType(chartType === "bar" ? "line" : "bar")}
            className="text-sm px-3 py-1 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {chartType === "bar" ? "Line" : "Bar"}
          </button>
          <button
            onClick={() => {
              triggerGlobalRefresh(sectionKey);
              fetchData(true);
            }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Refresh data"
          >
            <RefreshCcw size={18} />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="View Snapshot History"
          >
            <Database size={18} />
          </button>
        </div>
      </div>

      {/* 🔹 Chart utama */}
      {!visible ? (
        <div className="h-80 flex items-center justify-center text-gray-400 text-sm">Waiting to load…</div>
      ) : loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="animate-spin text-gray-400" size={36} />
        </div>
      ) : (
        <>
          <LiveCursor sectionKey={sectionKey}>
            <Profiler id={`chart-${sectionKey}`} onRender={onRender}>
              <div className="h-80 w-full">
                <ResponsiveContainer>
                  {chartType === "bar" ? (
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" strokeWidth={2} dot={false} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Profiler>
          </LiveCursor>

          {/* 🔹 Mini Trendline */}
          <div className="border-t mt-4 pt-3">
            <TrendlineMini sectionKey={sectionKey} />
          </div>
        </>
      )}

      {/* 💾 Snapshot History Modal */}
      {showHistory && (
        <SnapshotHistoryModal open={showHistory} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}
