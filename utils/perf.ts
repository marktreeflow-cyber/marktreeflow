// /utils/perf.ts — FINAL v2025.10A (Phase2.24B Integrated)
export type PerfSample = {
  section: string;
  phase: "mount" | "update";
  actualDuration: number;        // waktu render (ms)
  commitTime: number;            // waktu commit React
  fetchMs?: number;              // durasi fetch data
  rows?: number;                 // jumlah data (opsional)
  ts: string;                    // timestamp ISO
};

const store: PerfSample[] = [];
let enabled = true;

// 🔒 simple rate-limit agar tidak spam log ke server
const lastSent: Record<string, number> = {};

export const Perf = {
  enable(v: boolean) {
    enabled = v;
  },

  markFetchStart(key: string) {
    (performance as any).mark?.(`fetch:${key}:start`);
  },

  markFetchEnd(key: string) {
    const start = performance.getEntriesByName(`fetch:${key}:start`).at(-1);
    if (!start) return;
    const dur = performance.now() - (start as PerformanceEntry).startTime;
    (performance as any).clearMarks?.(`fetch:${key}:start`);
    return dur;
  },

  push(sample: PerfSample) {
    if (!enabled) return;

    // simpan di memori lokal
    store.push(sample);

    // tampilkan di console untuk debugging
    if (typeof window !== "undefined" && (window as any).__PERF_LOG__ !== false) {
      console.table([sample]);
    }

    // 🔗 kirim ke Supabase Edge Function log-perf
    // 1 log per section per 1 detik
    if (typeof window === "undefined") return;
    const now = Date.now();
    const last = lastSent[sample.section] || 0;
    if (now - last < 1000) return; // skip kalau baru dikirim <1 detik
    lastSent[sample.section] = now;

    fetch("/functions/v1/log-perf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: sample.section,
        fetchMs: sample.fetchMs ?? null,
        renderMs: sample.actualDuration ?? null,
        rows: sample.rows ?? null,
      }),
    }).catch(() => {
      // silent fail — jangan ganggu UI
    });
  },

  getAll() {
    return store.slice().reverse();
  },
};
