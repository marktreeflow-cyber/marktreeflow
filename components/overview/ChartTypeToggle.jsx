// /components/overview/ChartTypeToggle.jsx
"use client";
export default function ChartTypeToggle({ chartType, onChange }) {
  return (
    <div className="flex justify-end gap-2 mt-2">
      <button
        onClick={() => onChange("bar")}
        className={`px-3 py-1 text-xs rounded-lg ${chartType === "bar" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
      >
        Bar
      </button>
      <button
        onClick={() => onChange("line")}
        className={`px-3 py-1 text-xs rounded-lg ${chartType === "line" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
      >
        Line
      </button>
    </div>
  );
}
