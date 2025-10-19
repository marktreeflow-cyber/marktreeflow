import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { db: { schema: "mplan" }, auth: { persistSession: false } }
);

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

serve(async () => {
  const { data, error } = await supabase
    .from("analytics_anomaly_v1")
    .select("*")
    .gte("day", new Date(Date.now() - 86400000).toISOString()); // 1 hari terakhir

  if (error || !data) return new Response("No data", { status: 200 });

  const anomalies = data.filter(
    (r) => r.fetch_anomaly || r.render_anomaly
  );

  if (anomalies.length && BOT_TOKEN && CHAT_ID) {
    const text =
      `🚨 *Performance Alert!*\n` +
      anomalies
        .map(
          (r) =>
            `• ${r.section_key}: Fetch ${Math.round(
              r.avg_fetch_ms
            )}ms (baseline ${Math.round(r.baseline_fetch)}ms)`
        )
        .join("\n");

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" }),
    });
  }

  return new Response("OK", { status: 200 });
});
