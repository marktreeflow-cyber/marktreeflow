// /pages/social/accounts.js — FINAL v2025.10A
// ✅ List akun terhubung (mplan.social_accounts)
// ✅ Tombol Connect Instagram/TikTok/YouTube/X → /api/oauth/{provider}/start (Bearer token)
// ✅ Disconnect (hapus row) + refresh list
// ✅ UI responsif + dark mode, pakai Tailwind
// ✅ Safe handling: redirect manual dari fetch Location header
// ✅ Badges provider + status token (expired/ok/none)

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Instagram,
  Youtube,
  Twitter,
  Music2,
  PlugZap,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const PROVIDERS = [
  { key: "instagram", label: "Instagram", Icon: Instagram, color: "bg-pink-600" },
  { key: "tiktok", label: "TikTok", Icon: Music2, color: "bg-neutral-900" },
  { key: "youtube", label: "YouTube", Icon: Youtube, color: "bg-red-600" },
  { key: "x", label: "X (Twitter)", Icon: Twitter, color: "bg-black" },
];

function ProviderBadge({ provider }) {
  const P =
    PROVIDERS.find((p) => p.key === provider) || {
      label: provider,
      color: "bg-gray-600",
      Icon: ShieldCheck,
    };
  return (
    <span className={`inline-flex items-center gap-1 ${P.color} text-white px-2 py-1 rounded-md text-xs`}>
      <P.Icon size={14} />
      {P.label}
    </span>
  );
}

function TokenStatus({ expiresAt }) {
  if (!expiresAt) {
    // beberapa provider token long-lived / no expiry (atau disimpan null)
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-600 text-white px-2 py-1 rounded-md text-xs">
        <ShieldCheck size={14} /> Active
      </span>
    );
  }
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const isExpired = exp <= now;
  const inHours = Math.round((exp - now) / 36e5);

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 bg-rose-600 text-white px-2 py-1 rounded-md text-xs">
        <ShieldAlert size={14} /> Expired
      </span>
    );
  }
  const hint =
    inHours > 48 ? `${Math.floor(inHours / 24)}d` : `${inHours}h`;
  return (
    <span className="inline-flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded-md text-xs">
      <ShieldCheck size={14} /> Expires in {hint}
    </span>
  );
}

export default function SocialAccountsPage() {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState("");
  const [disconnecting, setDisconnecting] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("mplan.social_accounts")
        .select("id, provider, account_handle, account_external_id, token_expires_at, created_at, updated_at, meta")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (e) {
      console.error("fetchAccounts error:", e);
      setError(e.message || "Gagal memuat akun.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleConnect = async (provider) => {
    setConnecting(provider);
    setError("");
    try {
      // Ambil access_token user untuk dipakai sebagai Bearer ke API route
      const { data: sessionData, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw sErr;
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Tidak ada sesi login. Silakan login ulang.");

      // Kita panggil /api/oauth/{provider}/start dengan Authorization header dan redirect manual
      const res = await fetch(`/api/oauth/${provider}/start?redirect_to=${encodeURIComponent(window.location.href)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        redirect: "manual",
      });

      // API route akan mengembalikan 302 Redirect ke Authorization URL.
      // Karena fetch() tidak auto-follow untuk 'manual', kita baca Location:
      if (res.status === 302 || res.status === 301) {
        const authUrl = res.headers.get("Location");
        if (!authUrl) throw new Error("Gagal mengambil authorization URL.");
        window.location.href = authUrl; // pindah ke halaman OAuth provider
        return;
      }

      // Beberapa env akan mengembalikan 200 dengan body redirect URL (fallback)
      if (res.ok) {
        const maybeJson = await res.json().catch(() => null);
        if (maybeJson?.url) {
          window.location.href = maybeJson.url;
          return;
        }
      }

      throw new Error("Tidak bisa memulai proses OAuth. Cek server logs.");
    } catch (e) {
      console.error("handleConnect error:", e);
      setError(e.message || "Gagal menghubungkan akun.");
    } finally {
      setConnecting("");
    }
  };

  const handleDisconnect = async (id) => {
    setDisconnecting(id);
    setError("");
    try {
      const { error } = await supabase.from("mplan.social_accounts").delete().eq("id", id);
      if (error) throw error;
      await fetchAccounts();
    } catch (e) {
      console.error("disconnect error:", e);
      setError(e.message || "Gagal memutuskan akun.");
    } finally {
      setDisconnecting("");
    }
  };

  const connectedByProvider = useMemo(() => {
    const map = {};
    for (const a of accounts) {
      map[a.provider] = (map[a.provider] || 0) + 1;
    }
    return map;
  }, [accounts]);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Social Accounts</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Hubungkan akun Instagram, TikTok, YouTube, dan X untuk publish & tarik metrik asli.
          </p>
        </div>
        <Link
          href="/social/composer"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          <PlugZap size={16} />
          Buka Composer
        </Link>
      </header>

      {/* Kartu Connect */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PROVIDERS.map(({ key, label, Icon, color }) => {
          const count = connectedByProvider[key] || 0;
          return (
            <div
              key={key}
              className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${color}`}>
                  <Icon className="text-white" size={20} />
                </div>
                <div>
                  <div className="font-semibold">{label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{count} connected</div>
                </div>
              </div>
              <button
                onClick={() => handleConnect(key)}
                disabled={!!connecting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 bg-gray-900 text-white hover:bg-black disabled:opacity-60"
              >
                {connecting === key ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                {connecting === key ? "Connecting..." : "Connect"}
              </button>
            </div>
          );
        })}
      </section>

      {/* Error Bar */}
      {error && (
        <div className="mb-4 rounded-lg bg-rose-600 text-white px-4 py-3">
          {error}
        </div>
      )}

      {/* Tabel Akun */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="font-semibold">Akun Terhubung</div>
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-4 py-3 w-[40px]">#</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Handle</th>
                <th className="px-4 py-3">External ID</th>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Connected</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 w-[140px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              )}

              {!loading && accounts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    Belum ada akun terhubung. Klik <b>Connect</b> di atas.
                  </td>
                </tr>
              )}

              {!loading &&
                accounts.map((acc, idx) => (
                  <tr
                    key={acc.id}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/60 dark:hover:bg-gray-700/30"
                  >
                    <td className="px-4 py-3 align-top">{idx + 1}</td>
                    <td className="px-4 py-3 align-top">
                      <ProviderBadge provider={acc.provider} />
                    </td>
                    <td className="px-4 py-3 align-top">{acc.account_handle || "-"}</td>
                    <td className="px-4 py-3 align-top font-mono">{acc.account_external_id || "-"}</td>
                    <td className="px-4 py-3 align-top">
                      <TokenStatus expiresAt={acc.token_expires_at} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      {acc.created_at ? new Date(acc.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {acc.updated_at ? new Date(acc.updated_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        {/* (Opsional) Tombol refresh token bisa ditambahkan jika provider mendukung explicit refresh */}
                        <button
                          onClick={() => handleDisconnect(acc.id)}
                          disabled={disconnecting === acc.id}
                          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                          title="Disconnect"
                        >
                          {disconnecting === acc.id ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <LogOut size={16} />
                          )}
                          {disconnecting === acc.id ? "Memutus..." : "Disconnect"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
