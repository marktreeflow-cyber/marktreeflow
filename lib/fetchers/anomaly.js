// /lib/fetchers/anomaly.js
import { supabase } from "@/lib/supabaseClient";

export async function getAnomalies() {
  const { data, error } = await supabase
    .from("analytics_anomaly_v1")
    .select("*")
    .order("day", { ascending: false });

  if (error) {
    console.error("❌ Anomaly fetch error:", error);
    return [];
  }
  return data || [];
}
