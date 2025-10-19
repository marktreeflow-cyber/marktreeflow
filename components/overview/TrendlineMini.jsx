// /components/overview/TrendlineMini.jsx — v2025.10T (Smart Trendline)
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

export default function TrendlineMini({ sectionKey }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState(null);

  // 🔁 Ambil data per menit dari analytics_activity_v1
  async function fetchData() {
    setLoading(true);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("analytics_activity_v1")
      .select("*")
      .eq("section_key", sectionKey)
      .gte("minute_bucket", twoHoursAgo)
      .order("minute_bucket", { ascending: true });

    if (!error && data) {
      setData(data);
      const nextPred = predictNext(data);
      setForecast(nextPred);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // refresh tiap 1 menit
    return () => clearInterval(interval);
  }, [sectionKey]);

  // 📈 Forecast sederhana: moving average 5 titik terakhir
  function predictNext(list, window = 5) {
    if (!list?.length) return 0;
    const slice = list.slice(-window);
    const avg = slice.reduce((sum, d) => sum + d.event_count, 0) / slice.length;
    return Math.round(avg);
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="animate-spin text-gray-400" size={18} />
      </div>
    );

  if (!data.length)
    return (
      <div className="text-center text-gray-400 text-sm py-2">
        No recent activity
      </div>
    );

  // 📊 Format data untuk chart
  const lastValue = data[data.length - 1]?.event_count ?? 0;
  const delta = forecast ? forecast - lastValue : 0;
  const deltaColor = delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-gray-400";

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>📈 Aktivitas (2 jam terakhir)</span>
        {forecast !== null && (
          <span className={`font-medium ${deltaColor}`}>
            Next: {forecast} ({delta > 0 ? "+" : ""}
            {delta})
          </span>
        )}
      </div>

      <div className="h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="event_count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
