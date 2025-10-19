"use client";
export default function GrowthBadge({ percent }) {
  const color =
    percent > 0 ? "text-green-600 bg-green-100"
    : percent < 0 ? "text-red-600 bg-red-100"
    : "text-gray-500 bg-gray-100";
  const icon = percent > 0 ? "▲" : percent < 0 ? "▼" : "▬";
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${color}`}>
      {icon} {percent !== null ? `${percent}%` : "–"}
    </span>
  );
}
