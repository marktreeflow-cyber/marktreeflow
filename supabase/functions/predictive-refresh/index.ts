// /supabase/functions/predictive-refresh/index.ts — Phase2.25 Integrated
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { db: { schema: "mplan" }, auth: { persistSession: false } }
);

serve(async () => {
  try {
    // 🔹 ambil data cache health
    const { data, error } = await supabase
      .from("analytics_cache_health_v1")
      .select("*");
    if (error || !data) throw error;

    const now = Date.now();
    const staleSections: string[] = [];

    for (const row of data) {
      const avg = Number(row.avg_fetch_ms) || 1000;
      const ttl = Math.min(Math.max(avg * 5, 30_000), 600_000); // 30 s–10 m
      const last = new Date(row.last_fetch).getTime();
      if (now - last > ttl) staleSections.push(row.section_key);
    }

    // 🔹 tulis ke log / panggil webhook n8n / Telegram notifier, dsb.
    console.log("STALE SECTIONS", staleSections);

    // 🔹 simpan hasil prediksi
    await supabase.from("analytics_predicted_ttl").upsert(
      staleSections.map((s) => ({
        section_key: s,
        predicted_ttl_ms: 0,
        refreshed_at: new Date().toISOString(),
      })),
      { onConflict: "section_key" }
    );

    return new Response(
      JSON.stringify({ success: true, stale: staleSections }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ predictive-refresh error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
    });
  }
});
