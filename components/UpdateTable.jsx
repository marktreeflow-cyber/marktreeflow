// components/UpdateTable.jsx — FINAL v2025.10Z6 (Full Fix + Toast Notification)
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/solid";
import formatDate from "@/utils/formatDate";
import StatusBadge from "@/components/StatusBadge";
import UpdatesColumnsBar from "./UpdatesColumnsBar";
import UpdatesQuickAdd from "./UpdatesQuickAdd";
import EditUpdateModal from "./EditUpdateModal";
import { useToast } from "@/components/ui/use-toast"; // ✅ Shadcn toast

function getKategoriBadge(k) {
  const key = (k || "").toUpperCase();
  const base =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-white";
  switch (key) {
    case "KLIEN BARU":
      return `${base} bg-amber-600`;
    case "LANGGANAN":
      return `${base} bg-sky-600`;
    case "KONTRAK":
    case "KLIEN KONTRAK":
      return `${base} bg-emerald-600`;
    default:
      return `${base} bg-gray-600`;
  }
}

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

const computeNextStepLocal = (s) => NEXT_RULES[(s || "").toUpperCase()] || "-";

function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

export default function UpdateTable({
  data = [],
  onRefresh = () => {},
  companyOptions = [],
  companiesCache = [],
}) {
  const { toast } = useToast(); // ✅ init toast
  const [newRow, setNewRow] = useState({
    company_name: "",
    kategori: "",
    status: "",
    company_telp: "",
    pic: "",
    pic_email: "",
    pic_whatsapp: "",
    update_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [updateResult, setUpdateResult] = useState(null);
  const [lastAction, setLastAction] = useState(null);

  const handleCompanyChange = (val) => {
    setNewRow((prev) => {
      const found = companiesCache.find(
        (c) => c.company_name?.trim().toLowerCase() === val?.trim().toLowerCase()
      );
      if (!found)
        return {
          ...prev,
          company_name: val,
          kategori: "",
          company_telp: "",
          pic: "",
          pic_email: "",
          pic_whatsapp: "",
        };
      return {
        ...prev,
        company_name: found.company_name,
        kategori: found.kategori || "",
        company_telp: found.company_telp || "",
        pic: found.pic || "",
        pic_email: found.pic_email || "",
        pic_whatsapp: found.pic_whatsapp || "",
      };
    });
  };

  /* === ADD === */
  const addRow = async () => {
    if (!newRow.company_name || !newRow.update_notes) {
      toast({ title: "⚠️ Lengkapi data", description: "Isi nama perusahaan dan catatan update dulu ya." });
      return;
    }
    if (!newRow.status) {
      toast({ title: "⚠️ Status belum dipilih", description: "Pilih status update dulu ya." });
      return;
    }

    const target =
      companiesCache.find(
        (c) =>
          c.company_name?.trim().toLowerCase() ===
          newRow.company_name.trim().toLowerCase()
      ) || {};

    let companyCode = target.company_code;
    if (!companyCode) {
      const { data: fetched } = await supabase
        .schema("mplan")
        .from("companies")
        .select("company_code, name")
        .ilike("name", `%${newRow.company_name.trim()}%`)
        .limit(1)
        .maybeSingle();
      companyCode = fetched?.company_code;
    }

    if (!companyCode) {
      toast({ title: "❌ Gagal", description: "Kode perusahaan tidak ditemukan di database." });
      return;
    }

    const nextManual = computeNextStepLocal(newRow.status);
    const statusDays = {
      TELE: 1,
      EMOL: 1,
      EMFO: 2,
      TEFO: 1,
      QUOT: 1,
      MEET: 2,
      PRIO: 3,
      CUSO: 7,
      CUPRO: 20,
      CUSD: 3,
      CUGR: 25,
      SELESAI: 25,
    };
    const offset = statusDays[newRow.status?.toUpperCase()] || 1;
    const nextDateObj = addBusinessDays(new Date(), offset);
    const nextDateISO = nextDateObj.toISOString().split("T")[0];

    setSaving(true);
    try {
      const { data: res, error } = await supabase
        .schema("mplan")
        .from("updates_with_timeline_editable_v3")
        .insert([
          {
            company_code: companyCode,
            company_name: newRow.company_name,
            kategori: newRow.kategori,
            company_telp: newRow.company_telp,
            pic: newRow.pic,
            pic_email: newRow.pic_email,
            pic_whatsapp: newRow.pic_whatsapp,
            status: newRow.status,
            next_status: nextManual,
            update_date: new Date().toISOString(),
            next_date: nextDateISO,
            update_notes: newRow.update_notes,
          },
        ])
        .select();
      setLastAction("INSERT");
      setUpdateResult({ res, error });
      if (error) throw error;
      toast({ title: "✅ Sukses", description: "Update berhasil ditambahkan!" });
      setNewRow({
        company_name: "",
        kategori: "",
        status: "",
        company_telp: "",
        pic: "",
        pic_email: "",
        pic_whatsapp: "",
        update_notes: "",
      });
      await new Promise((r) => setTimeout(r, 400));
      onRefresh();
    } catch (err) {
      toast({ title: "❌ Gagal menambah update", description: err.message });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  /* === EDIT === */
  const handleEdit = (row) => {
    const cleanRow = Object.fromEntries(
      Object.entries(row || {}).filter(([key]) => key !== "id")
    );
    const safeUpdateId =
      typeof cleanRow.update_id === "string"
        ? cleanRow.update_id
        : String(cleanRow.update_id || "").trim() || null;

    console.log("🧩 handleEdit cleaned >>>", {
      update_id: safeUpdateId,
      raw_has_id: !!row?.id,
      cleaned_keys: Object.keys(cleanRow),
    });

    setEditData({
      ...cleanRow,
      update_id: safeUpdateId,
      company_code: cleanRow.company_code || "",
      update_date: cleanRow.update_date
        ? cleanRow.update_date.substring(0, 10)
        : new Date().toISOString().substring(0, 10),
      next_date: cleanRow.next_date
        ? cleanRow.next_date.substring(0, 10)
        : new Date().toISOString().substring(0, 10),
      next_status: cleanRow.next_status || computeNextStepLocal(cleanRow.status),
    });
    setEditModal(true);
  };

  /* === SAVE EDIT === */
  const handleSaveEdit = async () => {
    if (!editData.update_id) {
      toast({ title: "❌ Gagal", description: "update_id kosong — data tidak bisa disimpan!" });
      return;
    }

    const payload = {
      status: editData.status,
      next_status:
        editData.next_status || computeNextStepLocal(editData.status),
      next_date: editData.next_date,
      update_date: editData.update_date,
      update_notes: editData.update_notes,
      kategori: editData.kategori,
      company_name: editData.company_name,
      company_telp: editData.company_telp,
      pic: editData.pic,
      pic_email: editData.pic_email,
      pic_whatsapp: editData.pic_whatsapp,
    };

    try {
      const { data: res, error } = await supabase
        .schema("mplan")
        .from("updates_with_timeline_editable_v3")
        .update(payload)
        .eq("update_id", editData.update_id)
        .select();

      setLastAction("UPDATE");
      setUpdateResult({ payload, res, error });
      if (error) throw error;
      toast({ title: "✅ Sukses", description: "Data berhasil diperbarui!" });
      setEditModal(false);
      await new Promise((r) => setTimeout(r, 400));
      onRefresh();
    } catch (error) {
      toast({ title: "❌ Gagal update", description: error.message });
      console.error("❌ Gagal update:", error);
    }
  };

  /* === DELETE === */
  const handleDelete = async (row) => {
    if (!confirm(`Hapus update untuk ${row.company_name}?`)) return;
    const { error } = await supabase
      .schema("mplan")
      .from("updates_with_timeline_editable_v3")
      .delete()
      .eq("update_id", row.update_id);
    setLastAction("DELETE");
    setUpdateResult({ error });
    if (error)
      toast({ title: "❌ Gagal hapus data", description: error.message });
    else toast({ title: "🗑️ Terhapus", description: `${row.company_name}` });
    await new Promise((r) => setTimeout(r, 400));
    onRefresh();
  };

  return (
    <div className="w-full">
      <UpdatesQuickAdd
        newRow={newRow}
        setNewRow={setNewRow}
        onCompanyChange={handleCompanyChange}
        addRow={addRow}
        saving={saving}
        companyOptions={companyOptions}
      />

      <div className="relative w-full border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px] md:min-w-[1600px]">
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 260px)" }}
            >
              <UpdatesColumnsBar onSort={() => {}} getSortIcon={() => ""} />
              <table className="update-table min-w-full table-fixed border-collapse">
                <tbody className="text-sm">
                  {data.map((row, i) => (
                    <tr
                      key={row.update_id || `${row.company_code}-${i}`}
                      className="border-t border-slate-700/40 hover:bg-[var(--bg-hover)]"
                    >
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">
                        <span className={getKategoriBadge(row.kategori)}>
                          {row.kategori || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-blue-400 hover:underline">
                        {row.company_name || "-"}
                      </td>
                      <td className="px-3 py-2">{row.company_telp || "-"}</td>
                      <td className="px-3 py-2">{row.pic || "-"}</td>
                      <td className="px-3 py-2">{row.pic_email || "-"}</td>
                      <td className="px-3 py-2">{row.pic_whatsapp || "-"}</td>
                      <td className="px-3 py-2">{row.update_notes || "-"}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {formatDate(row.update_date)}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold">
                        <StatusBadge value={row.status} />
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {formatDate(row.next_date)}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold">
                        <StatusBadge value={row.next_status} />
                      </td>
                      <td className="px-3 py-2 flex gap-2">
                        <button
                          onClick={() => handleEdit(row)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {editModal && (
        <EditUpdateModal
          editData={editData}
          setEditData={setEditData}
          onSave={handleSaveEdit}
          onClose={() => setEditModal(false)}
        />
      )}

      {process.env.NODE_ENV === "development" && (
        <div className="mt-3 bg-slate-800 text-green-400 text-xs p-3 rounded shadow-inner max-h-[240px] overflow-y-auto">
          <p className="font-semibold text-green-300">🧠 DEBUG PANEL</p>
          <p>Last Action: {lastAction || "-"}</p>
          <p>update_id: {editData?.update_id || "-"}</p>
          <p>company_code: {editData?.company_code || "-"}</p>
          <pre className="mt-2 text-[10px] whitespace-pre-wrap">
            {JSON.stringify(updateResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
