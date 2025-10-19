// /pages/public/overview.js — v2025.10J (Public, strict)
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import OverviewPage from "../overview";

export default function PublicOverview() {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(null);
  const [valid, setValid] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) { setLoading(false); return; }

    (async () => {
      const { data, error } = await supabase
        .from("share_links")
        .select("snapshot, expires_at")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!error && data) { setSnapshot(data.snapshot); setValid(true); }
      setLoading(false);
    })();
  }, [searchParams]);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading link…</div>;
  if (!valid) return <div className="p-10 text-center text-gray-500">⛔ Link tidak valid atau sudah kedaluwarsa.</div>;

  return (
    <div className="p-4">
      <p className="text-center text-sm text-gray-500 mb-4">Mode tampilan publik (read-only)</p>
      <OverviewPage sharedSnapshot={snapshot} readOnly />
    </div>
  );
}
