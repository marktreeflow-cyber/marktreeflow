// lib/formatDate.js
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/** Format ke style Indonesia, contoh: "Sen, 29 Sep 25" */
export function formatDateId(value) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d?.getTime())) return "-";
  return format(d, "EEE, dd MMM yy", { locale: idLocale });
}

/** Format pendek: "29 Sep 2025" */
export function formatDateShort(value) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d?.getTime())) return "-";
  return format(d, "dd MMM yyyy", { locale: idLocale });
}

/** Normalisasi ke Date object (atau null) */
export function toDateOrNull(value) {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d?.getTime()) ? null : d;
}

/** Default formatter: style Indonesia singkat */
export default function formatDate(value) {
  return formatDateId(value);
}
