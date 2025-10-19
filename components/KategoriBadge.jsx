// components/KategoriBadge.jsx
import { getKategoriBadge } from "@/utils/kategoriBadge";

export default function KategoriBadge({ value, className = "" }) {
  try {
    const cls =
      typeof getKategoriBadge === "function"
        ? getKategoriBadge(value)
        : "bg-gray-600 text-white px-2 py-1 rounded text-xs font-semibold";
    return <span className={`${cls} ${className}`.trim()}>{value || "-"}</span>;
  } catch (err) {
    console.error("KategoriBadge error:", err);
    return (
      <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-semibold">
        {value || "-"}
      </span>
    );
  }
}
