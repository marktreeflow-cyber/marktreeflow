// /lib/fetchers/perfTimeline.js
import { supabase } from "@/lib/supabaseClient";

export async function getPerfTimeline(sectionKeys = []) {
  const { data, error } = await supabase
    .from("analytics_perf_timeline_v1")
    .select("*")
    .in("section_key", sectionKeys)
    .order("day", { ascending: true });

  if (error) {
    console.error("❌ Perf timeline fetch error:", error);
    return [];
  }
  return data || [];
}
