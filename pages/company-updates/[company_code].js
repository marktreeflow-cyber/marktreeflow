// pages/company-updates/[company_code].js — FIX INSERT v2025.10I
// ✅ Tambah update langsung ke tabel mplan.updates (bukan view)
// ✅ Sinkron ke sistem timeline
// ✅ Alert informatif + auto refresh

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import formatDate from "@/utils/formatDate";
import { getStatusBadge } from "@/utils/statusBadge";
import {
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

function StatusBadge({ value }) {
  if (!value) return <span>-</span>;
  return <span className={`status-badge ${getStatusBadge(value)}`}>{value}</span>;
}

export default function CompanyUpdateDetail() {
  const router = useRouter();
  const { company_code } = router.query;

  const [rows, setRows] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [newUpdate, setNewUpdate] = useState("");
  const [saving, setSaving] = useState(false);

  // ================================
  // FETCH HELPERS
  // ================================
  const fetchCompanyInfo = async (code) => {
    const { data, error } = await supabase
      .schema("mplan")
      .from("updates_with_timeline_plus_v3")
      .select(
        "company_code, company_name, kategori, company_telp, pic, pic_email, pic_whatsapp"
      )
      .eq("company_code", code.toUpperCase())
      .order("update_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const fetchUpdates = async (code) => {
    const { data, error } = await supabase
      .schema("mplan")
      .from("updates_with_timeline_plus_v3")
      .select(
        "update_id, company_code, update_notes, update_date, status, next_status, kategori, next_date, checking"
      )
      .eq("company_code", code.toUpperCase())
      .order("update_date", { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const fetchAll = async (code) => {
    setLoading(true);
    try {
      const info = await fetchCompanyInfo(code);
      if (!info) {
        setNotFound(true);
        setCompanyInfo(null);
        setRows([]);
        return;
      }
      setCompanyInfo(info);
      const updates = await fetchUpdates(code);
      setRows(updates || []);
    } catch (e) {
      console.error("fetchAll error:", e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady || !company_code) return;
    fetchAll(company_code);
  }, [router.isReady, company_code]);

  // ================================
  // SORTING
  // ================================
  const [sortConfig, setSortConfig] = useState({
    key: "update_date",
    direction: "desc",
  });

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    const { key, direction } = sortConfig;
    arr.sort((a, b) => {
      const A = a[key] ?? "";
      const B = b[key] ?? "";
      if (key === "update_date" || key === "next_date") {
        const aTime = A ? new Date(A).getTime() : 0;
        const bTime = B ? new Date(B).getTime() : 0;
        return direction === "asc" ? aTime - bTime : bTime - aTime;
      }
      if (A < B) return direction === "asc" ? -1 : 1;
      if (A > B) return direction === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // ================================
  // ADD UPDATE (FIX)
  // ================================
  const addUpdate = async () => {
    if (!newUpdate.trim()) {
      alert("Isi update terlebih dahulu.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .schema("mplan")
        .from("updates")
        .insert([
          {
            company_code: company_code.toUpperCase(),
            update_notes: newUpdate.trim(),
            status: "TELE",
          },
        ]);

      if (error) throw error;
      setNewUpdate("");
      await fetchAll(company_code);
      alert("✅ Update berhasil ditambahkan.");
    } catch (err) {
      console.error("❌ Tambah update gagal:", err);
      alert("Gagal menambah update. Pastikan koneksi & policy Supabase benar.");
    } finally {
      setSaving(false);
    }
  };

  // ================================
  // UI STATES
  // ================================
  if (!router.isReady) return <div className="p-6 text-slate-400">Menyiapkan halaman…</div>;
  if (loading) return <div className="p-6 text-slate-400">Loading…</div>;
  if (notFound)
    return (
      <div className="p-6">
        <button
          onClick={() => router.push("/company-list")}
          className="mb-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          ← Back
        </button>
        <div className="border rounded p-6" style={{ background: "var(--bg-table)" }}>
          <p className="text-lg font-semibold">Data perusahaan tidak ditemukan.</p>
          <p className="text-sm text-slate-400 mt-1">
            Pastikan <code>company_code</code> valid dan view{" "}
            <code>updates_with_timeline_plus_v3</code> bisa diakses.
          </p>
        </div>
      </div>
    );

  // ================================
  // RENDER
  // ================================
  return (
    <div
      className="p-6 min-h-screen"
      style={{ background: "var(--bg-app)", color: "var(--text-primary)" }}
    >
      <button
        onClick={() => router.push("/timeline")}
        className="mb-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
      >
        ← Back
      </button>

      {/* INFO PERUSAHAAN */}
      <div
        className="mb-6 border rounded p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        style={{ background: "var(--bg-table)" }}
      >
        <div>
          <p className="text-2xl font-bold">{companyInfo?.company_name || "-"}</p>
          <p className="mt-1">
            <strong>Kategori:</strong> {companyInfo?.kategori || "-"}
          </p>
          <p className="mt-1">
            <strong>Telepon:</strong> {companyInfo?.company_telp || "-"}
          </p>
        </div>
        <div>
          <p className="mt-1">
            <strong>PIC:</strong> {companyInfo?.pic || "-"}
          </p>
          <p className="mt-1">
            <strong>Email:</strong>{" "}
            {companyInfo?.pic_email ? (
              <a
                href={`mailto:${companyInfo.pic_email}`}
                className="text-blue-500 underline"
              >
                {companyInfo.pic_email}
              </a>
            ) : (
              "-"
            )}
          </p>
          <p className="mt-1">
            <strong>Whatsapp:</strong>{" "}
            {companyInfo?.pic_whatsapp ? (
              <a
                href={`https://wa.me/${companyInfo.pic_whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 underline"
              >
                {companyInfo.pic_whatsapp}
              </a>
            ) : (
              "-"
            )}
          </p>
        </div>
      </div>

      {/* TABLE DESKTOP */}
      <div className="hidden md:block overflow-x-auto border rounded" style={{ background: "var(--bg-table)" }}>
        <table className="min-w-full table-auto border-collapse">
          <thead className="text-sm uppercase bg-gray-800 text-white">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort("update_notes")}>
                Update Terakhir
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort("update_date")}>
                Status Date
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort("status")}>
                Status
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort("next_date")}>
                Next Date
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort("next_status")}>
                Next Status
              </th>
              <th className="px-3 py-2">Checking</th>
              <th className="px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {/* Row tambah */}
            <tr className="bg-gray-900/40">
              <td className="px-3 py-2">+</td>
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  placeholder="Tulis update terbaru…"
                  className="w-full p-1 rounded bg-gray-800 text-white"
                />
              </td>
              <td className="px-3 py-2 text-slate-400">—</td>
              <td className="px-3 py-2 text-slate-400">—</td>
              <td className="px-3 py-2 text-slate-400">—</td>
              <td className="px-3 py-2 text-slate-400">—</td>
              <td className="px-3 py-2">
                <button
                  onClick={addUpdate}
                  disabled={saving}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
                >
                  {saving ? "Saving..." : "Tambah"}
                </button>
              </td>
              <td className="px-3 py-2"></td>
            </tr>

            {sortedRows.map((r, idx) => (
              <tr
                key={r.update_id || idx}
                className={idx === sortedRows.length - 1 ? "" : "border-b border-gray-700"}
              >
                <td className="px-3 py-2">{idx + 1}</td>
                <td className="px-3 py-2">{r.update_notes || "-"}</td>
                <td className="px-3 py-2">{formatDate(r.update_date)}</td>
                <td className="px-3 py-2">
                  <StatusBadge value={r.status} />
                </td>
                <td className="px-3 py-2">{formatDate(r.next_date)}</td>
                <td className="px-3 py-2">
                  <StatusBadge value={r.next_status} />
                </td>
                <td className="px-3 py-2 text-center">
                  {r.checking ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 inline" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 inline" />
                  )}
                </td>
                <td className="px-3 py-2 flex gap-2">
                  <PencilSquareIcon className="h-5 w-5 text-blue-500 cursor-pointer" />
                  <TrashIcon className="h-5 w-5 text-red-500 cursor-pointer" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden flex flex-col gap-3 mt-4">
        <div className="border rounded-md p-3" style={{ background: "var(--bg-table)" }}>
          <input
            type="text"
            value={newUpdate}
            onChange={(e) => setNewUpdate(e.target.value)}
            placeholder="Tulis update terbaru…"
            className="w-full p-2 mb-2 rounded bg-gray-700 text-white"
          />
          <button
            onClick={addUpdate}
            disabled={saving}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            {saving ? "Saving..." : "Tambah"}
          </button>
        </div>

        {sortedRows.map((r, idx) => (
          <div
            key={r.update_id || idx}
            className="border rounded-md p-3"
            style={{ background: "var(--bg-table)" }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">#{idx + 1}</span>
              <StatusBadge value={r.status} />
            </div>
            <p className="text-sm mb-1">{r.update_notes || "-"}</p>
            <p className="text-xs text-gray-300 mb-1">
              Status Date: {formatDate(r.update_date)}
            </p>
            <p className="text-xs mb-1">
              Next: <StatusBadge value={r.next_status} />{" "}
              {r.next_date ? `(${formatDate(r.next_date)})` : ""}
            </p>
            <div className="flex justify-between items-center mt-2">
              {r.checking ? (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              )}
              <div className="flex gap-3">
                <PencilSquareIcon className="h-5 w-5 text-blue-400 cursor-pointer" />
                <TrashIcon className="h-5 w-5 text-red-400 cursor-pointer" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
