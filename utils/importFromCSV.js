// utils/importFromCSV.js — FINAL 2025
// 🔹 Fungsi import CSV ke Supabase
// 🔹 Otomatis skip perusahaan yang sudah ada di tabel mplan.companies
// 🔹 Menggunakan PapaParse (harus sudah terinstall di project: npm install papaparse)
import Papa from "papaparse";
import { supabase } from "@/lib/supabaseClient";

export const importFromCSV = async (onFinish = () => {}) => {
  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const parsed = Papa.parse(text, { header: true });
      const rows = parsed.data.filter((r) => r.name || r.company_name);

      if (rows.length === 0) {
        alert("File CSV kosong atau format tidak valid.");
        return;
      }

      // ambil semua perusahaan eksisting
      const { data: existing, error: fetchErr } = await supabase
        .schema("mplan")
        .from("companies")
        .select("name");

      if (fetchErr) throw fetchErr;

      const existingNames = new Set(
        (existing || []).map((x) => (x.name || "").toLowerCase().trim())
      );

      // filter data baru
      const newCompanies = rows
        .map((r) => ({
          name: r.name || r.company_name,
          company_telp: r.company_telp || r.telp || null,
          pic: r.pic || null,
          pic_email: r.pic_email || r.email || null,
          pic_whatsapp: r.pic_whatsapp || r.whatsapp || null,
          kategori: r.kategori || null,
        }))
        .filter((r) => r.name && !existingNames.has(r.name.toLowerCase().trim()));

      if (newCompanies.length === 0) {
        alert("Semua perusahaan di file CSV sudah ada di database.");
        return;
      }

      const { error: insertErr } = await supabase
        .schema("mplan")
        .from("companies")
        .insert(newCompanies);

      if (insertErr) {
        console.error("❌ Gagal import CSV:", insertErr);
        alert("Gagal import CSV.");
      } else {
        alert(`✅ Berhasil import ${newCompanies.length} perusahaan baru.`);
        onFinish(); // refresh tabel
      }
    };

    input.click();
  } catch (err) {
    console.error("❌ Error import CSV:", err);
    alert("Terjadi kesalahan saat import CSV.");
  }
};
