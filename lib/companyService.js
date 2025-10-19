// lib/companyService.js — FINAL FIXED v2025.10F
// Ambil data dari view mplan.company_with_last_update_v3
// + Filter helpers untuk CompanyList

import { supabase } from "@/lib/supabaseClient";

/** ===================================
 * 1️⃣ FETCH DATA DARI VIEW PERUSAHAAN
 * =================================== */
export async function getAllCompaniesWithLastUpdate() {
  const { data, error } = await supabase
    .schema("mplan")
    .from("company_with_last_update_v3")
    .select("*")
    .order("last_update_date", { ascending: false });

  if (error) {
    console.error("❌ Gagal fetch company_with_last_update_v3:", error);
    throw error;
  }
  return data || [];
}

/* -------------------- Supabase CRUD -------------------- */

/** Cari perusahaan by keyword (pakai LIKE) */
export async function searchCompanies(keyword) {
  if (!keyword) return [];
  const { data, error } = await supabase
    .from("companies")
    .select("company_code,name,company_telp,pic,pic_email,pic_whatsapp,kategori")
    .ilike("name", `%${keyword}%`)
    .limit(10);

  if (error) {
    console.warn("⚠ searchCompanies error:", error?.message);
    return [];
  }

  return data || [];
}

/** Ambil perusahaan by nama exact */
export async function getCompanyByNameExact(name) {
  if (!name) return null;
  const { data, error } = await supabase
    .from("companies")
    .select("company_code,name,company_telp,pic,pic_email,pic_whatsapp,kategori")
    .eq("name", name)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/** Insert perusahaan baru */
export async function insertCompany({
  name,
  kategori,
  company_telp,
  pic,
  pic_email,
  pic_whatsapp,
}) {
  const payload = { name, kategori, company_telp, pic, pic_email, pic_whatsapp };

  const { data, error } = await supabase
    .from("companies")
    .insert(payload)
    .select("company_code,name")
    .single();

  if (error) throw error;
  return data;
}

/** Insert update baru */
export async function insertUpdate({
  company_code,
  update_notes,
  status = "TELE",
}) {
  const { data, error } = await supabase
    .from("updates")
    .insert({
      company_code,
      update_notes,
      status,
      update_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: "system",
      updated_by: "system",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}


/** ===================================
 * 2️⃣ FILTER HELPERS
 * =================================== */

export function filterUpdatesByGlobal(arr, keyword = "") {
  if (!keyword) return arr;
  const k = keyword.toLowerCase();
  return arr.filter(
    (r) =>
      (r.company_name || "").toLowerCase().includes(k) ||
      (r.name || "").toLowerCase().includes(k) ||
      (r.pic || "").toLowerCase().includes(k) ||
      (r.kategori || "").toLowerCase().includes(k) ||
      (r.last_status || r.status_singkat || "").toLowerCase().includes(k) ||
      (r.update_notes || "").toLowerCase().includes(k)
  );
}

export function filterUpdatesByCompany(arr, company = "") {
  if (!company) return arr;
  const c = company.toLowerCase();
  return arr.filter(
    (r) =>
      (r.company_name || "").toLowerCase().includes(c) ||
      (r.name || "").toLowerCase().includes(c)
  );
}

export function filterUpdatesByKategori(arr, kategori = "") {
  if (!kategori) return arr;
  const k = kategori.toLowerCase();
  return arr.filter((r) => (r.kategori || "").toLowerCase().includes(k));
}

export function filterUpdatesByStatus(arr, status = "") {
  if (!status) return arr;
  const s = status.toLowerCase();
  return arr.filter(
    (r) =>
      (r.last_status || r.status_singkat || "").toLowerCase().includes(s) ||
      (r.next_status || "").toLowerCase().includes(s)
  );
}

export function filterUpdatesByChecking(arr, checking = "") {
  if (!checking) return arr;
  if (checking === "CHECKED") return arr.filter((r) => r.checking === true);
  if (checking === "WARNING") return arr.filter((r) => r.checking === false);
  return arr;
}

export function filterUpdatesByDateRange(arr, from = "", to = "") {
  if (!from && !to) return arr;
  const f = from ? new Date(from) : null;
  const t = to ? new Date(to) : null;

  return arr.filter((r) => {
    const date = new Date(r.update_date || r.last_update_date || r.created_at);
    if (f && date < f) return false;
    if (t && date > t) return false;
    return true;
  });
}
