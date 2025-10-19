// components/EditUpdateModal.jsx — FINAL v2025.10Z2 (Safe ID Sync + Fix Hidden ID + Full Compatibility)
import React, { useEffect, useRef } from "react";
import { XMarkIcon, CheckIcon } from "@heroicons/react/24/solid";

export default function EditUpdateModal({ editData, setEditData, onSave, onClose }) {
  const modalRef = useRef(null);

  // ✅ Tutup modal dengan Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // ✅ Tutup modal kalau klik di luar box
  const handleClickOutside = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  // ✅ Normalisasi update_id jadi string (supaya gak jadi angka)
  useEffect(() => {
    if (editData?.update_id && typeof editData.update_id !== "string") {
      setEditData((prev) => ({
        ...prev,
        update_id: String(prev.update_id),
      }));
    }
  }, [editData, setEditData]);

  if (!editData) return null;

  const NEXT_RULES = {
    TELE: "EMOL",
    EMOL: "EMFO",
    EMFO: "TEFO",
    TEFO: "QUOT",
    QUOT: "MEET",
    MEET: "PRIO",
    PRIO: "CUSO",
    CUSO: "CUPRO",
    CUPRO: "CUSD",
    CUSD: "CUGR",
    CUGR: "SELESAI",
    SELESAI: "TELE",
  };

  // 🔍 Debug realtime ID
  console.log("🧠 [EditUpdateModal] editData:", editData);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onMouseDown={handleClickOutside}
    >
      <div
        ref={modalRef}
        className="bg-slate-900 rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto shadow-xl border border-slate-700"
      >
        <h2 className="text-lg font-semibold mb-4 text-white">
          ✏️ Edit Data Perusahaan & Update
        </h2>

        {/* === Identifiers (read-only) === */}
        <div className="text-xs text-slate-400 mb-4 space-y-1">
          <p>🆔 update_id: <span className="text-green-400">{editData.update_id}</span></p>
          <p>🏢 company_code: <span className="text-sky-400">{editData.company_code}</span></p>
        </div>

        {/* === FORM === */}
        <div className="space-y-3 text-sm text-white">
          {/* Kategori */}
          <div>
            <label className="block mb-1 text-slate-300">Kategori</label>
            <select
              value={editData.kategori || ""}
              onChange={(e) =>
                setEditData({ ...editData, kategori: e.target.value })
              }
              className="w-full bg-slate-800 text-white px-2 py-1 rounded"
            >
              <option value="">Pilih...</option>
              <option value="BELUM KATEGORI">BELUM KATEGORI</option>
              <option value="KLIEN BARU">KLIEN BARU</option>
              <option value="LANGGANAN">LANGGANAN</option>
              <option value="KONTRAK">KONTRAK</option>
            </select>
          </div>

          {/* Company fields */}
          {[
            ["Nama Perusahaan", "company_name", "text"],
            ["Telepon", "company_telp", "text"],
            ["PIC", "pic", "text"],
            ["Email", "pic_email", "email"],
            ["WhatsApp", "pic_whatsapp", "text"],
          ].map(([label, key, type]) => (
            <div key={key}>
              <label className="block mb-1 text-slate-300">{label}</label>
              <input
                type={type}
                value={editData[key] || ""}
                onChange={(e) =>
                  setEditData({ ...editData, [key]: e.target.value })
                }
                className="w-full bg-slate-800 text-white px-2 py-1 rounded"
              />
            </div>
          ))}

          {/* === UPDATE SECTION === */}
          <div className="mt-3 border-t border-slate-700 pt-3">
            <label className="block mb-1 text-slate-300">Status</label>
            <select
              value={editData.status || ""}
              onChange={(e) =>
                setEditData({ ...editData, status: e.target.value })
              }
              className="w-full bg-slate-800 text-white px-2 py-1 rounded"
            >
              {Object.keys(NEXT_RULES).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          {/* Status Date */}
          <div>
            <label className="block mb-1 text-slate-300">Status Date</label>
            <input
              type="date"
              value={editData.update_date || ""}
              onChange={(e) =>
                setEditData({ ...editData, update_date: e.target.value })
              }
              className="w-full bg-slate-800 text-white px-2 py-1 rounded"
            />
          </div>

          {/* Next Date */}
          <div>
            <label className="block mb-1 text-slate-300">Next Date</label>
            <input
              type="date"
              value={editData.next_date || ""}
              onChange={(e) =>
                setEditData({ ...editData, next_date: e.target.value })
              }
              className="w-full bg-slate-800 text-white px-2 py-1 rounded"
            />
          </div>

          {/* Next Status */}
          <div>
            <label className="block mb-1 text-slate-300">Next Status</label>
            <input
              type="text"
              value={editData.next_status || ""}
              onChange={(e) =>
                setEditData({ ...editData, next_status: e.target.value })
              }
              className="w-full bg-slate-800 text-white px-2 py-1 rounded"
            />
          </div>

          {/* Update Notes */}
          <div>
            <label className="block mb-1 text-slate-300">Update Notes</label>
            <textarea
              rows="3"
              value={editData.update_notes || ""}
              onChange={(e) =>
                setEditData({ ...editData, update_notes: e.target.value })
              }
              className="w-full bg-slate-800 text-white px-2 py-1 rounded"
            />
          </div>
        </div>

        {/* === BUTTONS === */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex items-center gap-1 bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded"
          >
            <XMarkIcon className="h-4 w-4" /> Batal
          </button>
          <button
            onClick={() => {
              console.log("💾 Saving ID:", editData.update_id);
              onSave();
            }}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded"
          >
            <CheckIcon className="h-4 w-4" /> Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
