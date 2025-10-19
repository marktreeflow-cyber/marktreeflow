// pages/timeline.js — FINAL FIX v2025.10L (company_code & autofill guaranteed)
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  getAllUpdates,
  getAllCompaniesWithLastUpdate,
  filterUpdatesByCompany,
  filterUpdatesByKategori,
  filterUpdatesByStatus,
  filterUpdatesByChecking,
  filterUpdatesByDateRange,
  filterUpdatesByGlobal,
} from "../lib/updatesService";
import FilterBar from "../components/FilterBar";
import UpdateTable from "../components/UpdateTable";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/solid";
import { exportUpdatesCSV } from "@/utils/exportUpdatesCSV";
import { importUpdatesCSV } from "@/utils/importUpdatesCSV";
import { supabase } from "@/lib/supabaseClient";

export default function Timeline() {
  /** =====================
   * 1️⃣ STATE DASAR
   * ===================== */
  const [mode, setMode] = useState("updates"); // "updates" | "companies"
  const [raw, setRaw] = useState([]);
  const [countUpdates, setCountUpdates] = useState(0);
  const [countCompanies, setCountCompanies] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(Date.now());
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
    key: "update_date",
    direction: "desc",
  });
  const [companyOptions, setCompanyOptions] = useState([]);

  /** =====================
   * 2️⃣ FETCH & CACHE DATA
   * ===================== */
  const fetchUpdates = useCallback(async () => {
    try {
      const data =
        mode === "updates"
          ? await getAllUpdates()
          : await getAllCompaniesWithLastUpdate();

      setRaw(data || []);
      if (mode === "updates") setCountUpdates(data?.length || 0);
      if (mode === "companies") setCountCompanies(data?.length || 0);

      // reset unread saat refresh
      setUnreadCount(0);
      setLastFetchTime(Date.now());

      // cache nama perusahaan + detail (autofill)
      const uniqueCompanies = [];
      const map = new Map();

      (data || []).forEach((d) => {
        const name = (d.company_name || d.name || "").trim();
        const normalizedName = name.toLowerCase();

        // pastikan company_code dan nama valid
        if (name && d.company_code && !map.has(normalizedName)) {
          map.set(normalizedName, true);
          uniqueCompanies.push({
            company_code: d.company_code, // ✅ WAJIB ADA
            company_name: name,
            kategori: d.kategori || "",
            company_telp: d.company_telp || "",
            pic: d.pic || "",
            pic_email: d.pic_email || "",
            pic_whatsapp: d.pic_whatsapp || "",
          });
        }
      });

      setCompanyOptions(uniqueCompanies);

      // Debug dev log (hapus saat production)
      console.log("✅ [TIMELINE] Company Cache Loaded:", uniqueCompanies.length);
    } catch (err) {
      console.error("❌ Gagal fetch data:", err);
    }
  }, [mode]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  /** =====================
   * 3️⃣ REALTIME LISTENER (INSERT → unreadCount++)
   * ===================== */
  useEffect(() => {
    if (mode !== "updates") return;

    const channel = supabase
      .channel("updates-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "mplan", table: "updates" },
        (payload) => {
          const createdAt = new Date(payload.new?.created_at).getTime();
          if (createdAt > lastFetchTime) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, lastFetchTime]);

  /** =====================
   * 4️⃣ FILTERING
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
   * 5️⃣ SORTING + PAGINATION
   * ===================== */
  const dateCols = useMemo(
    () => new Set(["update_date", "next_date", "last_update_date"]),
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
    setSortConfig({ key: "update_date", direction: "desc" });
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
            {mode === "updates"
              ? "🧾 Timeline Semua Update"
              : "🏢 Timeline Terakhir per Perusahaan"}
          </h1>

          <div className="flex gap-2 flex-wrap items-center">
            {/* TOGGLE MODE */}
            <button
              onClick={() =>
                setMode((m) => (m === "updates" ? "companies" : "updates"))
              }
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-md text-white text-sm font-medium transition-all ${
                mode === "updates"
                  ? "bg-purple-700/60 hover:bg-purple-600"
                  : "bg-indigo-700/60 hover:bg-indigo-600"
              }`}
            >
              {mode === "updates" ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    🏢 <span>Company List</span>
                  </span>
                  <span className="ml-1 bg-slate-800/60 px-2 py-0.5 rounded text-xs text-slate-200">
                    {countCompanies.toLocaleString()}
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1">
                    🧾 <span>Semua Update</span>
                  </span>
                  <span className="ml-1 bg-slate-800/60 px-2 py-0.5 rounded text-xs text-slate-200">
                    {countUpdates.toLocaleString()}
                  </span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full h-4 w-4 shadow-md">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </>
              )}
            </button>

            {/* REFRESH */}
            <button
              onClick={fetchUpdates}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-sm"
            >
              🔄 Refresh
            </button>

            {/* EXPORT */}
            <button
              onClick={() => exportUpdatesCSV(raw, "updates_export.csv")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-sky-700/60 hover:bg-sky-600 text-white text-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> Export
            </button>

            {/* IMPORT */}
            <button
              onClick={() => importUpdatesCSV(fetchUpdates)}
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
          fetchUpdates={fetchUpdates}
          pageSize={pageSize}
          setPageSize={setPageSize}
          resetAll={resetAll}
          companyOptions={companyOptions}
        />

        <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          Mode: {mode === "updates" ? "Semua Update" : "Company List"} ·{" "}
          {filters.kategori || "Semua Kategori"} ·{" "}
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
          <UpdateTable
            data={displayData}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            onRefresh={fetchUpdates}
            companyOptions={companyOptions}
            companiesCache={companyOptions} // ✅ kirim company_code lengkap
          />
        </div>
      </div>
    </div>
  );
}
