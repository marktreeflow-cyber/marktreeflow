import React, { useRef, useState, useMemo } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabaseClient";

export default function ImportExportBar({ rows = [], onImported, existingNames = new Set(), schemaName = "mplan" }) {
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const companiesTable = useMemo(() => supabase.schema(schemaName).from("companies"), [schemaName]);

  const exportCSV = () => {
    const headers = ["company_code","name","company_telp","pic","pic_email","pic_whatsapp","kategori","checking","created_at","updated_at"];
    const data = rows.map((r) => headers.map((h) => r?.[h] ?? ""));
    const csv = Papa.unparse({ fields: headers, data });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `companies_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (file) => {
    if (!file) return;
    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        try {
          const payload = [];
          for (const row of data) {
            const name = (row.name || row.company_name || "").trim();
            if (!name) continue;
            if (existingNames.has(name.toLowerCase())) continue;
            payload.push({
              name,
              company_telp: row.company_telp || null,
              pic: row.pic || null,
              pic_email: row.pic_email || null,
              pic_whatsapp: row.pic_whatsapp || null,
              kategori: row.kategori || "BELUM KATEGORI",
              checking: typeof row.checking === "string" ? row.checking.toLowerCase() === "true" : row.checking ?? null,
            });
          }
          if (payload.length) {
            const { error } = await companiesTable.insert(payload);
            if (error) throw error;
          }
          onImported?.();
        } catch (e) {
          console.error("[ImportExportBar] import error:", e);
        } finally {
          setImporting(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        setImporting(false);
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => importCSV(e.target.files?.[0])} />
      <button onClick={() => fileRef.current?.click()} disabled={importing} className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-60">
        {importing ? "Mengimpor…" : "Import CSV"}
      </button>
      <button onClick={exportCSV} className="px-3 py-2 rounded bg-slate-700 text-white text-sm hover:bg-slate-600">
        Export CSV
      </button>
    </div>
  );
}
