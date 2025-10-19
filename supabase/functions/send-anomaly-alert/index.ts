// ✅ v2025.11N — Realtime Anomaly Alert → Telegram + Logging System
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔹 Supabase setup
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { db: { schema: "mplan" } }
);

// 🔹 Environment vars
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

serve(async () => {
  const now = new Date().toISOString();

  // 1️⃣ Ambil data anomaly dari RPC
  const { data, error } = await supabase.rpc("get_anomaly_alert_v1");
  if (error)
    return new Response(`RPC error: ${error.message}`, { status: 500 });

  if (!data?.length)
    return new Response("✅ No anomalies detected.", { status: 200 });

  let sentCount = 0;

  for (const row of data) {
    const msg =
      `${row.alert_message}\n\n📊 Prediksi : Rp ${Number(
        row.predicted_revenue
      ).toLocaleString()}` +
      `\n💰 Aktual   : Rp ${Number(row.actual_revenue).toLocaleString()}` +
      `\n📈 Akurasi  : ${row.accuracy_percent?.toFixed(1)}%` +
      `\n\n🔗 Dashboard: https://mplan.yourdomain.com/omzet-overview`;

    // 2️⃣ Kirim ke Telegram
    let status = "pending";
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg }),
        }
      );

      if (res.ok) {
        status = "sent";
        sentCount++;
      } else {
        status = "failed";
      }
    } catch (e) {
      status = "failed";
    }

    // 3️⃣ Simpan log ke tabel anomaly_alert_logs
    const { error: logError } = await supabase
      .from("anomaly_alert_logs")
      .insert([
        {
          kategori: row.kategori,
          predicted_month: row.predicted_month,
          predicted_revenue: row.predicted_revenue,
          actual_revenue: row.actual_revenue,
          deviation: row.deviation,
          accuracy_percent: row.accuracy_percent,
          alert_message: row.alert_message,
          alert_status: status,
          created_at: now,
        },
      ]);

    if (logError) {
      console.error("❌ Failed to log anomaly:", logError.message);
    }
  }

  return new Response(
    `🚨 ${sentCount}/${data.length} anomaly alerts logged & sent.`,
    { status: 200 }
  );
});
