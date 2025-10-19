// /pages/social/analytics.js — FINAL v2025.10C (Engagement + CTR Metrics)
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Loader2, BarChart3 } from "lucide-react";

export default function SocialAnalytics() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    setLoading(true);
    const { data, error } = await supabase
      .from("post_targets")
      .select("platform, views, likes, comments, ctr, engagement_rate, status");
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // --- Agregasi per platform ---
    const grouped = {};
    data.forEach((d) => {
      const p = d.platform || "unknown";
      if (!grouped[p])
        grouped[p] = {
          platform: p,
          posts: 0,
          views: 0,
          likes: 0,
          comments: 0,
          avg_ctr: 0,
          avg_eng: 0,
        };
      grouped[p].posts += 1;
      grouped[p].views += d.views || 0;
      grouped[p].likes += d.likes || 0;
      grouped[p].comments += d.comments || 0;
      grouped[p].avg_ctr += parseFloat(d.ctr || 0);
      grouped[p].avg_eng += parseFloat(d.engagement_rate || 0);
    });

    const metrics = Object.values(grouped).map((m) => ({
      ...m,
      avg_ctr: (m.avg_ctr / m.posts).toFixed(2),
      avg_eng: (m.avg_eng / m.posts).toFixed(2),
    }));

    setMetrics(metrics);
    setLoading(false);
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="animate-spin" size={20} />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 size={20} /> Social Analytics Dashboard
      </h1>

      {/* === RINGKASAN PER PLATFORM === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
          >
            <h2 className="font-bold mb-2 text-gray-800 dark:text-gray-100 capitalize">
              {m.platform}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              📈 {m.posts} posts
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              👀 {m.views.toLocaleString()} views
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              ❤️ {m.likes.toLocaleString()} likes
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              💬 {m.comments.toLocaleString()} comments
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
              CTR: <span className="font-semibold">{m.avg_ctr}%</span> | Engagement:{" "}
              <span className="font-semibold">{m.avg_eng}%</span>
            </p>
          </div>
        ))}
      </div>

      {/* === CHART: Engagement & CTR === */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow">
        <h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
          🔥 Average Engagement & CTR per Platform
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics}>
            <XAxis dataKey="platform" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avg_eng" fill="#10b981" name="Engagement %" />
            <Bar dataKey="avg_ctr" fill="#6366f1" name="CTR %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
