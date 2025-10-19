// utils/statusRules.js

// =====================
// Mapping rules status
// =====================
export const STATUS_RULES = {
  "TELE NA":        { days: 20, next: "TELE" },
  "TELE NOTR":      { days: 0, next: null },
  "TELE CL":        { days: 0, next: null },
  "TELE":           { days: 1, next: "EMOL" },
  "EMOL":           { days: 1, next: "EMFO" },
  "EMFO":           { days: 2, next: "TEFO" },
  "TEFO":           { days: 1, next: "QUOT" },
  "TEFO YR":        { days: 0, next: null },
  "TEFO NA":        { days: 20, next: "TELE" },
  "TEFO NOTR":      { days: 0, next: null },
  "TEFO CL":        { days: 5, next: "TELE" },
  "TEFO NOTU":      { days: 0, next: null },
  "TEFO HADV":      { days: 0, next: null },
  "TEFO WA":        { days: 1, next: "QUOT" },
  "QUOT":           { days: 1, next: "MEET" },
  "MEET":           { days: 2, next: "PRIO" },
  "PRIO":           { days: 3, next: "CUSO" },
  "CUSO":           { days: 7, next: "CUPRO" },
  "CUPRO":          { days: 20, next: "CUSD" },
  "CUSD":           { days: 3, next: "CUGR" },
  "CUGR":           { days: 25, next: "SELESAI" },
  "SELESAI":        { days: 25, next: "TEFO" },

  // REJECT STATES
  "REJE NOTU":      { days: 0, next: null },
  "REJE YR":        { days: 0, next: null },
  "REJE HADV":      { days: 0, next: null },
  "REJE HADC":      { days: 0, next: null },
  "REJE NOQU":      { days: 0, next: null },
  "REJE LM":        { days: 0, next: null },
  "REJE PTOF":      { days: 0, next: null },
};

// =====================
// Normalisasi key status
// =====================
export const normalizeStatus = (s = "") =>
  s.toString().trim().toUpperCase().replace(/\s+/g, " ").replace(/[.]/g, "");

// =====================
// Tambah hari kalender (legacy)
// =====================
export const addDays = (isoDate, days) => {
  if (!isoDate || days === null) return "-";
  if (days === 0) return isoDate?.slice?.(0, 10) ?? "-";
  const d = new Date(isoDate);
  if (isNaN(d)) return "-";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// =====================
// Tambah hari kerja (skip Sabtu/Minggu)
// =====================
export const addWorkdays = (isoDate, days) => {
  if (!isoDate || days === null) return "-";
  if (days === 0) return isoDate?.slice?.(0, 10) ?? "-";
  const d = new Date(isoDate);
  if (isNaN(d)) return "-";

  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay(); // 0=Min, 6=Sab
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
};

// =====================
// Hitung next step (pakai hari kerja)
// =====================
export const computeNext = (statusNow, lastUpdateISO) => {
  const key = normalizeStatus(statusNow);
  const rule = STATUS_RULES[key];
  if (!rule) return { nextDate: "-", nextStatus: "UNMAPPED" };
  if (rule.days === 0 || !rule.next) {
    return { nextDate: "-", nextStatus: "-" };
  }
  return {
    nextDate: addWorkdays(lastUpdateISO, rule.days),
    nextStatus: rule.next,
  };
};

// =====================
// Cek overdue (next step lewat dari hari ini)
// =====================
export const isOverdue = (isoDate) => {
  if (!isoDate || isoDate === "-") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(isoDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

// =====================
// Format tanggal
// =====================
const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

export const formatDate = (isoDate) => {
  if (!isoDate || isoDate === "-") return "-";
  const d = new Date(isoDate);
  if (isNaN(d)) return "-";
  const day = dayNames[d.getDay()];
  const date = d.getDate().toString().padStart(2, "0");
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear().toString().slice(-2);
  return `${day}, ${date} ${month} ${year}`;
};

// =====================
// Warna teks status
// =====================
export const statusClass = (statusSingkat = "") => {
  const s = statusSingkat?.toUpperCase?.() ?? "";

  if (s.startsWith("TELE")) return "text-orange-600 font-semibold";
  if (s.startsWith("EMOL")) return "text-purple-600 font-semibold";
  if (s.startsWith("EMFO")) return "text-fuchsia-600 font-semibold";
  if (s.startsWith("TEFO")) return "text-pink-600 font-semibold";
  if (s.startsWith("QUOT")) return "text-blue-600 font-semibold";
  if (s.startsWith("MEET")) return "text-cyan-600 font-semibold";
  if (s.startsWith("PRIO")) return "text-yellow-600 font-bold";
  if (s.startsWith("CUSO")) return "text-lime-700 font-semibold";
  if (s.startsWith("CUPRO")) return "text-emerald-700 font-semibold";
  if (s.startsWith("CUSD")) return "text-green-700 font-semibold";
  if (s.startsWith("CUGR")) return "text-teal-700 font-semibold";
  if (s.startsWith("SELESAI")) return "text-gray-500 font-bold";
  if (s.startsWith("REJE")) return "text-rose-600 font-bold";
  return "text-gray-600";
};

// =====================
// Kompatibilitas lama
// =====================
export const statusColor = statusClass;
