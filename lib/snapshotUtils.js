// /lib/snapshotUtils.js — v2025.10X (Snapshot Cache Helper)

export function listSnapshots() {
  // Ambil semua key yang dimulai dengan "overview_"
  return Object.keys(sessionStorage)
    .filter((k) => k.startsWith("overview_"))
    .map((key) => {
      const item = JSON.parse(sessionStorage.getItem(key) || "null");
      if (!item) return null;
      const size = new Blob([JSON.stringify(item.data)]).size;
      return {
        key,
        sectionKey: key.replace("overview_", ""),
        timestamp: new Date(item.timestamp),
        sizeKB: (size / 1024).toFixed(1),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function restoreSnapshot(sectionKey) {
  const cacheKey = `overview_${sectionKey}`;
  const item = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
  if (!item) return null;
  return item.data;
}

export function clearSnapshots() {
  Object.keys(sessionStorage)
    .filter((k) => k.startsWith("overview_"))
    .forEach((k) => sessionStorage.removeItem(k));
}
