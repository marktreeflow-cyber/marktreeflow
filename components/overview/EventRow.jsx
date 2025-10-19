// /components/overview/EventRow.jsx — v2025.10V
import SeverityBadge from "./SeverityBadge";
import { determineSeverity } from "@/lib/severityUtils";

export default function EventRow({ event }) {
  const severity = determineSeverity(event);

  return (
    <div
      className={`flex items-start justify-between border-b border-gray-100 dark:border-gray-700 py-2 px-2 rounded-md ${
        severity === "critical"
          ? "bg-red-50 dark:bg-red-900/30"
          : severity === "warning"
          ? "bg-yellow-50 dark:bg-yellow-900/30"
          : ""
      }`}
    >
      <div className="flex flex-col text-sm">
        <span className="font-medium text-gray-800 dark:text-gray-100">
          {event.event_type || "event"}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {event.message}
        </span>
      </div>

      <div className="flex flex-col items-end gap-1">
        <SeverityBadge level={severity} />
        <span className="text-xs text-gray-400">
          {new Date(event.event_time).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
