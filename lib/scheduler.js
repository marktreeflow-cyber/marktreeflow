// /lib/scheduler.js — FINAL v2025.10B (Engagement Simulation)
import { supabase } from "@/lib/supabaseClient";

/**
 * Simulasi cron job otomatis publish + isi metrik engagement
 */
export async function runSchedulerOnce() {
  console.log("🕒 [Scheduler] Checking for due posts...");
  const now = new Date().toISOString();

  const { data: duePosts, error } = await supabase
    .from("post_targets")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now);

  if (error) {
    console.error("❌ Scheduler error:", error.message);
    return;
  }
  if (!duePosts || duePosts.length === 0) return;

  for (const post of duePosts) {
    // 🎯 Simulasikan performa berdasarkan platform
    const base =
      post.platform === "instagram"
        ? { v: 1000, l: 150, c: 25 }
        : post.platform === "tiktok"
        ? { v: 3000, l: 350, c: 80 }
        : post.platform === "twitter"
        ? { v: 800, l: 70, c: 10 }
        : post.platform === "youtube"
        ? { v: 5000, l: 400, c: 60 }
        : { v: 600, l: 50, c: 5 };

    // Buat angka random tapi realistis
    const views = Math.round(base.v + Math.random() * base.v * 0.5);
    const likes = Math.round(base.l + Math.random() * base.l * 0.6);
    const comments = Math.round(base.c + Math.random() * base.c * 0.8);
    const ctr = (Math.random() * 5 + 1).toFixed(2); // 1–6%
    const engagement_rate = ((likes + comments) / views * 100).toFixed(2);

    const { error: updateErr } = await supabase
      .from("post_targets")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        views,
        likes,
        comments,
        ctr,
        engagement_rate,
      })
      .eq("id", post.id);

    if (updateErr) console.error(`❌ Gagal update ${post.id}:`, updateErr.message);
    else
      console.log(
        `✅ Published ${post.id} (${post.platform}) — ${views} views, ${likes} likes, ${comments} comments`
      );
  }
}

export function startScheduler(intervalMs = 30000) {
  console.log(`🚀 Scheduler aktif (cek setiap ${intervalMs / 1000} detik)...`);
  runSchedulerOnce();
  return setInterval(runSchedulerOnce, intervalMs);
}
