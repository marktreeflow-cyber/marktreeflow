// /supabase/functions/log-perf/index.ts — FINAL v2025.10A (Phase2.24B Integrated)
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// 🧩 Inisialisasi client Supabase
const supabase = createClient(supabaseUrl, serviceKey, {
  db: { schema: "mplan" },
  auth: { persistSession: false },
});

// 🛡️ Rate limiter per section
const limiter = new Map<string, number>();

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();

    const { section, fetchMs, renderMs, rows } = body;
    if (!section) {
      return new Response(JSON.stringify({ error: "Missing section key" }), {
        status: 400,
      });
    }

    // 🕒 Simple limiter: 1 log per section / 1 detik
    const now = Date.now();
    const last = limiter.get(section) || 0;
    if (now - last < 1000) {
      return new Response(JSON.stringify({ message: "Rate limited" }), {
        status: 429,
      });
    }
    limiter.set(section, now);

    // 💾 Insert ke DB
    const { error } = await supabase.from("analytics_perf_logs").insert({
      section_key: section,
      fetch_duration_ms: fetchMs ?? null,
      render_duration_ms: renderMs ?? null,
      rows_count: rows ?? null,
    });

    if (error) {
      console.error("❌ Insert error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("❌ Handler error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});
