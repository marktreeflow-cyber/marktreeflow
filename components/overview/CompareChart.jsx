// /components/overview/CompareChart.jsx — PHASE2.5.v2025.10A
"use client";

import { useState, useEffect } from "react";
import { OverviewService } from "@/lib/overviewService";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Filter, Loader2 } from "lucide-react";

export default function CompareChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    type: "status",
    keys: ["EMOL", "EMFO"],
    dateStart: "2025-07-01",
    dateEnd: "2025-10-01",
    granularity: "month",
  });

  useEffect(() => {
    loadCompareData();
  }, [filter]);

  async function loadCompareData() {
    setLoading(true);
    try {
      const res = await OverviewService.getCompare(
        filter.type,
        filter.keys,
        filter.dateStart,
        filter.dateEnd,
        filter.granularity
      );
      setData(res);
    } catch (err) {
      console.error("❌ Failed to load comparison:", err);
    }
    setLoading(false);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold">📊 Perbandingan {filter.type.toUpperCase()}</h2>
        <button
          onClick={() => {
            const input = prompt(
              "Masukkan kunci perbandingan (pisahkan dengan koma):",
              filter.keys.join(",")
            );
            if (!input) return;
            setFilter({ ...filter, keys: input.split(",").map((s) => s.trim()) });
          }}
          className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 text-sm"
        >
          <Filter size={14} /> Ubah
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center text-gray-500 py-12">Tidak ada data perbandingan</div>
      ) : (
        <div className="w-full h-72">
          <ResponsiveContainer>
            <LineChart data={data}>
              <XAxis dataKey="periode" />
              <YAxis />
              <Tooltip />
              <Legend />
              {filter.keys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];
