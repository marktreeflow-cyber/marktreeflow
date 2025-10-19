import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// 🎨 Warna chart untuk dark mode
const COLORS = [
  "#00C49F",
  "#0088FE",
  "#FFBB28",
  "#FF8042",
  "#AA66CC",
  "#33B5E5",
  "#FF4444",
  "#2BBBAD",
];

// 🔧 Helper format waktu
const formatDateTime = () => {
  const d = new Date();
  return d.toLocaleString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState({});
  const [dailyTrend, setDailyTrend] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [topCompanies, setTopCompanies] = useState([]);
  const [lastRefresh, setLastRefresh] = useState("");

  // 🧠 Fetch data dari Supabase
  const fetchAnalytics = async () => {
    try {
      const { data: summaryData } = await supabase
        .from("analytics_summary")
        .select("*")
        .single();

      const { data: trendData } = await supabase
        .from("daily_update_stats")
        .select("*")
        .order("update_date", { ascending: true });

      const { data: statusData } = await supabase
        .from("status_distribution")
        .select("*");

      const { data: topData } = await supabase
        .from("top_active_companies")
        .select("*");

      setSummary(summaryData || {});
      setDailyTrend(trendData || []);
      setStatusDistribution(statusData || []);
      setTopCompanies(topData || []);
      setLastRefresh(formatDateTime());
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    setLastRefresh(formatDateTime());
  }, []);

  // 🎨 UI utama
  return (
    <div style={{ padding: "20px", color: "var(--foreground)", background: "var(--background)" }}>
      <h2 style={{ fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
        📊 Analytics Dashboard
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <Card>
          <CardContent>
            <h3>Total Perusahaan</h3>
            <p style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {summary.total_companies || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3>Total Updates</h3>
            <p style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {summary.total_updates || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* === Chart Section === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        {/* Pie Chart */}
        <Card>
          <CardContent>
            <h3>Distribusi Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {statusDistribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Chart */}
        <Card>
          <CardContent>
            <h3>Aktivitas Harian</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyTrend}>
                <XAxis dataKey="update_date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_updates" fill="#36A2EB" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* === Top Companies Chart === */}
      <div style={{ marginTop: "1rem" }}>
        <Card>
          <CardContent>
            <h3>🏢 Top 5 Perusahaan Aktif</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topCompanies}>
                <XAxis dataKey="company_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_updates" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <button
          onClick={fetchAnalytics}
          style={{
            backgroundColor: "#3B82F6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          🔄 Refresh Sekarang
        </button>

        <div
          style={{
            marginTop: "8px",
            fontSize: "0.85rem",
            color: "#A8B2C1",
          }}
        >
          Terakhir update: {lastRefresh || "-"}
        </div>
      </div>
    </div>
  );
}
