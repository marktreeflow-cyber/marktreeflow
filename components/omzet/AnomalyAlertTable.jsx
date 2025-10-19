// /components/omzet/AnomalyAlertTable.jsx
export default function AnomalyAlertTable({ data }) {
  if (!data?.length)
    return <p className="text-sm text-gray-400">Tidak ada anomaly terbaru</p>;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <h3 className="font-semibold mb-3">⚠️ Anomaly Terdeteksi</h3>
      <table className="min-w-full text-sm border border-gray-300 dark:border-gray-700">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="px-3 py-2 border">Kategori</th>
            <th className="px-3 py-2 border">Bulan</th>
            <th className="px-3 py-2 border">Deviasi</th>
            <th className="px-3 py-2 border">Akurasi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td className="px-3 py-2 border">{d.kategori}</td>
              <td className="px-3 py-2 border">
                {new Date(d.predicted_month).toLocaleString("id-ID", {
                  month: "short",
                  year: "2-digit",
                })}
              </td>
              <td className="px-3 py-2 border text-red-500">
                {Number(d.deviation).toLocaleString()}
              </td>
              <td className="px-3 py-2 border text-center">
                {d.accuracy_percent?.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
