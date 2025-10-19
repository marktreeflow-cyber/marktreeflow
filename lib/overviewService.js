// /lib/overviewService.js — PHASE2.v2025.10A
import { supabase } from "@/lib/supabaseClient";

// 🧭 Wrapper utama untuk semua RPC analytics di halaman Overview
export const OverviewService = {
  // 🎯 Grafik per section (KPI, Status, Activity)
  async getSection(section, dateStart, dateEnd, kategori = "ALL") {
    const { data, error } = await supabase
      .rpc("get_analytics_section_v1", {
        section,
        date_start: dateStart,
        date_end: dateEnd,
        kategori_filter: kategori,
      });
    if (error) throw error;
    return data || [];
  },

  // 📈 Grafik compare antar status/kategori
  async getCompare(type, keys = [], dateStart, dateEnd, granularity = "month") {
    const { data, error } = await supabase
      .rpc("get_timeseries_compare_v1", {
        type,
        keys,
        date_start: dateStart,
        date_end: dateEnd,
        granularity,
      });
    if (error) throw error;
    return data || [];
  },

  // 🧮 Tabel kategori
  async getTableKategori(dateStart, dateEnd) {
    const { data, error } = await supabase
      .rpc("get_table_kategori_v1", {
        date_start: dateStart,
        date_end: dateEnd,
      });
    if (error) throw error;
    return data || [];
  },

  // 🗂️ Tabel status
  async getTableStatus(dateStart, dateEnd) {
    const { data, error } = await supabase
      .rpc("get_table_status_v1", {
        date_start: dateStart,
        date_end: dateEnd,
      });
    if (error) throw error;
    return data || [];
  },

  // 💰 Grafik revenue
  async getRevenue(dateStart, dateEnd, kategori = "ALL", granularity = "month") {
    const { data, error } = await supabase
      .rpc("get_revenue_timeseries_v1", {
        date_start: dateStart,
        date_end: dateEnd,
        kategori_filter: kategori,
        granularity,
      });
    if (error) throw error;
    return data || [];
  },
};
