// utils/importUpdatesCSV.js — FINAL 2025
// 🔹 Import update data ke mplan.updates
// 🔹 Skip duplikat berdasarkan kombinasi (company_name + update_date + status_asli)
import Papa from "papaparse";
import { supabase } from "@/lib/supabaseClient";

export const importUpdatesCSV = async (onFinish = () => {}) => {
  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const parsed = Papa.parse(text, { header: true });
      const rows = parsed.data.filter((r) => r.company_name && r.status_asli);

      if (rows.length === 0) {
        alert("File CSV kosong atau format tidak valid.");
        return;
      }

      // ambil semua update eksisting
      const { data: existing, error: fetchErr } = await supabase
        .schema("mplan")
        .from("updates")
        .select("company_name, update_date, status_asli");

      if (fetchErr) throw fetchErr;

      const existingKeys = new Set(
        (existing || []).map(
          (x) =>
            `${(x.company_name || "").toLowerCase().trim()}_${x.update_date}_${(
              x.status_asli || ""
            ).toLowerCase()}`
        )
      );

      // siapkan baris baru (skip duplikat)
      const newUpdates = rows
        .map((r) => ({
          company_name: r.company_name,
          company_code: r.company_code || null,
          kategori: r.kategori || null,
          update_date: r.update_date || new Date().toISOString().slice(0, 10),
          update_notes: r.update_notes || null,
          status_asli: r.status_asli || null,
          status_singkat: r.status_singkat || null,
          next_date: r.next_date || null,
          next_status: r.next_status || null,
          pic: r.pic || null,
          pic_email: r.pic_email || null,
          pic_whatsapp: r.pic_whatsapp || null,
        }))
        .filter(
          (r) =>
            r.company_name &&
            !existingKeys.has(
              `${r.company_name.toLowerCase().trim()}_${r.update_date}_${
                (r.status_asli || "").toLowerCase()
              }`
            )
        );

      if (newUpdates.length === 0) {
        alert("Semua baris di CSV sudah ada di database.");
        return;
      }

      const { error: insertErr } = await supabase
        .schema("mplan")
        .from("updates")
        .insert(newUpdates);

      if (insertErr) {
        console.error("❌ Gagal import CSV:", insertErr);
        alert("Gagal import CSV.");
      } else {
        alert(`✅ Berhasil import ${newUpdates.length} update baru.`);
        onFinish();
      }
    };

    input.click();
  } catch (err) {
    console.error("❌ Error import CSV:", err);
    alert("Terjadi kesalahan saat import CSV.");
  }
};
