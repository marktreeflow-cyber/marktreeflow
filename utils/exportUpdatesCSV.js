// utils/exportUpdatesCSV.js — FINAL 2025
// 🔹 Ekspor data update (mplan.updates_with_timeline_plus_v3)
// 🔹 Digunakan di halaman all-updates.js

export const exportUpdatesCSV = (data = [], filename = "updates_export.csv") => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    alert("Tidak ada data update untuk diekspor.");
    return;
  }

  const headers = Array.from(
    new Set(data.flatMap((obj) => Object.keys(obj)))
  );

  const rows = [
    headers.join(","), // header baris pertama
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const v = String(val).replace(/"/g, '""');
          return `"${v}"`;
        })
        .join(",")
    ),
  ];

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
