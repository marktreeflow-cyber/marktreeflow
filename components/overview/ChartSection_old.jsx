// /components/overview/ChartSection.jsx — PHASE2.4.v2025.10A
"use client";

import { useState, useEffect } from "react";
import { OverviewService } from "@/lib/overviewService";
import FilterSheet from "./FilterSheet";
import ChartTypeToggle from "./ChartTypeToggle";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Filter } from "lucide-react";

export default function ChartSection({ title, sectionKey, defaultChart = "bar" }) {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState({
    dateStart: "2025-07-01",
    dateEnd: "2025-10-01",
    kategori: "ALL",
  });
  const [chartType, setChartType] = useState(defaultChart);
  const [openFilter, setOpenFilter] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    try {
      const d =
        sectionKey === "revenue"
          ? await OverviewService.getRevenue(filter.dateStart, filter.dateEnd, filter.kategori)
          : await OverviewService.getSection(sectionKey, filter.dateStart, filter.dateEnd, filter.kategori);
      setData(d);
    } catch (err) {
      console.error("Failed to load section data:", err);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpenFilter(true)} className="text-gray-500 hover:text-indigo-600">
            <Filter size={16} />
          </button>
          <ChartTypeToggle chartType={chartType} onChange={setChartType} />
        </div>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer>
          {chartType === "bar" ? (
            <BarChart data={data}>
              <XAxis dataKey="kategori" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#6366f1" />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <XAxis dataKey="kategori" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line dataKey="total" stroke="#10b981" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <FilterSheet
        open={openFilter}
        onClose={() => setOpenFilter(false)}
        filter={filter}
        onApply={setFilter}
      />
    </div>
  );
}
