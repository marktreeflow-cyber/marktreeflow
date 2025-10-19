// /pages/social/composer.js — FINAL v2025.10B
// ✅ Composer posting real: caption + file upload + schedule
// ✅ Ambil daftar akun dari mplan.social_accounts
// ✅ Upload media ke Supabase Storage (bucket: social-media)
// ✅ Simpan ke mplan.social_posts (status=queued)
// ✅ Validasi ringan + loading state + success toast
// ✅ Dark mode dan mobile friendly

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Upload,
  ImageIcon,
  Video,
  Calendar,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function SocialComposer() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("image");
  const [scheduleAt, setScheduleAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    const { data, error } = await supabase
      .from("mplan.social_accounts")
      .select("id, provider, account_handle, account_external_id");
    if (error) console.error(error);
    else setAccounts(data || []);
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFileType(f.type.startsWith("video") ? "video" : "image");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    if (!selectedAccount || !file) {
      setMessage({ text: "Pilih akun dan unggah media dulu.", type: "error" });
      setSaving(false);
      return;
    }

    try {
      // 1️⃣ Upload ke Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;
      const filePath = `${selectedAccount}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("social-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("social-media").getPublicUrl(filePath);

      // 2️⃣ Insert ke tabel mplan.social_posts
      const { error: insertError } = await supabase
        .from("mplan.social_posts")
        .insert([
          {
            account_id: selectedAccount,
            caption,
            media_type: fileType,
            media_url: publicUrl,
            schedule_at: scheduleAt ? new Date(scheduleAt).toISOString() : null,
            status: "queued",
          },
        ]);

      if (insertError) throw insertError;

      setMessage({ text: "Post berhasil dijadwalkan!", type: "success" });
      setCaption("");
      setFile(null);
      setScheduleAt("");
    } catch (err) {
      console.error("Error submit:", err);
      setMessage({ text: err.message || "Gagal menyimpan post.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/social/accounts"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600"
          >
            <ArrowLeft size={18} />
            Kembali
          </Link>
          <h1 className="text-2xl font-bold">Composer</h1>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Buat post & jadwalkan ke akun sosial yang terhubung.
        </div>
      </header>

      {message.text && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          {message.text}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm"
      >
        {/* Akun */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2">
            Pilih Akun
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700"
            required
          >
            <option value="">-- Pilih Akun --</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.provider.toUpperCase()} • {a.account_handle || a.account_external_id}
              </option>
            ))}
          </select>
        </div>

        {/* Caption */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            placeholder="Tulis caption..."
            className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 resize-none"
          />
        </div>

        {/* Media Upload */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2">
            Upload Media
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 dark:text-gray-300"
          />
          {file && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              {fileType === "video" ? <Video size={18} /> : <ImageIcon size={18} />}
              {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
            <Clock size={16} />
            Jadwal (Opsional)
          </label>
          <input
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full bg-gray-50 dark:bg-gray-700"
          />
          <p className="text-xs text-gray-500 mt-1">
            Biarkan kosong untuk langsung dikirim oleh publisher worker.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-70"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Menyimpan...
              </>
            ) : (
              <>
                <Send size={16} />
                {scheduleAt ? "Jadwalkan" : "Publish Sekarang"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
