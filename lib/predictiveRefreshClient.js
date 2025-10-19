// /lib/predictiveRefreshClient.js
import { supabase } from "@/lib/supabaseClient";
import { useOverviewSync } from "@/contexts/OverviewSyncContext";

// Panggil di layout utama (OverviewModular)
export async function runPredictiveRefresh(triggerRefresh) {
  try {
    const res = await fetch("/functions/v1/predictive-refresh");
    const json = await res.json();
    if (json.success && json.stale?.length) {
      console.log("🔄 Auto-refresh sections:", json.stale);
      json.stale.forEach((s) => triggerRefresh(s));
    }
  } catch (e) {
    console.warn("Predictive refresh failed:", e);
  }
}
