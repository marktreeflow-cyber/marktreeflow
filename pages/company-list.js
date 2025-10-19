// pages/company-list.js — FINAL MATCHED v2025.10H
// ✅ UX & struktur identik dengan all-updates.js
// ✅ Data dari mplan.company_with_last_update_v3
// ✅ Tabel utama pakai CompanyTable
// ✅ Auto refresh, filter, export/import aktif

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  getAllCompaniesWithLastUpdate,
  filterUpdatesByCompany,
  filterUpdatesByKategori,
  filterUpdatesByStatus,
  filterUpdatesByChecking,
  filterUpdatesByDateRange,
  filterUpdatesByGlobal,
} from "../lib/companyService";
import FilterBar from "../components/FilterBar";
import CompanyTable from "../components/CompanyTable";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/solid";
import { exportUpdatesCSV } from "@/utils/exportUpdatesCSV";
import { importUpdatesCSV } from "@/utils/importUpdatesCSV";

export default function CompanyList() {
  /** =====================
   * 1️⃣ STATE DASAR
   * ===================== */
  const [raw, setRaw] = useState([]);
  const [filters, setFilters] = useState({
    global: "",
    company: "",
    dateFrom: "",
    dateTo: "",
    kategori: "",
    status: "",
    checking: "",
  });
  const [pageSize, setPageSize] = useState("25");
  const [sortConfig, setSortConfig] = useState({
    key: "last_update_date",
    direction: "desc",
  });
  const [companyOptions, setCompanyOptions] = useState([]);

  /** =====================
   * 2️⃣ FETCH & CACHE DATA
   * ===================== */
  const fetchCompanies = useCallback(async () => {
    try {
      const data = await getAllCompaniesWithLastUpdate(); // ✅ view: mplan.company_with_last_update_v3
      setRaw(data || []);

      // cache nama perusahaan unik untuk AutoSuggest
      const uniqueCompanies = [];
      const map = new Map();
      (data || []).forEach((d) => {
        const name = d.company_name || d.name || "";
        if (name && !map.has(name.toLowerCase())) {
          map.set(name.toLowerCase(), true);
          uniqueCompanies.push({
            company_name: name,
            company_code: d.company_code,
          });
        }
      });
      setCompanyOptions(uniqueCompanies);
    } catch (err) {
      console.error("❌ Gagal fetch data:", err);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  /** =====================
   * 3️⃣ FILTERING
   * ===================== */
  const filtered = useMemo(() => {
    let d = [...raw];
    d = filterUpdatesByGlobal(d, filters.global);
    d = filterUpdatesByCompany(d, filters.company);
    d = filterUpdatesByKategori(d, filters.kategori);
    d = filterUpdatesByStatus(d, filters.status);
    d = filterUpdatesByChecking(d, filters.checking);
    d = filterUpdatesByDateRange(d, filters.dateFrom, filters.dateTo);
    return d;
  }, [raw, filters]);

  /** =====================
   * 4️⃣ SORTING
   * ===================== */
  const dateCols = useMemo(
    () => new Set(["update_date", "last_update_date", "next_date"]),
    []
  );
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { key, direction } = sortConfig;
    if (!key) return arr;

    arr.sort((a, b) => {
      if (dateCols.has(key)) {
        const A = a[key] ? new Date(a[key]).getTime() : 0;
        const B = b[key] ? new Date(b[key]).getTime() : 0;
        return direction === "asc" ? A - B : B - A;
      }
      const A = (a[key] ?? "").toString().toLowerCase();
      const B = (b[key] ?? "").toString().toLowerCase();
      if (A < B) return direction === "asc" ? -1 : 1;
      if (A > B) return direction === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortConfig, dateCols]);

  /** =====================
   * 5️⃣ PAGINATION
   * ===================== */
  const displayData = useMemo(() => {
    if (pageSize === "ALL") return sorted;
    const n = Number(pageSize) || 25;
    return sorted.slice(0, n);
  }, [sorted, pageSize]);

  /** =====================
   * 6️⃣ RESET & HANDLER
   * ===================== */
  const resetAll = useCallback(() => {
    setFilters({
      global: "",
      company: "",
      dateFrom: "",
      dateTo: "",
      kategori: "",
      status: "",
      checking: "",
    });
    setSortConfig({ key: "last_update_date", direction: "desc" });
  }, []);

  const handleSetFilters = useCallback((updater) => {
    setFilters((prev) =>
      typeof updater === "function" ? updater(prev) : { ...prev, ...updater }
    );
  }, []);

  /** =====================
   * 7️⃣ RENDER UI
   * ===================== */
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-app)", color: "var(--text-primary)" }}
    >
      {/* === TOOLBAR === */}
      <div
        className="filterbar-sticky px-4 py-3 border-b"
        style={{ background: "var(--bg-app)" }}
      >
        {/* HEADER TOOLBAR */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-slate-100">
            🏢 Daftar Perusahaan
          </h1>
          <div className="flex gap-2 flex-wrap">
            {/* 🔄 REFRESH */}
            <button
              onClick={fetchCompanies}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-sm"
            >
              🔄 Refresh
            </button>
            {/* 📤 EXPORT */}
            <button
              onClick={() => exportUpdatesCSV(raw, "companies_export.csv")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-sky-700/60 hover:bg-sky-600 text-white text-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> Export
            </button>
            {/* 📥 IMPORT */}
            <button
              onClick={() => importUpdatesCSV(fetchCompanies)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-700/60 hover:bg-amber-600 text-white text-sm"
            >
              <ArrowUpTrayIcon className="w-4 h-4" /> Import
            </button>
          </div>
        </div>

        {/* FILTER BAR */}
        <FilterBar
          filters={filters}
          setFilters={handleSetFilters}
          fetchUpdates={fetchCompanies}
          pageSize={pageSize}
          setPageSize={setPageSize}
          resetAll={resetAll}
          companyOptions={companyOptions}
        />

        <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          Filter aktif: {filters.kategori || "Semua Kategori"} ·{" "}
          {filters.status || "Semua Status"} ·{" "}
          {filters.company || "Semua Perusahaan"} · {displayData.length} data
        </div>
      </div>

      {/* === MAIN TABLE === */}
      <div className="mt-3 px-2 md:px-4">
        <div
          className="w-full border rounded-lg overflow-hidden"
          style={{ background: "var(--bg-table)" }}
        >
          <CompanyTable
            data={displayData}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            onRefresh={fetchCompanies}
            companyOptions={companyOptions}
          />
        </div>
      </div>
    </div>
  );
}
