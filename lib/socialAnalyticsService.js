// /lib/socialAnalyticsService.js — PHASE2.v2025.10A
import { supabase } from "@/lib/supabaseClient";

// 🧭 Wrapper untuk analitik sosial media (TikTok, Instagram, YouTube)
export const SocialAnalyticsService = {
  // 🔹 Ambil summary semua platform
  async getSummary(dateStart, dateEnd, platforms = ["tiktok", "instagram", "youtube"]) {
    const { data, error } = await supabase.rpc("get_social_summary_v1", {
      date_start: dateStart,
      date_end: dateEnd,
      platforms,
    });
    if (error) throw error;
    return data || [];
  },

  // 🔹 Ambil summary satu platform tertentu
  async getByPlatform(platform, dateStart, dateEnd) {
    const { data, error } = await supabase.rpc("get_social_summary_v1", {
      date_start: dateStart,
      date_end: dateEnd,
      platforms: [platform],
    });
    if (error) throw error;
    return data?.[0] || null;
  },
};
