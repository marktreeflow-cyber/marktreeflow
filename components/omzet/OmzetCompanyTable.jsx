"use client";
import { useEffect, useState } from "react";
import { OmzetService } from "@/lib/omzetService";
import { Loader2 } from "lucide-react";

export default function OmzetCompanyTable({ kategori }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await OmzetService.getCompanyList(kategori);
      setRows(data);
      setLoading(false);
    })();
  }, [kategori]);

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 mt-6">
      <h2 className="font-semibold mb-3">🏢 Perusahaan dalam Kategori {kategori}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse border border-gray-300 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-3 py-2 border">Company Code</th>
              <th className="px-3 py-2 border">Revenue (₱)</th>
              <th className="px-3 py-2 border">Month</th>
              <th className="px-3 py-2 border">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="border px-3 py-2">{r.company_code}</td>
                <td className="border px-3 py-2">{r.revenue_amount?.toLocaleString()}</td>
                <td className="border px-3 py-2">{r.revenue_month}</td>
                <td className="border px-3 py-2">{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
