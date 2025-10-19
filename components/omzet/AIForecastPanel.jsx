"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export default function AIForecastPanel({ data }) {
  if (!data?.length) return <p className="text-sm text-gray-400">Belum ada data AI Forecast</p>;

  const anomalyCount = data.filter((d) => d.status === "ANOMALY").length;
  const avgAccuracy = (data.reduce((s, d) => s + (d.accuracy_percent || 0), 0) / data.length).toFixed(2);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">🤖 AI Forecast Accuracy & Anomaly Detection</h2>
        <span className="text-sm text-gray-500">
          Accuracy avg <strong>{avgAccuracy}%</strong> | Anomalies <strong>{anomalyCount}</strong>
        </span>
      </div>

      <div className="h-80">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="predicted_month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="predicted_revenue" name="Prediksi" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="actual_revenue" name="Aktual" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table className="min-w-full text-sm border border-gray-300 dark:border-gray-700">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="px-3 py-2 border">Kategori</th>
            <th className="px-3 py-2 border">Bulan</th>
            <th className="px-3 py-2 border">Prediksi</th>
            <th className="px-3 py-2 border">Aktual</th>
            <th className="px-3 py-2 border">Akurasi</th>
            <th className="px-3 py-2 border">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="px-3 py-2 border">{d.kategori}</td>
              <td className="px-3 py-2 border">
                {new Date(d.predicted_month).toLocaleString("id-ID", { month: "short", year: "2-digit" })}
              </td>
              <td className="px-3 py-2 border">Rp {Number(d.predicted_revenue).toLocaleString()}</td>
              <td className="px-3 py-2 border">Rp {Number(d.actual_revenue || 0).toLocaleString()}</td>
              <td className="px-3 py-2 border text-center">{d.accuracy_percent?.toFixed(1)}%</td>
              <td
                className={`px-3 py-2 border text-center font-semibold ${
                  d.status === "ANOMALY" ? "text-red-500" : "text-green-500"
                }`}
              >
                {d.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
