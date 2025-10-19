// /pages/analytics/anomaly-insights.js — v2025.11P
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

export default function AnomalyInsights() {
  const [summary, setSummary] = useState([]);
  const [trend, setTrend] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: s } = await supabase.from("anomaly_alert_summary_v1").select("*");
    const { data: t } = await supabase.from("anomaly_alert_trend_v1").select("*");
    const { data: l } = await supabase
      .from("anomaly_alert_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setSummary(s || []);
    setTrend(t || []);
    setLogs(l || []);
    setLoading(false);
  }

  if (loading)
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading anomaly insights...
      </div>
    );

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <AlertTriangle className="text-red-500" /> Anomaly Insights Dashboard
      </h1>

      {/* 🔹 Ringkasan per kategori */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <h2 className="font-semibold mb-3">📊 Ringkasan per Kategori</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700">
                <th className="py-2 text-left">Kategori</th>
                <th>Total</th>
                <th>Sent</th>
                <th>Failed</th>
                <th>Rata Akurasi</th>
                <th>Rata Deviasi</th>
                <th>Last Alert</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r) => (
                <tr key={r.kategori} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2">{r.kategori}</td>
                  <td>{r.total_alerts}</td>
                  <td className="text-green-500">{r.sent_count}</td>
                  <td className="text-red-400">{r.failed_count}</td>
                  <td>{r.avg_accuracy?.toFixed(1)}%</td>
                  <td>{Math.round(r.avg_deviation)}</td>
                  <td>{new Date(r.last_alert).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔹 Grafik tren bulanan */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <h2 className="font-semibold mb-3">📈 Tren Anomali Bulanan</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend}>
            <XAxis dataKey="bulan" tickFormatter={(v) => v.slice(0, 7)} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="avg_accuracy" stroke="#10b981" name="Akurasi Rata²" />
            <Line type="monotone" dataKey="avg_deviation" stroke="#ef4444" name="Deviasi Rata²" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 🔹 Log terbaru */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <h2 className="font-semibold mb-3">🧾 Log Alert Terbaru</h2>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded-lg border ${
                log.alert_status === "failed"
                  ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                  : "border-green-400 bg-green-50 dark:bg-green-900/20"
              }`}
            >
              <div className="text-sm font-semibold">{log.kategori}</div>
              <div className="text-xs">{log.alert_message}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(log.created_at).toLocaleString()} — {log.alert_status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
