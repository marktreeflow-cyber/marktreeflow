// /supabase/functions/generate-weekly-report/index.ts — Phase2.28
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://cdn.skypack.dev/pdf-lib@1.17.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { db: { schema: "mplan" }, auth: { persistSession: false } }
);

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

serve(async () => {
  try {
    // 🔹 ambil data weekly summary
    const { data, error } = await supabase
      .from("analytics_weekly_summary_v1")
      .select("*")
      .gte("week_start", new Date(Date.now() - 7 * 86400000).toISOString());
    if (error || !data) throw error;

    // 🧾 buat PDF ringkas
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    page.drawText("Weekly Performance Insight Report", {
      x: 50, y: height - 60, size: 16, font, color: rgb(0, 0.2, 0.6)
    });

    let y = height - 100;
    for (const row of data.slice(0, 30)) {
      const text = `${row.section_key.padEnd(20)} | Fetch: ${Math.round(row.avg_fetch_ms)}ms | Render: ${Math.round(row.avg_render_ms)}ms | Samples: ${row.total_samples}`;
      page.drawText(text, { x: 50, y, size: 10, font });
      y -= 14;
      if (y < 50) break;
    }

    const pdfBytes = await pdfDoc.save();
    const file = new Blob([pdfBytes], { type: "application/pdf" });

    // 📤 kirim via Telegram
    if (BOT_TOKEN && CHAT_ID) {
      const form = new FormData();
      form.append("chat_id", CHAT_ID);
      form.append("document", new File([file], "weekly_report.pdf"));
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
        method: "POST", body: form,
      });
    }

    return new Response(JSON.stringify({ success: true, count: data.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ generate-weekly-report error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
    });
  }
});
