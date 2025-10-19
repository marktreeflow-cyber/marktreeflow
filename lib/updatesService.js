// lib/updatesService.js — v2025.10G
import { supabase } from "@/lib/supabaseClient";

/* -----------------------------
 *  FETCHERS
 * --------------------------- */

// 1) Semua baris update (timeline)
export async function getAllUpdates() {
  // coba di public view dulu
  let { data, error } = await supabase
    .from("updates_with_timeline_plus_v3")
    .select("*")
    .order("update_date", { ascending: false });

  // fallback: schema mplan
  if (error) {
    const r = await supabase
      .schema("mplan")
      .from("updates_with_timeline_plus_v3")
      .select("*")
      .order("update_date", { ascending: false });
    if (r.error) throw r.error;
    return r.data || [];
  }
  return data || [];
}

// 2) Satu baris terakhir per perusahaan (company list mode)
export async function getAllCompaniesWithLastUpdate() {
  // coba di public view dulu
  let { data, error } = await supabase
    .from("company_with_last_update_v3")
    .select("*")
    .order("last_update_date", { ascending: false });

  // fallback: schema mplan
  if (error) {
    const r = await supabase
      .schema("mplan")
      .from("company_with_last_update_v3")
      .select("*")
      .order("last_update_date", { ascending: false });
    if (r.error) throw r.error;
    return r.data || [];
  }
  return data || [];
}

/* -----------------------------
 *  FILTER HELPERS
 * --------------------------- */

const safe = (v) => (v ?? "").toString().toLowerCase();

export function filterUpdatesByGlobal(rows, q) {
  if (!q) return rows;
  const key = q.toString().trim().toLowerCase();
  return rows.filter((r) => {
    return (
      safe(r.company_name || r.name).includes(key) ||
      safe(r.kategori).includes(key) ||
      safe(r.update_notes).includes(key) ||
      safe(r.last_update_notes).includes(key) ||
      safe(r.status_singkat || r.status || r.last_status).includes(key) ||
      safe(r.pic).includes(key) ||
      safe(r.pic_email).includes(key) ||
      safe(r.pic_whatsapp).includes(key)
    );
  });
}

export function filterUpdatesByCompany(rows, company) {
  if (!company) return rows;
  const key = company.toString().trim().toLowerCase();
  return rows.filter(
    (r) =>
      safe(r.company_name || r.name) === key ||
      safe(r.company_name || r.name).includes(key)
  );
}

export function filterUpdatesByKategori(rows, kategori) {
  if (!kategori) return rows;
  const key = kategori.toString().trim().toUpperCase();
  return rows.filter((r) => (r.kategori || "").toUpperCase() === key);
}

export function filterUpdatesByStatus(rows, status) {
  if (!status) return rows;
  const key = status.toString().trim().toUpperCase();
  return rows.filter(
    (r) =>
      (r.status_singkat || r.status || r.last_status || "")
        .toString()
        .toUpperCase() === key
  );
}

export function filterUpdatesByChecking(rows, checking) {
  if (!checking) return rows;
  if (checking === "CHECKLIST") return rows.filter((r) => !!r.checking);
  if (checking === "UNCHECKED") return rows.filter((r) => !r.checking);
  return rows;
}

export function filterUpdatesByDateRange(rows, from, to) {
  if (!from && !to) return rows;

  const toMs = (d) => (d ? new Date(d).getTime() : null);
  const fromTs = toMs(from);
  const toTs = toMs(to);

  return rows.filter((r) => {
    // dukung dua mode tanggal: update_date atau last_update_date
    const baseDate = r.update_date || r.last_update_date;
    const ts = toMs(baseDate);
    if (!ts) return false;
    if (fromTs && ts < fromTs) return false;
    if (toTs && ts > toTs) return false;
    return true;
  });
}
// =======================
// INSERT UPDATE (fix untuk semua page)
// =======================
export async function insertUpdate(payload) {
  try {
    const finalData = {
      ...payload,
      company_code: (payload.company_code || "").toUpperCase(),
      status: payload.status || "TELE",
      created_at: payload.created_at || new Date().toISOString(),
    };

    const { error } = await supabase.schema("mplan").from("updates").insert([finalData]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("❌ insertUpdate error:", err);
    throw err;
  }
}
