// components/CompanyTable.jsx — FINAL v2025.10G
// ✅ Sinkron penuh dengan UpdateTable.jsx
// ✅ Tambah Perusahaan (CompanyQuickAdd) di atas tabel
// ✅ Style, struktur, dan fungsi sama seperti UpdateTable
// ✅ Auto refresh setelah tambah/edit/delete

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import formatDate from "@/utils/formatDate";
import {
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import CompanyColumnsBar from "./CompanyColumnsBar";
import { companyColumns } from "@/utils/columnsUtils";
import StatusBadge from "@/components/StatusBadge";
import CompanyQuickAdd from "./CompanyQuickAdd"; // ✅ Form Tambah Perusahaan di atas tabel

/* === BADGE KATEGORI === */
function getKategoriBadge(k) {
  const key = (k || "").toUpperCase();
  switch (key) {
    case "KLIEN BARU":
      return "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-600 text-white";
    case "LANGGANAN":
      return "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-sky-600 text-white";
    case "KONTRAK":
    case "KLIEN KONTRAK":
      return "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-600 text-white";
    default:
      return "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-600 text-white";
  }
}

/* === NEXT STATUS FALLBACK === */
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

/* === ICON CHECKING === */
const CheckingIcon = ({ val }) => {
  if (val === true)
    return (
      <CheckCircleIcon
        className="w-5 h-5 text-green-500 mx-auto"
        title="Checklist"
      />
    );
  if (val === false)
    return (
      <ExclamationTriangleIcon
        className="w-5 h-5 text-yellow-400 mx-auto"
        title="Warning"
      />
    );
  return <span className="text-slate-500 text-xs">-</span>;
};

export default function CompanyTable({
  data = [],
  sortConfig,
  setSortConfig,
  onRefresh,
}) {
  const [loading, setLoading] = useState(false);

  // === NORMALISASI DATA ===
  const rows = useMemo(() => {
    return (data || []).map((d) => ({
      ...d,
      update_date: d.update_date || d.last_update_date || null,
      status_singkat: d.status_singkat || d.last_status || "-",
      next_status:
        d.next_status ||
        d.next_step ||
        computeNextStepLocal(d.last_status),
      checking:
        d.checking ??
        (d.next_date ? new Date(d.next_date) >= new Date() : null),
    }));
  }, [data]);

  // === SORTING ===
  const handleSort = (label) => {
    const key = companyColumns.sortableKeys[label];
    if (!key) return;
    let direction = "asc";
    if (sortConfig?.key === key && sortConfig?.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const getSortIcon = (label) => {
    const key = companyColumns.sortableKeys[label];
    if (!key) return "";
    if (sortConfig?.key !== key) return "⇅";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  // === EDIT ===
  const handleEdit = async (row) => {
    const current = row.name ?? row.company_name ?? "";
    const newName = prompt("Ubah nama perusahaan:", current);
    if (!newName || newName === current) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .schema("mplan")
        .from("companies")
        .update({ name: newName })
        .eq("company_code", row.company_code);
      if (error) throw error;
      onRefresh?.();
    } catch (e) {
      console.error("Edit error:", e);
      alert("❌ Gagal mengubah nama perusahaan.");
    } finally {
      setLoading(false);
    }
  };

  // === DELETE ===
  const handleDelete = async (code, name) => {
    if (!confirm(`Hapus perusahaan "${name}"?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .schema("mplan")
        .from("companies")
        .delete()
        .eq("company_code", code);
      if (error) throw error;
      onRefresh?.();
    } catch (e) {
      console.error("Delete error:", e);
      alert("❌ Gagal menghapus perusahaan.");
    } finally {
      setLoading(false);
    }
  };

  // === EMPTY STATE ===
  if (!rows.length) {
    return (
      <div className="w-full border rounded-md">
        <div className="p-6 text-center text-slate-400">
          Tidak ada data perusahaan.
        </div>
      </div>
    );
  }

  // === RENDER ===
  return (
    <div className="w-full">
      {/* ✅ Form Tambah Perusahaan */}
      <CompanyQuickAdd onAdded={onRefresh} />

      <div className="relative w-full border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1100px] md:min-w-[1550px]">
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 260px)" }}
            >
              {/* === HEADER === */}
              <div className="sticky top-0 z-30">
                <CompanyColumnsBar
                  headers={companyColumns.headers}
                  colWidths={companyColumns.widths}
                  sortConfig={sortConfig}
                  setSortConfig={setSortConfig}
                  sortKeyByHeader={companyColumns.sortableKeys}
                  onSort={handleSort}
                  getSortIcon={getSortIcon}
                />
              </div>

              {/* === TABLE BODY === */}
              <table className="company-table min-w-full table-fixed border-collapse">
                <colgroup>
                  {companyColumns.widths.map((w, i) => (
                    <col key={i} style={{ width: w }} />
                  ))}
                </colgroup>
                <thead className="sr-only">
                  <tr>
                    {companyColumns.headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>

                <tbody className="text-sm">
                  {rows.map((r, i) => (
                    <tr
                      key={r.company_code}
                      className="border-t border-slate-700/40 hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">
                        <span className={getKategoriBadge(r.kategori)}>
                          {r.kategori || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/company-updates/${r.company_code}`}
                          className="text-blue-400 hover:underline"
                        >
                          {r.name ?? r.company_name ?? "-"}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{r.company_telp || "-"}</td>
                      <td className="px-3 py-2">{r.pic || "-"}</td>
                      <td className="px-3 py-2">{r.pic_email || "-"}</td>
                      <td className="px-3 py-2">{r.pic_whatsapp || "-"}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {formatDate(r.update_date)}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold">
                        <StatusBadge value={r.status_singkat} />
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {formatDate(r.next_date)}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold">
                        <StatusBadge value={r.next_status} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <CheckingIcon val={r.checking} />
                      </td>
                      <td className="px-3 py-2 flex gap-2 bg-transparent">
                        <button
                          onClick={() => handleEdit(r)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Edit"
                          disabled={loading}
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(
                              r.company_code,
                              r.name ?? r.company_name ?? ""
                            )
                          }
                          className="text-red-500 hover:text-red-400"
                          title="Hapus"
                          disabled={loading}
                        >
                          <TrashIcon className="w-4 h-4" />
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
    </div>
  );
}
