// components/CompanyQuickAdd.jsx — FINAL MATCHED 2025.10H
// ✅ UX & layout identik dengan UpdatesQuickAdd
// ✅ Insert ke mplan.companies
// ✅ Auto reset + auto refresh
// ✅ Auto-suggest nama perusahaan sama seperti UpdatesQuickAdd

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PlusIcon } from "@heroicons/react/24/solid";
import AutoSuggestInput from "./AutoSuggestInput"; // ✅ biar konsisten UX

export default function CompanyQuickAdd({
  onAdded = () => {},
  companyOptions = [],
}) {
  const [form, setForm] = useState({
    kategori: "",
    name: "",
    company_telp: "",
    pic: "",
    pic_email: "",
    pic_whatsapp: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert("Nama perusahaan wajib diisi!");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kategori: form.kategori || "BELUM KATEGORI",
        name: form.name.trim(),
        company_telp: form.company_telp || null,
        pic: form.pic || null,
        pic_email: form.pic_email || null,
        pic_whatsapp: form.pic_whatsapp || null,
      };

      const { error } = await supabase.schema("mplan").from("companies").insert([payload]);
      if (error) throw error;

      // Reset form & refresh data
      setForm({
        kategori: "",
        name: "",
        company_telp: "",
        pic: "",
        pic_email: "",
        pic_whatsapp: "",
      });
      onAdded?.();
    } catch (err) {
      console.error("❌ Gagal tambah perusahaan:", err);
      alert("Gagal menambahkan perusahaan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 mb-2 border border-gray-700 rounded-md bg-gray-900/60">
      <div className="p-3 flex flex-wrap items-center gap-2">
        {/* === Kategori === */}
        <select
          value={form.kategori}
          onChange={(e) => handleChange("kategori", e.target.value)}
          className="min-w-[12rem] p-2 rounded bg-gray-800 border border-gray-700 text-sm"
        >
          <option value="">Kategori…</option>
          <option value="BELUM KATEGORI">BELUM KATEGORI</option>
          <option value="KLIEN BARU">KLIEN BARU</option>
          <option value="LANGGANAN">LANGGANAN</option>
          <option value="KONTRAK">KLIEN KONTRAK</option>
        </select>

        {/* === Nama Perusahaan (AutoSuggest) === */}
        <AutoSuggestInput
          value={form.name}
          onChange={(val) => handleChange("name", val)}
          options={companyOptions}
          placeholder="Nama perusahaan…"
          width="16rem"
        />

        {/* === Telepon, PIC, Email, WA === */}
        <input
          value={form.company_telp}
          onChange={(e) => handleChange("company_telp", e.target.value)}
          placeholder="Telp"
          className="w-40 p-2 rounded bg-gray-800 border border-gray-700 text-sm"
        />
        <input
          value={form.pic}
          onChange={(e) => handleChange("pic", e.target.value)}
          placeholder="PIC"
          className="w-36 p-2 rounded bg-gray-800 border border-gray-700 text-sm"
        />
        <input
          type="email"
          value={form.pic_email}
          onChange={(e) => handleChange("pic_email", e.target.value)}
          placeholder="email@ex.com"
          className="w-60 p-2 rounded bg-gray-800 border border-gray-700 text-sm"
        />
        <input
          value={form.pic_whatsapp}
          onChange={(e) => handleChange("pic_whatsapp", e.target.value)}
          placeholder="62xxxxx"
          className="w-48 p-2 rounded bg-gray-800 border border-gray-700 text-sm"
        />

        {/* === Tombol Tambah === */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-1 px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-60"
          title="Tambah"
        >
          <PlusIcon className="h-4 w-4" /> {saving ? "Menyimpan..." : "Tambah"}
        </button>
      </div>
    </div>
  );
}
