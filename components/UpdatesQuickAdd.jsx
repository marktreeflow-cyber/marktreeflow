import React, { useEffect, useState } from "react";
import {
  PlusIcon,
  Cog6ToothIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import AutoSuggestInput from "./AutoSuggestInput";
import { useToast } from "@/components/ui/use-toast"; // ✅ import toast global

export default function UpdatesQuickAdd({
  newRow,
  setNewRow,
  onCompanyChange,
  addRow,
  saving,
  companyOptions = [],
}) {
  const { toast } = useToast(); // ✅ aktifkan hook toast

  const [highlight, setHighlight] = useState({
    kategori: false,
    company_telp: false,
    pic: false,
    pic_email: false,
    pic_whatsapp: false,
  });

  // ==========================
  //  1️⃣ LOCAL STORAGE OPSI
  // ==========================
  const loadOptions = (key, defaults) => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return Array.isArray(data) && data.length > 0 ? data : defaults;
    } catch {
      return defaults;
    }
  };

  const saveOptions = (key, arr) => {
    localStorage.setItem(key, JSON.stringify(arr));
  };

  const [kategoriOptions, setKategoriOptions] = useState(() =>
    loadOptions("kategoriOptionsStore", [
      "BELUM KATEGORI",
      "KLIEN BARU",
      "LANGGANAN",
      "KLIEN KONTRAK",
    ])
  );

  const [statusOptions, setStatusOptions] = useState(() =>
    loadOptions("statusOptionsStore", [
      "TELE",
      "EMOL",
      "EMFO",
      "TEFO",
      "QUOT",
      "MEET",
      "PRIO",
      "CUSO",
      "CUPRO",
      "CUSD",
      "CUGR",
      "SELESAI",
    ])
  );

  // ==========================
  //  2️⃣ HANDLER STATE DASAR
  // ==========================
  const handleKategoriChange = (e) => {
    const val = e.target.value;
    setNewRow((p) => ({ ...p, kategori: val }));
    if (val) localStorage.setItem("lastKategori", val);
  };

  const handleStatusChange = (e) => {
    const val = e.target.value;
    setNewRow((p) => ({ ...p, status: val }));
  };

  const handleAddRow = async () => {
    if (!newRow.company_name || !newRow.update_notes) {
      toast({
        title: "⚠️ Lengkapi Data",
        description: "Nama perusahaan dan catatan update harus diisi.",
      });
      return;
    }

    if (!newRow.status) {
      toast({
        title: "⚠️ Status Belum Dipilih",
        description: "Pilih status update terlebih dahulu.",
      });
      return;
    }

    if (newRow.kategori) localStorage.setItem("lastKategori", newRow.kategori);

    try {
      await addRow();

      toast({
        title: "✅ Update Ditambahkan",
        description: `${newRow.company_name} berhasil disimpan.`,
      });
    } catch (err) {
      console.error("❌ Gagal menambah update:", err);
      toast({
        title: "❌ Gagal Menambah Data",
        description: "Terjadi kesalahan saat menambah update.",
      });
    }
  };

  // ==========================
  //  3️⃣ MINI EDITOR MODAL
  // ==========================
  const [editMode, setEditMode] = useState(null);
  const [tempList, setTempList] = useState([]);
  const [newItem, setNewItem] = useState("");

  const openEditor = (type) => {
    setEditMode(type);
    setTempList(type === "kategori" ? [...kategoriOptions] : [...statusOptions]);
    setNewItem("");
  };

  const closeEditor = () => setEditMode(null);

  const addItem = () => {
    const val = newItem.trim();
    if (!val) return;
    const list = [...tempList, val.toUpperCase()];
    setTempList(list);
    setNewItem("");
  };

  const editItem = (index, newVal) => {
    const list = [...tempList];
    list[index] = newVal.toUpperCase();
    setTempList(list);
  };

  const deleteItem = (index) => {
    const list = tempList.filter((_, i) => i !== index);
    setTempList(list);
  };

  const saveChanges = () => {
    if (editMode === "kategori") {
      setKategoriOptions(tempList);
      saveOptions("kategoriOptionsStore", tempList);
      toast({ title: "✅ Kategori Diperbarui" });
    } else if (editMode === "status") {
      setStatusOptions(tempList);
      saveOptions("statusOptionsStore", tempList);
      toast({ title: "✅ Status Diperbarui" });
    }
    closeEditor();
  };

  // ==========================
  //  4️⃣ HIGHLIGHT AUTOFILL
  // ==========================
  useEffect(() => {
    const h = {};
    ["kategori", "company_telp", "pic", "pic_email", "pic_whatsapp"].forEach(
      (f) => {
        if (newRow[f] && newRow[f] !== "") h[f] = true;
      }
    );
    if (Object.keys(h).length > 0) {
      setHighlight((prev) => ({ ...prev, ...h }));
      const timer = setTimeout(() => {
        setHighlight({
          kategori: false,
          company_telp: false,
          pic: false,
          pic_email: false,
          pic_whatsapp: false,
        });
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [
    newRow.kategori,
    newRow.company_telp,
    newRow.pic,
    newRow.pic_email,
    newRow.pic_whatsapp,
  ]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (newRow.company_name && newRow.update_notes) handleAddRow();
    }
  };

  // ==========================
  //  5️⃣ UI RENDER
  // ==========================
  return (
    <div className="mt-3 mb-2 border border-gray-700 rounded-md bg-gray-900/60">
      {/* === GLOBAL FIXED MODAL === */}
      {editMode && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-gray-800 p-5 rounded-xl w-[22rem] max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-700">
            <h3 className="text-white font-semibold mb-3 text-lg">
              Edit {editMode === "kategori" ? "Kategori" : "Status"}
            </h3>

            <div className="space-y-2">
              {tempList.map((item, i) => (
                <div
                  key={`${item}-${i}`}
                  className="flex items-center justify-between bg-gray-700 rounded px-2 py-1"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <PencilIcon className="h-4 w-4 text-gray-300/70" />
                    <input
                      value={item}
                      onChange={(e) => editItem(i, e.target.value)}
                      className="bg-transparent text-white text-sm flex-1 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => deleteItem(i)}
                    className="text-red-400 hover:text-red-300 ml-2"
                    title="Hapus opsi"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 mt-3">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Tambah baru..."
                  className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm"
                />
                <button
                  onClick={addItem}
                  className="bg-emerald-600 px-2 py-1 rounded text-white text-sm hover:bg-emerald-500"
                  title="Tambah opsi"
                >
                  <PlusIcon className="h-4 w-4 inline" />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={closeEditor}
                className="bg-gray-600 px-3 py-1.5 rounded text-sm text-white hover:bg-gray-500"
              >
                <XMarkIcon className="h-4 w-4 inline mr-1" /> Batal
              </button>
              <button
                onClick={saveChanges}
                className="bg-emerald-600 px-3 py-1.5 rounded text-sm text-white hover:bg-emerald-500"
              >
                <CheckIcon className="h-4 w-4 inline mr-1" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 flex flex-wrap items-center gap-2">
        {/* === Kategori === */}
        <div className="flex items-center gap-1">
          <select
            value={newRow.kategori || ""}
            onChange={handleKategoriChange}
            className={`min-w-[12rem] p-2 rounded border text-sm ${
              highlight.kategori
                ? "bg-emerald-700/30 border-emerald-500"
                : "bg-gray-800 border-gray-700"
            }`}
          >
            <option value="">Kategori…</option>
            {kategoriOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button
            onClick={() => openEditor("kategori")}
            className="text-gray-400 hover:text-emerald-400"
            title="Edit daftar kategori"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>

        {/* === Nama Perusahaan === */}
        <AutoSuggestInput
          value={newRow.company_name}
          onCommit={onCompanyChange}
          options={companyOptions}
          placeholder="Nama perusahaan…"
          width="16rem"
          onEnterAdd={handleAddRow}
          canAdd={!!newRow.update_notes}
        />

        {/* === Telepon === */}
        <input
          value={newRow.company_telp}
          onChange={(e) =>
            setNewRow((p) => ({ ...p, company_telp: e.target.value }))
          }
          placeholder="Telp"
          className={`w-40 p-2 rounded border text-sm ${
            highlight.company_telp
              ? "bg-emerald-700/30 border-emerald-500"
              : "bg-gray-800 border-gray-700"
          }`}
        />

        {/* === PIC === */}
        <input
          value={newRow.pic}
          onChange={(e) => setNewRow((p) => ({ ...p, pic: e.target.value }))}
          placeholder="PIC"
          className={`w-36 p-2 rounded border text-sm ${
            highlight.pic
              ? "bg-emerald-700/30 border-emerald-500"
              : "bg-gray-800 border-gray-700"
          }`}
        />

        {/* === Email === */}
        <input
          type="email"
          value={newRow.pic_email}
          onChange={(e) =>
            setNewRow((p) => ({ ...p, pic_email: e.target.value }))
          }
          placeholder="email@ex.com"
          className={`w-60 p-2 rounded border text-sm ${
            highlight.pic_email
              ? "bg-emerald-700/30 border-emerald-500"
              : "bg-gray-800 border-gray-700"
          }`}
        />

        {/* === WhatsApp === */}
        <input
          value={newRow.pic_whatsapp}
          onChange={(e) =>
            setNewRow((p) => ({ ...p, pic_whatsapp: e.target.value }))
          }
          placeholder="62xxxxx"
          className={`w-48 p-2 rounded border text-sm ${
            highlight.pic_whatsapp
              ? "bg-emerald-700/30 border-emerald-500"
              : "bg-gray-800 border-gray-700"
          }`}
        />

        {/* === Status Manual === */}
        <div className="flex items-center gap-1">
          <select
            value={newRow.status || ""}
            onChange={handleStatusChange}
            className="min-w-[9rem] p-2 rounded border bg-gray-800 border-gray-700 text-sm text-white"
          >
            <option value="">Pilih Status…</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => openEditor("status")}
            className="text-gray-400 hover:text-emerald-400"
            title="Edit daftar status"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>

        {/* === Update Terakhir === */}
        <input
          value={newRow.update_notes}
          onChange={(e) =>
            setNewRow((p) => ({ ...p, update_notes: e.target.value }))
          }
          onKeyDown={handleKeyDown}
          placeholder="Tulis update terakhir…"
          className="flex-1 min-w-[20rem] p-2 rounded bg-gray-800 border border-gray-700 text-sm"
        />

        {/* === Tombol Tambah === */}
        <button
          onClick={handleAddRow}
          disabled={saving}
          className="inline-flex items-center gap-1 px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-60"
          title="Tambah"
        >
          <PlusIcon className="h-4 w-4" />
          {saving ? "Menyimpan..." : "Tambah"}
        </button>
      </div>
    </div>
  );
}
