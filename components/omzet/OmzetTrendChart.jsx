"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function OmzetTrendChart({ data }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
      <h2 className="font-semibold mb-3">📈 Tren Omzet per Bulan</h2>
      <div className="h-80">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="update_month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="total_revenue" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
