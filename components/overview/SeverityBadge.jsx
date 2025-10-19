// /components/overview/SeverityBadge.jsx — v2025.10V
import { SEVERITY_COLORS } from "@/lib/severityUtils";

export default function SeverityBadge({ level = "normal" }) {
  const color = SEVERITY_COLORS[level] || SEVERITY_COLORS.normal;
  const icon =
    level === "critical"
      ? "🚨"
      : level === "warning"
      ? "⚠️"
      : "✅";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {icon} {level}
    </span>
  );
}
