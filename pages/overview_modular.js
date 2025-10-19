// /pages/overview_modular.js — FINAL v2025.11C
// (Phase8.3 Integrated — AI Insight Panel + Performance + Predictive Refresh)
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2, AlertTriangle, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// 🧩 Lazy import komponen berat
const ChartSection = dynamic(() => import("@/components/overview/ChartSection"), { ssr: false });
const CompareChart = dynamic(() => import("@/components/overview/CompareChart"), { ssr: false });
const TableSection = dynamic(() => import("@/components/overview/TableSection"), { ssr: false });
const EventLogPanel = dynamic(() => import("@/components/overview/EventLogPanel"), { ssr: false });
const PerfTimelineChart = dynamic(() => import("@/components/overview/PerfTimelineChart"), { ssr: false });
const AnomalyPanel = dynamic(() => import("@/components/overview/AnomalyPanel"), { ssr: false });
const GlobalSearchModal = dynamic(() => import("@/components/overview/GlobalSearchModal"), { ssr: false });
const FilterBuilder = dynamic(() => import("@/components/overview/FilterBuilder"), { ssr: false });
const PerfPanel = dynamic(() => import("@/components/PerfPanel"), { ssr: false });
const InsightPanel = dynamic(() => import("@/components/overview/InsightPanel"), { ssr: false }); // 🧠 NEW

// 🧠 Context providers
import { OverviewSyncProvider, useOverviewSync } from "@/contexts/OverviewSyncContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { PerfProvider } from "@/contexts/PerfContext";
import PerfBadge from "@/components/PerfBadge";

// ⚙️ Predictive Refresh Client
import { runPredictiveRefresh } from "@/lib/predictiveRefreshClient";

export default function OverviewModularPage() {
  const [openPerf, setOpenPerf] = useState(false);

  return (
    <PresenceProvider>
      <FilterProvider>
        <OverviewSyncProvider>
          <PerfProvider>
            <DashboardBody openPerf={openPerf} setOpenPerf={setOpenPerf} />
          </PerfProvider>
        </OverviewSyncProvider>
      </FilterProvider>
    </PresenceProvider>
  );
}

