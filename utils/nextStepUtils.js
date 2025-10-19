// utils/nextStepUtils.js
// Fallback penghitungan "next status" kalau view tidak menyediakan next_step
// (non-opinionated, bisa kamu ubah kapan saja)
const NEXT_STEP_MAP = {
  TELE: "TEFO",
  TEFO: "MEET",
  MEET: "QUOT",
  QUOT: "PRIO",
  PRIO: "EMOL",
  EMOL: "EMFO",
  EMFO: "CUSO",
  CUSO: "CUPRO",
  CUPRO: "CUGR",
  CUGR: "SELESAI",
};

export function computeNextStep(statusSingkat) {
  if (!statusSingkat) return "-";
  const key = String(statusSingkat).toUpperCase();
  return NEXT_STEP_MAP[key] ?? "-";
}
