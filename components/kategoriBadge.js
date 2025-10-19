// utils/kategoriBadge.js
export const getKategoriBadge = (k) => {
  const key = (k || "").toUpperCase();
  switch (key) {
    case "KLIEN BARU":
      return "bg-amber-600 text-white px-2 py-1 rounded text-xs font-semibold";
    case "LANGGANAN":
      return "bg-emerald-600 text-white px-2 py-1 rounded text-xs font-semibold";
    case "BELUM KATEGORI":
      return "bg-slate-500 text-white px-2 py-1 rounded text-xs font-semibold";
    case "KONTRAK":
      return "bg-sky-600 text-white px-2 py-1 rounded text-xs font-semibold";
    default:
      return "bg-gray-600 text-white px-2 py-1 rounded text-xs font-semibold";
  }
};
