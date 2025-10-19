// pages/company-updates.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";
import formatDate from "../utils/formatDate";
import { getStatusBadge } from "../utils/statusBadge";

export default function CompanyUpdatesPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("company_summary")
        .select("*")
        .order("last_update", { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setData(data || []);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="p-6 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">📊 Company Updates Summary</h1>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto border rounded">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-800 text-white text-sm uppercase">
            <tr>
              <th className="p-2">Company</th>
              <th className="p-2">Last Update</th>
              <th className="p-2">Last Status</th>
              <th className="p-2">Kategori Final</th>
              <th className="p-2">Total Updates</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.map((row) => (
              <tr
                key={row.id}
                className="border-t border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="p-2">{row.company_name}</td>
                <td className="p-2">{formatDate(row.last_update)}</td>
                <td className="p-2">
                  <span className={getStatusBadge(row.last_status)}>
                    {row.last_status}
                  </span>
                </td>
                <td className="p-2">{row.kategori_final}</td>
                <td className="p-2">{row.total_updates}</td>
                <td className="p-2">
                  <Link
                    href={`/company-updates/${row.id}`}
                    className="text-blue-500 hover:underline"
                  >
                    View Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden flex flex-col gap-3">
        {data.map((row) => (
          <div
            key={row.id}
            className="border rounded-md p-3 bg-gray-800 text-white shadow"
          >
            <div className="flex justify-between mb-2">
              <h2 className="font-semibold">{row.company_name}</h2>
              <span className={getStatusBadge(row.last_status)}>
                {row.last_status}
              </span>
            </div>
            <p className="text-xs text-gray-300 mb-1">
              Last Update: {formatDate(row.last_update)}
            </p>
            <p className="text-xs mb-1">Kategori: {row.kategori_final}</p>
            <p className="text-xs mb-2">Total Updates: {row.total_updates}</p>
            <Link
              href={`/company-updates/${row.id}`}
              className="text-blue-400 underline text-sm"
            >
              View Detail →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