// 🔹 Body component
function DashboardBody({ openPerf, setOpenPerf }) {
  const { triggerGlobalRefresh } = useOverviewSync();
  const [generating, setGenerating] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [anomalyStats, setAnomalyStats] = useState(null);

  // 🧠 Predictive refresh tiap 1 menit
  useEffect(() => {
    const timer = setInterval(() => {
      runPredictiveRefresh(triggerGlobalRefresh);
    }, 60_000);
    return () => clearInterval(timer);
  }, [triggerGlobalRefresh]);

  // 🧾 Ambil anomaly stats (RPC)
  async function fetchAnomalyStats() {
    setLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc("get_anomaly_alert_stats_v1");
      if (error) throw error;
      setAnomalyStats(data?.[0] || null);
    } catch (err) {
      console.error("❌ Error fetch anomaly stats:", err.message);
      setAnomalyStats(null);
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    fetchAnomalyStats();
  }, []);

  // 📄 Generate Weekly Report
  async function handleGenerateReport() {
    try {
      setGenerating(true);
      const res = await fetch("/functions/v1/generate-weekly-report", { method: "POST" });
      const json = await res.json();
      alert(
        json.success
          ? "✅ Weekly report berhasil dibuat & dikirim!"
          : "❌ Gagal membuat laporan mingguan."
      );
    } catch (err) {
      console.error("Report generation error:", err);
      alert("Terjadi kesalahan saat generate report.");
    } finally {
      setGenerating(false);
    }
  }

  // 🔄 Manual refresh semua cache section
  function handleClearCache() {
    localStorage.removeItem("overview_cache_v1");
    triggerGlobalRefresh("manual");
    fetchAnomalyStats();
  }

  return (
    <div className="p-6 space-y-8 pb-40 relative">
      {/* 🔹 HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          📊 Overview Dashboard (Modular)
        </h1>
        <div className="flex items-center gap-3">
          <FilterBuilder />
          <button
            onClick={handleClearCache}
            className="flex items-center gap-1 text-sm px-3 py-1 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Clear cached data & refresh all"
          >
            <RefreshCcw size={16} /> Refresh All
          </button>
          <span className="text-sm text-gray-400 hidden sm:block">
            Press <kbd className="border px-1">Ctrl</kbd> + <kbd className="border px-1">K</kbd> to jump
          </span>
        </div>
      </div>

      {/* ⚠️ ANOMALY SUMMARY BADGE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" /> Anomaly Summary
        </div>

        {loadingStats ? (
          <div className="flex items-center text-sm text-gray-400">
            <Loader2 className="animate-spin mr-2 w-4 h-4" /> Loading stats...
          </div>
        ) : anomalyStats ? (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm text-center w-full mt-3 md:mt-0">
            <div>
              <div className="font-bold">{anomalyStats.total_alerts}</div>
              <div className="text-gray-500">Total Alerts</div>
            </div>
            <div>
              <div className="text-green-600 font-bold">{anomalyStats.total_sent}</div>
              <div className="text-gray-500">Sent</div>
            </div>
            <div>
              <div className="text-red-500 font-bold">{anomalyStats.total_failed}</div>
              <div className="text-gray-500">Failed</div>
            </div>
            <div>
              <div className="font-bold">{anomalyStats.avg_accuracy}%</div>
              <div className="text-gray-500">Avg Accuracy</div>
            </div>
            <div>
              <div className="font-bold">
                {Number(anomalyStats.avg_deviation).toLocaleString()}
              </div>
              <div className="text-gray-500">Avg Deviation</div>
            </div>
            <div>
              <div className="font-bold">
                {anomalyStats.last_alert_time
                  ? new Date(anomalyStats.last_alert_time).toLocaleString()
                  : "-"}
              </div>
              <div className="text-gray-500">Last Alert</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-sm">No anomaly data yet</div>
        )}
      </div>

      {/* 🔹 DASHBOARD CONTENT */}
      <div className="space-y-8">
        <ChartSection title="KPI Detail per Kategori" sectionKey="kpi_category" />
        <TableSection
          title="Tabel KPI per Kategori"
          type="kategori"
          dateStart="2025-07-01"
          dateEnd="2025-10-01"
        />

        <ChartSection title="Jumlah Update per Status" sectionKey="status_distribution" />
        <TableSection
          title="Tabel Jumlah Update per Status"
          type="status"
          dateStart="2025-07-01"
          dateEnd="2025-10-01"
        />

        <ChartSection title="Aktivitas Update per Bulan" sectionKey="update_activity" />
        <ChartSection
          title="Revenue Trend per Kategori"
          sectionKey="revenue"
          defaultChart="line"
        />

        <div data-section-key="compare_chart">
          <CompareChart />
        </div>
      </div>

      {/* 🧾 EVENT LOG PANEL */}
      <div data-section-key="event_log">
        <EventLogPanel />
      </div>

      {/* 🩺 PERFORMANCE TIMELINE */}
      <div data-section-key="perf_timeline">
        <PerfTimelineChart />
      </div>

      {/* 🚨 ANOMALY DETECTOR PANEL */}
      <div data-section-key="anomaly_detector">
        <AnomalyPanel />
      </div>

      {/* 🧠 AI INSIGHT PANEL (Phase 8.3) */}
      <div data-section-key="insight_ai">
        <InsightPanel />
      </div>

      {/* 📄 WEEKLY REPORT BUTTON */}
      <div className="flex justify-center pt-6">
        <button
          onClick={handleGenerateReport}
          disabled={generating}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            generating
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {generating ? "Generating..." : "📄 Generate Weekly Report"}
        </button>
      </div>

      {/* 🔎 GLOBAL SEARCH */}
      <GlobalSearchModal />

      {/* ⚙️ PERF BADGE + PANEL */}
      <PerfBadge />
      <button
        onClick={() => setOpenPerf(!openPerf)}
        className="fixed bottom-4 right-20 z-50 bg-black/70 text-white text-xs px-3 py-1 rounded-lg hover:bg-black"
        title="Open performance log"
      >
        PERF LOG
      </button>
      <PerfPanel open={openPerf} onClose={() => setOpenPerf(false)} />
    </div>
  );
}
