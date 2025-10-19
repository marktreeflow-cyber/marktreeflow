"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import colors from "tailwindcss/colors";

export default function OmzetComparisonChart({ data }) {
  // format ulang jadi per kategori → series
  const grouped = data.reduce((acc, cur) => {
    const month = cur.update_month;
    acc[month] = acc[month] || { update_month: month };
    acc[month][cur.kategori] = cur.total_revenue;
    return acc;
  }, {});
  const chartData = Object.values(grouped);

  const palette = [colors.indigo[500], colors.emerald[500], colors.orange[500], colors.pink[500]];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
      <h2 className="font-semibold mb-3">📊 Perbandingan Omzet antar Kategori</h2>
      <div className="h-80">
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="update_month" />
            <YAxis />
            <Tooltip />
            <Legend />
            {Object.keys(chartData[0] || {}).filter(k => k !== "update_month").map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={palette[i % palette.length]} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
