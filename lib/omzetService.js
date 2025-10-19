// /lib/omzetService.js — FINAL v2025.11K
// 🔹 Digunakan oleh halaman omzet-overview & omzet/[kategori]
// 🔹 Lengkap: Trend, Company list, Comparison, Growth, Forecast, dan AI Forecast Merge

import { supabase } from "@/lib/supabaseClient";

export const OmzetService = {
  // 📈 Ambil tren omzet per kategori (per bulan)
  async getTrend(kategori, dateStart, dateEnd) {
    const { data, error } = await supabase.rpc("get_analytics_section_v2", {
      p_section: "summary",
      p_date_start: dateStart,
      p_date_end: dateEnd,
      p_kategori: kategori,
    });
    if (error) console.error("❌ RPC Omzet Trend error:", error);
    return data || [];
  },

  // 🏢 Ambil daftar perusahaan dan omzetnya untuk kategori tertentu
  async getCompanyList(kategori) {
    const { data, error } = await supabase
      .from("revenue_logs")
      .select("company_code, revenue_amount, revenue_month, notes, created_at")
      .eq("kategori", kategori)
      .order("revenue_month", { ascending: false });
    if (error) console.error("❌ Revenue list error:", error);
    return data || [];
  },

  // ⚖️ Ambil data perbandingan omzet antar kategori
  async getComparison(dateStart, dateEnd) {
    const { data, error } = await supabase.rpc("get_analytics_section_v2", {
      p_section: "summary",
      p_date_start: dateStart,
      p_date_end: dateEnd,
      p_kategori: null, // ambil semua kategori
    });
    if (error) console.error("❌ Omzet comparison RPC error:", error);
    return data || [];
  },

  // 📊 Ambil data pertumbuhan omzet bulanan (growth)
  async getGrowth() {
    const { data, error } = await supabase.rpc("get_analytics_growth_v1");
    if (error) console.error("❌ Omzet growth RPC error:", error);
    return data || [];
  },

  // 🔮 Ambil prediksi omzet untuk kategori tertentu
  async getForecast(kategori) {
    const { data, error } = await supabase.rpc("get_analytics_forecast_v1");
    if (error) {
      console.error("❌ Omzet forecast RPC error:", error);
      return [];
    }
    return data.filter((d) => d.kategori === kategori);
  },

  // 🧠 Ambil semua prediksi omzet (semua kategori sekaligus)
  async getForecastAll() {
    const { data, error } = await supabase.rpc("get_analytics_forecast_v1");
    if (error) console.error("❌ Omzet forecast-all RPC error:", error);
    return data || [];
  },

  // 🤖 Ambil hasil AI Forecast Merge (Forecast vs Actual + Anomaly Detection)
  async getAIForecastMerge() {
    const { data, error } = await supabase.rpc("get_analytics_ai_forecast_v1");
    if (error) {
      console.error("❌ AI Forecast Merge RPC error:", error);
      return [];
    }
    return data || [];
  },
};
