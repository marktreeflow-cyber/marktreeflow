// /lib/socialService.js — FINAL v2025.10F
import { supabase } from "@/lib/supabaseClient";

/* ================================
   🎯 DRAFTS
================================ */
export async function getAllDrafts() {
  const { data, error } = await supabase
    .from("post_drafts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createDraft(draft) {
  const { data, error } = await supabase
    .from("post_drafts")
    .insert([draft])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDraft(id, updates) {
  const { data, error } = await supabase
    .from("post_drafts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDraft(id) {
  const { error } = await supabase.from("post_drafts").delete().eq("id", id);
  if (error) throw error;
}

/* ================================
   🗓️ SCHEDULE / TARGETS
================================ */
export async function getAllTargets() {
  const { data, error } = await supabase
    .from("post_targets")
    .select(
      `
      *,
      post_drafts (id, title, caption)
    `
    )
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data;
}

// ✅ Sekarang mendukung field platform (Instagram, TikTok, dst)
export async function createSchedule(schedule) {
  const { data, error } = await supabase
    .from("post_targets")
    .insert([schedule])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSchedule(id) {
  const { error } = await supabase.from("post_targets").delete().eq("id", id);
  if (error) throw error;
}

/* ================================
   👁️ PREVIEW DETAIL POST
================================ */
export async function getPostDetail(targetId) {
  const { data, error } = await supabase
    .from("post_targets")
    .select(
      `
      *,
      post_drafts (id, title, caption),
      post_draft_assets (
        order_index,
        assets (id, url, mime)
      )
    `
    )
    .eq("id", targetId)
    .single();

  if (error) throw error;

  // Flatten & sort asset list biar tampil urut
  const assets =
    data?.post_draft_assets
      ?.map((p) => ({
        ...p.assets,
        order_index: p.order_index || 0,
      }))
      .filter(Boolean)
      .sort((a, b) => a.order_index - b.order_index) || [];

  return { ...data, assets };
}

/* ================================
   📷 ASSETS MANAGEMENT
================================ */
export async function addAsset(fileUrl, mime, draftId, orderIndex = 0) {
  // 1️⃣ simpan ke tabel assets
  const { data: asset, error } = await supabase
    .from("assets")
    .insert([{ url: fileUrl, mime }])
    .select()
    .single();
  if (error) throw error;

  // 2️⃣ hubungkan dengan draft + urutan
  if (draftId) {
    const { error: linkErr } = await supabase
      .from("post_draft_assets")
      .insert([{ draft_id: draftId, asset_id: asset.id, order_index: orderIndex }]);
    if (linkErr) throw linkErr;
  }

  return asset;
}

/* ================================
   🚀 PUBLISH JOBS (Simulasi)
================================ */
export async function getPendingJobs() {
  const { data, error } = await supabase
    .from("publish_jobs")
    .select("*")
    .eq("status", "queued")
    .lte("run_at", new Date().toISOString());
  if (error) throw error;
  return data;
}

export async function markJobDone(id, result = {}) {
  const { error } = await supabase
    .from("publish_jobs")
    .update({
      status: "success",
      last_error: result.error || null,
    })
    .eq("id", id);
  if (error) throw error;
}
