// /lib/severityUtils.js — v2025.10V (Severity Logic Helper)

export function determineSeverity(event) {
  const msg = (event.message || "").toLowerCase();

  if (msg.includes("error") || msg.includes("failed")) return "critical";
  if (msg.includes("delay") || msg.includes("warning")) return "warning";
  if (msg.includes("timeout") || msg.includes("slow")) return "warning";
  return "normal";
}

export const SEVERITY_COLORS = {
  normal: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100",
  critical: "bg-red-100 text-red-600 dark:bg-red-700 dark:text-red-100",
};
