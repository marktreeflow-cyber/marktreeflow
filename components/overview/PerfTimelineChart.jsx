"use client";
import { useEffect, useState } from "react";
import { getPerfTimeline } from "@/lib/fetchers/perfTimeline";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Loader2 } from "lucide-react";

export default function PerfTimelineChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSections, setSelectedSections] = useState([
    "kpi_category",
    "status_distribution",
  ]);

  useEffect(() => {
    loadData();
  }, [selectedSections]);

  async function loadData() {
    setLoading(true);
    const res = await getPerfTimeline(selectedSections);
    setData(res);
    setLoading(false);
  }

  const colors = {
    kpi_category: "#6366f1",
    status_distribution: "#10b981",
    update_activity: "#f59e0b",
    revenue: "#ef4444",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">📈 Performance Timeline</h2>
        <select
          multiple
          className="border rounded-lg text-sm px-2 py-1 dark:bg-gray-700"
          value={selectedSections}
          onChange={(e) =>
            setSelectedSections(Array.from(e.target.selectedOptions, (o) => o.value))
          }
        >
          <option value="kpi_category">KPI Category</option>
          <option value="status_distribution">Status Distribution</option>
          <option value="update_activity">Update Activity</option>
          <option value="revenue">Revenue</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="animate-spin text-gray-400" size={36} />
        </div>
      ) : !data.length ? (
        <div className="text-center text-gray-500 py-6">
          No performance data available yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="day" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
            <YAxis />
            <Tooltip
              labelFormatter={(v) => new Date(v).toLocaleDateString()}
              formatter={(val, name) => [`${Math.round(val)} ms`, name]}
            />
            <Legend />
            {selectedSections.map((sec) => (
              <>
                <Line
                  key={`${sec}-fetch`}
                  type="monotone"
                  dataKey={(d) => (d.section_key === sec ? d.avg_fetch_ms : null)}
                  name={`${sec} fetch`}
                  stroke={colors[sec] || "#3b82f6"}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Line
                  key={`${sec}-render`}
                  type="monotone"
                  dataKey={(d) => (d.section_key === sec ? d.avg_render_ms : null)}
                  name={`${sec} render`}
                  stroke={colors[sec] || "#6366f1"}
                  strokeWidth={2}
                  dot={false}
                />
              </>
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
