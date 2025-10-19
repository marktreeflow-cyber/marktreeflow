// /pages/omzet-overview.js — FINAL v2025.11L
// (Phase3.5 Ready: Comparison + Growth + Forecast + AI Accuracy)
"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, DollarSign, Clock, Brain } from "lucide-react";
import { OmzetService } from "@/lib/omzetService";
import GrowthBadge from "@/components/omzet/GrowthBadge";
import OmzetComparisonChart from "@/components/omzet/OmzetComparisonChart";
import OmzetForecastChart from "@/components/omzet/OmzetForecastChart";
import AIForecastPanel from "@/components/omzet/AIForecastPanel";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

export default function OmzetOverview() {
  const [data, setData] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [aiForecast, setAIForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Load comparison + growth + forecast + AI merge
  useEffect(() => {
    fetchOmzetData();
  }, []);

  async function fetchOmzetData() {
    setLoading(true);
    const [summary, growthData, forecastData, aiData] = await Promise.all([
      OmzetService.getComparison("2025-07-01", "2025-10-01"),
      OmzetService.getGrowth(),
      OmzetService.getForecastAll(),
      OmzetService.getAIForecastMerge(),
    ]);
    setData(summary || []);
    setGrowth(growthData || []);
    setForecast(forecastData || []);
    setAIForecast(aiData || []);
    setLoading(false);
  }

  const totalRevenue = data.reduce((s, d) => s + Number(d.total_revenue || 0), 0);
  const avgDuration = data.reduce((s, d) => s + Number(d.avg_duration || 0), 0) / (data.length || 1);

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* 🔹 HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">💰 Omzet Overview Dashboard</h1>
        <button
          onClick={fetchOmzetData}
          className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={36} />
        </div>
      ) : (
        <>
          {/* 💰 SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              icon={<TrendingUp className="text-blue-500" size={20} />}
              label="Total Updates"
              value={data.reduce((s, d) => s + Number(d.total_updates || 0), 0).toLocaleString()}
            />
            <SummaryCard
              icon={<DollarSign className="text-green-500" size={20} />}
              label="Total Omzet"
              value={`Rp ${totalRevenue.toLocaleString()}`}
            />
            <SummaryCard
              icon={<Clock className="text-amber-500" size={20} />}
              label="Rata-rata Durasi"
              value={`${Math.round(avgDuration)} hari`}
            />
          </div>

          {/* 📊 KPI PER KATEGORI */}
          <Section title="Performa Kategori (Update vs Omzet)">
            <BarChartBox data={aggregateByKategori(data)} />
          </Section>

          {/* 📈 TREND OMZET BULANAN */}
          <Section title="Tren Bulanan (Update & Omzet)">
            <LineChartBox data={aggregateByMonth(data)} />
          </Section>

          {/* ⚖️ PERBANDINGAN ANTAR KATEGORI */}
          <Section title="Perbandingan Omzet antar Kategori">
            <OmzetComparisonChart data={data} />
          </Section>

          {/* 📈 GROWTH ANALYTICS */}
          <Section title="Kenaikan / Penurunan Omzet Bulanan">
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <table className="min-w-full text-sm border-collapse border border-gray-300 dark:border-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 border">Kategori</th>
                    <th className="px-3 py-2 border">Bulan</th>
                    <th className="px-3 py-2 border">Total Revenue</th>
                    <th className="px-3 py-2 border">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {growth.map((g, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-3 py-2 border">{g.kategori}</td>
                      <td className="px-3 py-2 border">
                        {new Date(g.update_month).toLocaleString("id-ID", {
                          month: "short",
                          year: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 border">
                        Rp {Number(g.total_revenue).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 border text-center">
                        <GrowthBadge percent={g.growth_percent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* 🔮 FORECAST SECTION */}
          <Section title="Prediksi Omzet (3 Bulan ke Depan)">
            <OmzetForecastChart data={forecast} />
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <h3 className="font-semibold mb-2">Kategori dengan Tren Positif</h3>
              <ul className="text-sm list-disc ml-5">
                {forecast
                  .filter((f) => f.trend === "UP")
                  .map((f, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{f.kategori}</span>
                      <span className="text-green-500 font-semibold">
                        ▲ {Number(f.predicted_revenue).toLocaleString()}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </Section>

          {/* 🤖 AI FORECAST ACCURACY & ANOMALY */}
          <Section title={<span className="flex items-center gap-2"><Brain size={18}/> AI Forecast Accuracy & Anomaly</span>}>
            <AIForecastPanel data={aiForecast} />
          </Section>
        </>
      )}
    </div>
  );
}

/* 🧩 Subcomponents */
function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {children}
    </section>
  );
}

function BarChartBox({ data }) {
  return (
    <div className="h-80 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="kategori" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total_updates" name="Total Update" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          <Bar dataKey="total_revenue" name="Total Omzet" fill="#10b981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineChartBox({ data }) {
  return (
    <div className="h-80 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="total_updates" stroke="#3b82f6" strokeWidth={2} />
          <Line type="monotone" dataKey="total_revenue" stroke="#10b981" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* 🧮 Helpers */
function aggregateByKategori(data) {
  const result = {};
  data.forEach((d) => {
    if (!result[d.kategori]) result[d.kategori] = { kategori: d.kategori, total_updates: 0, total_revenue: 0 };
    result[d.kategori].total_updates += Number(d.total_updates);
    result[d.kategori].total_revenue += Number(d.total_revenue);
  });
  return Object.values(result);
}

function aggregateByMonth(data) {
  const result = {};
  data.forEach((d) => {
    const month = new Date(d.update_month).toLocaleString("id-ID", { month: "short", year: "2-digit" });
    if (!result[month]) result[month] = { month, total_updates: 0, total_revenue: 0 };
    result[month].total_updates += Number(d.total_updates);
    result[month].total_revenue += Number(d.total_revenue);
  });
  return Object.values(result);
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
