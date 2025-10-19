// /lib/exportUtils.js — v2025.10Y (Export Event Logs Helper)

export function exportLogsToCSV(logs) {
  if (!logs?.length) return alert("Tidak ada log untuk diekspor.");

  const headers = Object.keys(logs[0]);
  const rows = [
    headers.join(","),
    ...logs.map((log) =>
      headers.map((key) => `"${(log[key] ?? "").toString().replace(/"/g, '""')}"`).join(",")
    ),
  ];

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `realtime_logs_${new Date().toISOString().slice(0, 19)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportLogsToJSON(logs) {
  if (!logs?.length) return alert("Tidak ada log untuk diekspor.");

  const blob = new Blob([JSON.stringify(logs, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `realtime_logs_${new Date().toISOString().slice(0, 19)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
