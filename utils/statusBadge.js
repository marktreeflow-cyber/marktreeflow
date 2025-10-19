// utils/statusBadge.js
// Return className Tailwind untuk badge status & next status
export const getStatusBadge = (status) => {
  if (!status) return "bg-gray-500 text-white px-2 py-1 rounded text-xs font-semibold";
  const s = status.toUpperCase();
  if (s.startsWith("TELE")) return "bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("EMOL")) return "bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("EMFO")) return "bg-indigo-600 text-white px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("TEFO")) return "bg-pink-600 text-white px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("QUOT")) return "bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("MEET")) return "bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("PRIO")) return "bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("CUSO")) return "bg-teal-600 text-white px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("CUPRO")) return "bg-orange-600 text-white px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("CUSD")) return "bg-lime-600 text-white px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("CUGR")) return "bg-emerald-600 text-white px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("SELESAI")) return "bg-gray-800 text-white px-2 py-1 rounded text-xs font-semibold";
  if (s.startsWith("REJE")) return "bg-red-800 text-white px-2 py-1 rounded text-xs font-semibold";
  return "bg-gray-500 text-white px-2 py-1 rounded text-xs font-semibold";
};
