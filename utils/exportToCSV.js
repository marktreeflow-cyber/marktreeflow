// utils/exportToCSV.js — FINAL 2025
// 🔹 Fungsi universal ekspor data array ke file CSV
// 🔹 Digunakan oleh company-list.js & all-updates.js

export const exportToCSV = (data = [], filename = "export.csv") => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  // ambil semua key unik dari seluruh objek
  const headers = Array.from(
    new Set(data.flatMap((obj) => Object.keys(obj)))
  );

  // buat isi CSV
  const rows = [
    headers.join(","), // header baris pertama
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          // escape tanda koma dan kutip
          const v = String(val).replace(/"/g, '""');
          return `"${v}"`;
        })
        .join(",")
    ),
  ];

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // buat link download sementara
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
