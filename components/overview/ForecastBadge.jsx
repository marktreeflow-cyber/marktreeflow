// /components/overview/ForecastBadge.jsx — v2025.10T
export default function ForecastBadge({ value, delta }) {
  const color =
    delta > 0 ? "bg-green-100 text-green-600" : delta < 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600";

  const icon = delta > 0 ? "📈" : delta < 0 ? "📉" : "⚖️";

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {icon} {value} ({delta > 0 ? "+" : ""}
      {delta})
    </div>
  );
}
