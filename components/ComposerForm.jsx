// components/ComposerForm.jsx — FINAL v2025.10C (Multi-media Upload + Carousel)
"use client";

import { useState } from "react";
import { createDraft, addAsset } from "@/lib/socialService";
import { Loader2, Save, ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ComposerForm({ onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    caption: "",
    tags: "",
    files: [],
  });
  const [loading, setLoading] = useState(false);
  const [uploadedPreviews, setUploadedPreviews] = useState([]);

  // === HANDLE FILES ===
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setForm((f) => ({ ...f, files }));
    setUploadedPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const uploadAllMedia = async (draftId) => {
    if (!form.files.length) return;
    let order = 0;
    for (const file of form.files) {
      const fileName = `${Date.now()}_${order}_${file.name}`;
      const { error } = await supabase.storage
        .from("media")
        .upload(fileName, file, { upsert: false });
      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from("media")
        .getPublicUrl(fileName);

      await addAsset(publicUrl.publicUrl, file.type, draftId, order);
      order++;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1️⃣ Simpan draft dulu
      const draft = await createDraft({
        title: form.title,
        caption: form.caption,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
      });

      // 2️⃣ Upload semua media & link ke draft
      await uploadAllMedia(draft.id);

      alert("Draft & media berhasil disimpan!");
      setForm({ title: "", caption: "", tags: "", files: [] });
      setUploadedPreviews([]);
      if (onSuccess) onSuccess(draft);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan draft.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-800"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Judul Post
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Caption
        </label>
        <textarea
          value={form.caption}
          onChange={(e) => setForm({ ...form, caption: e.target.value })}
          required
          rows={4}
          className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tags (pisahkan dengan koma)
        </label>
        <input
          type="text"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-md px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Upload Media (bisa lebih dari satu)
        </label>
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="text-sm text-gray-500 dark:text-gray-400"
        />

        {uploadedPreviews.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {uploadedPreviews.map((url, i) => (
              <div
                key={i}
                className="relative w-24 h-24 rounded-md border overflow-hidden flex-shrink-0"
              >
                <img
                  src={url}
                  alt={`Preview-${i}`}
                  className="object-cover w-full h-full"
                />
                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-1">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-md transition"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} /> Menyimpan...
            </>
          ) : (
            <>
              <Save size={18} /> Simpan Draft
            </>
          )}
        </button>
      </div>
    </form>
  );
}
