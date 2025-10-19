"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OmzetService } from "@/lib/omzetService";
import OmzetTrendChart from "@/components/omzet/OmzetTrendChart";
import OmzetCompanyTable from "@/components/omzet/OmzetCompanyTable";
import { Loader2 } from "lucide-react";

export default function OmzetKategoriPage() {
  const { kategori } = useParams();
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kategori) return;
    (async () => {
      setLoading(true);
      const data = await OmzetService.getTrend(kategori, "2025-07-01", "2025-10-01");
      setTrend(data);
      setLoading(false);
    })();
  }, [kategori]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" size={40} />
      </div>
    );

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">💰 Omzet Kategori {kategori}</h1>
      <OmzetTrendChart data={trend} />
      <OmzetCompanyTable kategori={kategori} />
    </div>
  );
}
