// /pages/social/index.js — FINAL v2025.10F (Multi-Platform Support)
"use client";

import { useEffect, useState } from "react";
import {
  getAllTargets,
  deleteSchedule,
  getAllDrafts,
  createSchedule,
  getPostDetail,
} from "@/lib/socialService";
import { startScheduler } from "@/lib/scheduler";
import {
  Loader2,
  Calendar,
  Trash2,
  Clock,
  RefreshCcw,
  PlusCircle,
  Eye,
  X,
  Instagram,
  Youtube,
  Twitter,
  Music,
} from "lucide-react";

// 🧩 ICON MAP
const platformIcons = {
  instagram: <Instagram size={14} className="text-pink-500" />,
  tiktok: <Music size={14} className="text-gray-800 dark:text-gray-200" />,
  twitter: <Twitter size={14} className="text-sky-500" />,
  youtube: <Youtube size={14} className="text-red-500" />,
  facebook: <Calendar size={14} className="text-blue-600" />,
};

const platformColors = {
  instagram: "bg-pink-100 text-pink-700",
  tiktok: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  twitter: "bg-sky-100 text-sky-700",
  youtube: "bg-red-100 text-red-700",
  facebook: "bg-blue-100 text-blue-700",
};

export default function SocialQueue() {
  const [data, setData] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal Schedule
  const [showModal, setShowModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("instagram");
  const [saving, setSaving] = useState(false);

  // Modal Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // === FETCH ===
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getAllTargets();
      setData(res || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrafts = async () => {
    try {
      const res = await getAllDrafts();
      setDrafts(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchDrafts();
  }, []);

  useEffect(() => {
    const intervalFetch = setInterval(fetchData, 30000);
    const intervalScheduler = startScheduler(30000);
    return () => {
      clearInterval(intervalFetch);
      clearInterval(intervalScheduler);
    };
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Yakin mau hapus jadwal ini?")) return;
    await deleteSchedule(id);
    fetchData();
  };

  const handleSaveSchedule = async () => {
    if (!selectedDraft || !scheduleTime) {
      alert("Pilih draft dan waktu tayang terlebih dahulu!");
      return;
    }
    setSaving(true);
    try {
      const newSchedule = {
        draft_id: selectedDraft,
        status: "scheduled",
        scheduled_at: scheduleTime,
        platform: selectedPlatform,
        created_at: new Date().toISOString(),
      };
      await createSchedule(newSchedule);
      setShowModal(false);
      setSelectedDraft("");
      setScheduleTime("");
      setSelectedPlatform("instagram");
      fetchData();
      alert("Jadwal berhasil dibuat!");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan jadwal.");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async (id) => {
    setPreviewLoading(true);
    setShowPreview(true);
    try {
      const res = await getPostDetail(id);
      setPreviewData(res);
    } catch (err) {
      console.error(err);
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Calendar size={20} />
          Social Queue
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md"
          >
            <RefreshCcw size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
          >
            <PlusCircle size={14} /> Schedule Post
          </button>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={18} /> Loading...
        </div>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-gray-500 italic">
          Belum ada posting yang dijadwalkan.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 dark:border-gray-800 rounded-md text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="py-2 px-3">Judul</th>
                <th className="py-2 px-3">Platform</th>
                <th className="py-2 px-3">Jadwal</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const status = item.status;
                const color =
                  status === "draft"
                    ? "bg-gray-200 text-gray-700"
                    : status === "scheduled"
                    ? "bg-blue-200 text-blue-700"
                    : status === "published"
                    ? "bg-green-200 text-green-700"
                    : "bg-red-200 text-red-700";

                return (
                  <tr
                    key={item.id}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td
                      className="py-2 px-3 font-semibold text-indigo-600 cursor-pointer hover:underline"
                      onClick={() => handlePreview(item.id)}
                    >
                      {item.post_drafts?.title || "-"}
                    </td>

                    {/* PLATFORM BADGE */}
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${
                          platformColors[item.platform] ||
                          "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {platformIcons[item.platform] || <Calendar size={12} />}
                        {item.platform || "unknown"}
                      </span>
                    </td>

                    <td className="py-2 px-3 flex flex-col text-gray-700 dark:text-gray-300">
                      {item.scheduled_at ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Clock size={14} />
                            {new Date(item.scheduled_at).toLocaleString("id-ID")}
                          </div>
                          {item.published_at && (
                            <div className="text-xs text-green-600 dark:text-green-400 ml-6">
                              ✔ Published:{" "}
                              {new Date(item.published_at).toLocaleString("id-ID")}
                            </div>
                          )}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}
                      >
                        {status}
                      </span>
                    </td>

                    <td className="py-2 px-3 flex gap-2">
                      <button
                        onClick={() => handlePreview(item.id)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* === MODAL: PREVIEW POST === */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-[500px] relative">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>

            {previewLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 size={18} className="animate-spin" /> Loading...
              </div>
            ) : !previewData ? (
              <p className="text-gray-500">Tidak dapat memuat data.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  {platformIcons[previewData.platform] || <Calendar size={16} />}
                  <h3 className="text-lg font-bold">
                    {previewData.post_drafts?.title || "Tanpa Judul"}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 whitespace-pre-wrap">
                  {previewData.post_drafts?.caption || "-"}
                </p>

                {previewData.assets?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {previewData.assets.map((media, i) => (
                      <div
                        key={i}
                        className="relative rounded-md border overflow-hidden flex-shrink-0"
                      >
                        {media.mime?.startsWith("video/") ? (
                          <video
                            src={media.url}
                            controls
                            className="w-40 h-40 object-cover rounded-md"
                          />
                        ) : (
                          <img
                            src={media.url}
                            alt={`Media-${i}`}
                            className="w-40 h-40 object-cover rounded-md"
                          />
                        )}
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
                          {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Platform:{" "}
                  <span className="font-semibold text-indigo-600">
                    {previewData.platform || "-"}
                  </span>
                  <br />
                  Status:{" "}
                  <span className="font-semibold text-indigo-600">
                    {previewData.status}
                  </span>
                  <br />
                  Jadwal:{" "}
                  {previewData.scheduled_at
                    ? new Date(previewData.scheduled_at).toLocaleString("id-ID")
                    : "-"}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* === MODAL: TAMBAH JADWAL === */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-[400px]">
            <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">
              📅 Buat Jadwal Posting
            </h3>

            <div className="space-y-3">
              {/* Draft Selector */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">
                  Pilih Draft
                </label>
                <select
                  value={selectedDraft}
                  onChange={(e) => setSelectedDraft(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-2 py-2 dark:bg-gray-800"
                >
                  <option value="">-- Pilih Draft --</option>
                  {drafts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title || "Tanpa Judul"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Platform Selector */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">
                  Platform
                </label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-2 py-2 dark:bg-gray-800"
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="youtube">YouTube</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>

              {/* Waktu Tayang */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">
                  Waktu Tayang
                </label>
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-2 py-2 dark:bg-gray-800"
                />
              </div>
            </div>

            {/* Tombol */}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <PlusCircle size={14} /> Simpan Jadwal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
