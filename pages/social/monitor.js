// /pages/social/monitor.js — PUBLISH MONITOR v2025.10M
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Loader2,
  RotateCcw,
  ExternalLink,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

const STATUS_COLORS = {
  success: "bg-green-100 text-green-700 border-green-300",
  failed: "bg-rose-100 text-rose-700 border-rose-300",
  scheduled: "bg-blue-100 text-blue-700 border-blue-300",
  running: "bg-amber-100 text-amber-700 border-amber-300",
};

function StatusBadge({ value }) {
  const cls = STATUS_COLORS[value] ?? "bg-gray-100 text-gray-700 border-gray-300";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {value}
    </span>
  );
}

function PlatformBadge({ value }) {
  const map = {
    instagram: "bg-pink-100 text-pink-700 border-pink-300",
    tiktok: "bg-black text-white border-gray-700",
    linkedin: "bg-sky-100 text-sky-700 border-sky-300",
    x: "bg-zinc-100 text-zinc-700 border-zinc-300",
  };
  const cls = map[value] ?? "bg-gray-100 text-gray-700 border-gray-300";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {value}
    </span>
  );
}

export default function PublishMonitor() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState([]);
  const [retrying, setRetrying] = useState(false);

  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel("publish_logs_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "mplan", table: "publish_logs" },
        () => fetchLogs(false)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchLogs(spin = true) {
    try {
      if (spin) setLoading(true);
      let query = supabase
        .from("publish_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (platform !== "all") query = query.eq("platform", platform);
      if (status !== "all") query = query.eq("status", status);
      if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        query = query.lt("created_at", to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const filtered = (data || []).filter((r) => {
        if (!q) return true;
        const needle = q.toLowerCase();
        return (
          (r.account_name || "").toLowerCase().includes(needle) ||
          (r.message || "").toLowerCase().includes(needle) ||
          (r.caption || "").toLowerCase().includes(needle) ||
          (r.posted_url || "").toLowerCase().includes(needle)
        );
      });

      setRows(filtered);
    } catch (e) {
      console.error("fetchLogs error", e);
      alert("Gagal mengambil logs. Cek console.");
    } finally {
      if (spin) setLoading(false);
    }
  }

  async function openDetail(logId) {
    try {
      setOpenId((prev) => (prev === logId ? null : logId));
      if (openId === logId) return;
      const { data, error } = await supabase
        .from("publish_logs_detail")
        .select("*")
        .eq("log_id", logId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setDetails(data || []);
    } catch (e) {
      console.error("openDetail error", e);
      alert("Gagal ambil detail log.");
    }
  }

  async function retry(log) {
    try {
      setRetrying(true);
      const res = await fetch("/functions/v1/publish-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "retry",
          log_id: log.id,
          platform: log.platform,
          account_id: log.account_id,
          account_name: log.account_name,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Retry gagal");
      }
      alert("✅ Retry dikirim. Cek lagi di daftar log beberapa detik lagi.");
    } catch (e) {
      console.error("retry error", e);
      alert("Retry gagal. Cek console untuk detail error.");
    } finally {
      setRetrying(false);
    }
  }

  const empty = !loading && rows.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Publish Monitor</h1>
          <p className="text-sm text-gray-500">Log hasil publish dari Edge Function <code>publish-social</code></p>
        </div>
        <button
          onClick={() => fetchLogs()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
        >
          <Filter className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="col-span-1">
          <label className="text-xs text-gray-500">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full mt-1 rounded-lg border px-3 py-2 bg-white"
          >
            <option value="all">All</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="linkedin">LinkedIn</option>
            <option value="x">X (Twitter)</option>
          </select>
        </div>

        <div className="col-span-1">
          <label className="text-xs text-gray-500">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full mt-1 rounded-lg border px-3 py-2 bg-white"
          >
            <option value="all">All</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="scheduled">scheduled</option>
            <option value="running">running</option>
          </select>
        </div>

        <div className="col-span-1">
          <label className="text-xs text-gray-500">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full mt-1 rounded-lg border px-3 py-2 bg-white"
          />
        </div>
        <div className="col-span-1">
          <label className="text-xs text-gray-500">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full mt-1 rounded-lg border px-3 py-2 bg-white"
          />
        </div>

        <div className="col-span-1">
          <label className="text-xs text-gray-500">Search</label>
          <div className="mt-1 flex items-center gap-2 rounded-lg border bg-white px-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              className="flex-1 py-2 outline-none"
              placeholder="account / message / caption / url"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Time</th>
              <th className="text-left px-4 py-2">Platform</th>
              <th className="text-left px-4 py-2">Account</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Message</th>
              <th className="text-left px-4 py-2">Posted URL</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr>
                <td className="px-4 py-6" colSpan={7}>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading logs…
                  </div>
                </td>
              </tr>
            )}

            {empty && (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={7}>
                  Tidak ada data untuk filter saat ini.
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <PlatformBadge value={r.platform} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.account_name || "-"}</div>
                    <div className="text-xs text-gray-500">{r.account_id || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={r.status} />
                  </td>
                  <td className="px-4 py-3 max-w-[360px]">
                    <div className="line-clamp-2">{r.message || r.caption || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {r.posted_url ? (
                      <a
                        href={r.posted_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetail(r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border hover:bg-gray-50"
                        title="Show steps"
                      >
                        {openId === r.id ? (
                          <>
                            <ChevronDown className="w-4 h-4" /> Detail
                          </>
                        ) : (
                          <>
                            <ChevronRight className="w-4 h-4" /> Detail
                          </>
                        )}
                      </button>

                      <button
                        disabled={retrying || r.status === "success"}
                        onClick={() => retry(r)}
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
                          r.status === "success"
                            ? "text-gray-400 cursor-not-allowed"
                            : "hover:bg-gray-50"
                        }`}
                        title="Retry publish"
                      >
                        {retrying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {openId && (
          <div className="border-t bg-gray-50">
            <div className="px-4 py-2 text-sm font-medium text-gray-700">
              Detail log #{openId}
            </div>
            <div className="max-h-[300px] overflow-auto bg-white">
              {details.length === 0 ? (
                <div className="px-4 py-6 text-gray-500">Tidak ada detail.</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2">Time</th>
                      <th className="text-left px-4 py-2">Step</th>
                      <th className="text-left px-4 py-2">Level</th>
                      <th className="text-left px-4 py-2">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {details.map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {new Date(d.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">{d.step || "-"}</td>
                        <td className="px-4 py-2">
                          <span className="uppercase text-xs px-2 py-0.5 rounded bg-gray-100">
                            {d.level || "info"}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-pre-wrap">
                          {d.message || JSON.stringify(d.meta || {}, null, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
