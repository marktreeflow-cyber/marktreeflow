// /supabase/functions/generate-anomaly-insight/index.ts — v2025.11B
// ✅ Generate AI Insights from Forecast Anomalies (batch insert, robust logging)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiKey = Deno.env.get("OPENAI_API_KEY") || null; // optional

const supabase = createClient(supabaseUrl, serviceKey, {
  db: { schema: "mplan" },
  auth: { persistSession: false },
});

// 🧠 Helper: Generate local AI insight (or OpenAI if key available)
async function generateAIInsight(row: any) {
  const deviationPercent = (
    (row.deviation / (row.predicted_revenue || 1)) *
    100
  ).toFixed(1);

  // 💡 Optional real AI mode (if OPENAI_API_KEY provided)
  if (openaiKey) {
    try {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Kamu adalah analis bisnis yang menjelaskan penyebab anomaly dan memberi rekomendasi taktis.",
            },
            {
              role: "user",
              content: `Data: kategori=${row.kategori}, prediksi=${row.predicted_revenue}, aktual=${row.actual_revenue}, deviasi=${row.deviation}.
                Buat dua paragraf singkat: 1) penyebab mungkin, 2) rekomendasi tindakan.`,
            },
          ],
        }),
      });
      const json = await aiRes.json();
      const text = json.choices?.[0]?.message?.content || "";
      const [summary_ai, recommendation_ai] = text.split("\n").map((t) => t.trim());
      return {
        summary_ai: summary_ai || "Tidak ada insight dari AI.",
        recommendation_ai: recommendation_ai || "Tidak ada rekomendasi.",
        confidence: 0.9,
      };
    } catch (err) {
      console.error("⚠️ OpenAI request failed:", err);
    }
  }

  // 🧩 Local heuristic mode
  const summary_ai =
    row.deviation < 0
      ? `Pendapatan kategori ${row.kategori} turun ${deviationPercent}% dari prediksi. Kemungkinan karena rendahnya aktivitas update status atau approval pelanggan yang tertunda.`
      : `Pendapatan kategori ${row.kategori} naik ${deviationPercent}% di atas prediksi. Kemungkinan karena lonjakan proyek baru atau peningkatan repeat order.`;

  const recommendation_ai =
    row.deviation < 0
      ? "💡 Rekomendasi: follow-up customer TEFO/QUOT minggu ini untuk percepat konversi pipeline."
      : "💡 Rekomendasi: pertahankan strategi dan pastikan stok serta delivery support mencukupi.";

  return { summary_ai, recommendation_ai, confidence: 0.9 };
}

// 🧩 Main handler
serve(async () => {
  const nowIso = new Date().toISOString();

  try {
    // 🔍 Ambil data anomaly forecast
    const { data: anomalies, error } = await supabase
      .from("analytics_ai_forecast_v1")
      .select("*")
      .order("predicted_month", { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!anomalies?.length) {
      console.log("✅ No anomalies found.");
      return new Response(
        JSON.stringify({ success: true, message: "No anomalies found." }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    // 🧠 Generate insights (parallel)
    const insights = await Promise.all(
      anomalies.map(async (row) => {
        const { summary_ai, recommendation_ai, confidence } = await generateAIInsight(row);
        return {
          forecast_id: row.id,
          kategori: row.kategori,
          predicted_month: row.predicted_month,
          summary_ai,
          recommendation_ai,
          confidence,
          run_time: nowIso,
        };
      }),
    );

    // 💾 Simpan batch
    const { error: insertError } = await supabase
      .from("analytics_ai_insights_v1")
      .insert(insights);

    if (insertError) {
      console.error("❌ Gagal simpan log:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { headers: { "Content-Type": "application/json" }, status: 500 },
      );
    }

    console.log(`✅ ${insights.length} insights generated & saved @ ${nowIso}`);
    return new Response(
      JSON.stringify({
        success: true,
        count: insights.length,
        run_time: nowIso,
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("❌ Insight generation failed:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Error generating AI insights",
        error: err.message,
      }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    );
  }
});
