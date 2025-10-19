"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  Loader2, LayoutDashboard, CalendarDays, Filter, RefreshCcw,
  FileDown, FileSpreadsheet, Share2, Mail
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const nf = (n) => new Intl.NumberFormat("id-ID").format(n ?? 0);

export default function OverviewPage({ sharedSnapshot, readOnly = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [period, setPeriod] = useState("week");
  const [kategori, setKategori] = useState("");
  const [sending, setSending] = useState(false);
  const searchParams = useSearchParams();
  const abortRef = useRef(null);
  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

  // 📍 Snapshot init
  useEffect(() => {
    let snap = sharedSnapshot;
    if (!snap) {
      const s = searchParams.get("shared");
      if (s) snap = s;
    }
    if (snap) {
      try {
        const decoded = JSON.parse(atob(snap));
        if (decoded.period) setPeriod(decoded.period);
        if (decoded.kategori !== undefined) setKategori(decoded.kategori);
      } catch (e) {
        console.error("❌ Invalid snapshot:", e);
      }
    }
  }, []);

  // 📊 Fetch data
  useEffect(() => {
    setLoading(true);
    setErrorMsg("");
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;

    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .rpc("get_analytics_summary_v3", {
            period,
            kategori_filter: kategori || null,
          }, { signal: ctrl.signal });

        if (ctrl.signal.aborted) return;
        if (error) throw error;

        setData(data);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error(e);
          setErrorMsg(e.message || "Gagal memuat data");
          setData(null);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [period, kategori]);

  const growth = data?.growth_summary || {};
  const updatesGrowth = calcGrowth(growth.updates_current, growth.updates_prev);

  const updatesByStatus = useMemo(() => data?.updates_by_status || [], [data]);
  const timeline = useMemo(() => data?.updates_timeline || [], [data]);
  const kpiKategori = useMemo(() => data?.kpi_kategori || [], [data]);

  // -------------------- Actions --------------------
  async function handleExportExcel() {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const meta = [
      { Key: "Generated", Value: new Date().toLocaleString("id-ID") },
      { Key: "Period", Value: labelPeriod(period) },
      { Key: "Kategori", Value: kategori || "Semua" },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(meta), "Meta");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiKategori), "KPI Kategori");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(updatesByStatus), "Update Status");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(timeline), "Timeline");
    XLSX.writeFile(wb, `MPlan_Overview_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  async function handleExportPDF() {
    const node = document.getElementById("overview-content");
    const canvas = await html2canvas(node, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    let imgH = (canvas.height * pageW) / canvas.width;

    let y = 0;
    while (y < imgH) {
      pdf.addImage(img, "PNG", 0, -y, pageW, imgH);
      if (y + pageH < imgH) pdf.addPage();
      y += pageH;
    }
    pdf.save(`MPlan_Overview_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  async function handleSendEmail() {
    const email = prompt("Masukkan alamat email tujuan:");
    if (!email) return;
    setSending(true);
    try {
      const element = document.getElementById("overview-content");
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const { error } = await supabase.from("email_queue").insert({
        subject: `[MPlan] Laporan Dashboard Overview (${new Date().toLocaleDateString("id-ID")})`,
        recipient: email,
        body_html: `<p>Snapshot periode <b>${labelPeriod(period)}</b> (${kategori || "Semua Kategori"}).</p><img src="${imgData}" width="800" />`,
        status: "pending",
        created_at: new Date().toISOString(),
      });
      if (error) throw error;

      alert("✅ Snapshot dikirim ke " + email);
    } catch (e) {
      alert("❌ Gagal kirim email: " + (e.message || e));
    } finally {
      setSending(false);
    }
  }

  function handleShareSnapshot() {
    const snapshot = btoa(JSON.stringify({ period, kategori }));
    const url = `${window.location.origin}/overview?shared=${snapshot}`;
    navigator.clipboard.writeText(url);
    alert("✅ Snapshot link disalin:\n" + url);
  }

  // -------------------- Render --------------------
  if (loading) return <Loader />;
  if (errorMsg) return <StateBox text={`Gagal memuat data: ${errorMsg}`} icon="⚠️" />;
  if (!data) return <StateBox text="Tidak ada data untuk ditampilkan." icon="📭" />;

  return (
    <div id="overview-content" className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-indigo-500" />
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="text-gray-500" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            disabled={readOnly}
            className="border rounded-xl p-2 text-sm disabled:opacity-60"
          >
            <option value="day">Harian</option>
            <option value="week">Mingguan</option>
            <option value="month">Bulanan</option>
            <option value="year">Tahunan</option>
          </select>

          <Filter className="text-gray-500" />
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            disabled={readOnly}
            className="border rounded-xl p-2 text-sm disabled:opacity-60"
          >
            <option value="">Semua Kategori</option>
            <option value="BELUM KATEGORI">Belum Kategori</option>
            <option value="KLIEN BARU">Klien Baru</option>
            <option value="LANGGANAN">Langganan</option>
            <option value="KONTRAK">Kontrak</option>
          </select>

          {!readOnly && (
            <div className="flex gap-2 mt-2 md:mt-0 flex-wrap">
              <ActionButton icon={<RefreshCcw size={16} />} label="Refresh" onClick={() => fetchOverview(period, kategori)} />
              <ActionButton icon={<Mail size={16} />} label={sending ? "Mengirim..." : "Email"} onClick={handleSendEmail} disabled={sending} />
              <ActionButton icon={<Share2 size={16} />} label="Share" onClick={handleShareSnapshot} />
              <ActionButton icon={<FileSpreadsheet size={16} />} label="Excel" onClick={handleExportExcel} />
              <ActionButton icon={<FileDown size={16} />} label="PDF" onClick={handleExportPDF} />
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard title="Total Update" value={nf(sum(data?.updates_by_status))} />
        <SummaryCard title="Overdue" value={nf(data?.total_overdue || 0)} highlight />
        <SummaryCard
          title="Growth Update"
          value={updatesGrowth.display}
          pillColor={
            updatesGrowth.positive == null
              ? "bg-gray-200 text-gray-700"
              : updatesGrowth.positive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }
        />
      </div>

      {/* KPI per Kategori */}
      <Section title="KPI Detail per Kategori">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiKategori.length === 0 ? (
            <StateBox text="Belum ada data kategori." />
          ) : (
            kpiKategori.map((k, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                <div className="font-semibold text-indigo-600">{k.kategori}</div>
                <div className="text-sm mt-1">Perusahaan: <b>{nf(k.total_company)}</b></div>
                <div className="text-sm">Total Update: <b>{nf(k.total_update)}</b></div>
              </div>
            ))
          )}
        </div>
      </Section>

      {/* Chart per Status */}
      <Section title="Jumlah Update per Status">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={updatesByStatus}>
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total">
              {updatesByStatus.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {updatesByStatus.length === 0 && <StateBox text="Belum ada update pada periode ini." />}
      </Section>

      {/* Chart Timeline */}
      <Section title={`Aktivitas Update per ${labelPeriod(period)}`}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timeline}>
            <XAxis dataKey="periode_label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total_update" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
        {timeline.length === 0 && <StateBox text="Timeline kosong untuk periode ini." />}
      </Section>
    </div>
  );
}

/* ---------- UI Components ---------- */
function Loader() {
  return (
    <div className="flex justify-center items-center h-64 text-gray-500">
      <Loader2 className="animate-spin mr-2" /> Loading data overview...
    </div>
  );
}

function StateBox({ text, icon = "ℹ️" }) {
  return <div className="w-full text-center text-sm text-gray-500 py-6">{icon} {text}</div>;
}

function SummaryCard({ title, value, highlight, pillColor }) {
  return (
    <div className={`p-4 rounded-2xl shadow-sm border transition-all duration-200 hover:shadow-md ${highlight ? "bg-red-100 text-red-700" : "bg-white text-gray-700 dark:bg-gray-800"}`}>
      <div className="space-y-1">
        <div className="text-sm font-medium">{title}</div>
        <div className={`text-2xl font-bold ${pillColor ? `px-2 py-1 rounded-xl ${pillColor}` : ""}`}>{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">{children}</div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 px-3 py-2 border rounded-xl text-sm hover:bg-indigo-50 transition disabled:opacity-60"
    >
      {icon} {label}
    </button>
  );
}

/* ---------- Helpers ---------- */
function sum(arr) { return arr?.reduce((a, b) => a + Number(b.total || 0), 0) || 0; }
function calcGrowth(current, prev) {
  if (current == null || prev == null) return { display: "N/A", positive: null };
  if (prev === 0) return { display: current === 0 ? "0%" : "N/A", positive: null };
  const diff = ((current - prev) / prev) * 100;
  const percent = `${Math.abs(diff).toFixed(1)}%`;
  return { display: percent, positive: diff >= 0 };
}
function labelPeriod(p) { switch (p) { case "day": return "Hari"; case "week": return "Minggu"; case "month": return "Bulan"; default: return "Tahun"; } }
