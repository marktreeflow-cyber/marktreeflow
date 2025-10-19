// /components/overview/FilterSheet.jsx — PHASE2.4.v2025.10A
"use client";
import { useState } from "react";
import { X } from "lucide-react";

export default function FilterSheet({ open, onClose, filter, onApply }) {
  const [local, setLocal] = useState(filter);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-end z-50">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl p-6 shadow-lg animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Filter Data</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Tanggal Awal</label>
            <input
              type="date"
              value={local.dateStart}
              onChange={(e) => setLocal({ ...local, dateStart: e.target.value })}
              className="w-full border rounded-lg p-2 mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Tanggal Akhir</label>
            <input
              type="date"
              value={local.dateEnd}
              onChange={(e) => setLocal({ ...local, dateEnd: e.target.value })}
              className="w-full border rounded-lg p-2 mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Kategori</label>
            <select
              value={local.kategori}
              onChange={(e) => setLocal({ ...local, kategori: e.target.value })}
              className="w-full border rounded-lg p-2 mt-1"
            >
              <option value="ALL">Semua</option>
              <option value="BELUM KATEGORI">Belum Kategori</option>
              <option value="KLIEN BARU">Klien Baru</option>
              <option value="LANGGANAN">Langganan</option>
              <option value="KONTRAK">Kontrak</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            onClick={() => {
              onApply(local);
              onClose();
            }}
            className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
