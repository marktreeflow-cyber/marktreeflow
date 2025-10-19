// pages/upload-data.js
"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabaseClient";

export default function UploadData() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState(0);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
    setRows(0);
  };

  const handleUpload = async (table) => {
    if (!file) return setMessage("⚠️ Pilih file CSV dulu");
    setLoading(true);
    setMessage("⏳ Sedang parsing CSV...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const data = results.data;
        setRows(data.length);

        if (!data || data.length === 0) {
          setMessage("❌ CSV kosong / format salah");
          setLoading(false);
          return;
        }

        // Insert ke staging table
        const { error } = await supabase.from(table).insert(data);
        if (error) {
          console.error(error);
          setMessage("❌ Upload gagal ke staging: " + error.message);
          setLoading(false);
          return;
        }

        // Promote ke tabel utama
        const { error: rpcError } = await supabase.rpc(
          table === "staging_companies"
            ? "promote_staging_companies"
            : "promote_staging_updates"
        );

        if (rpcError) {
          console.error(rpcError);
          setMessage("❌ Promote gagal: " + rpcError.message);
        } else {
          setMessage(`✅ Upload sukses! ${data.length} baris diproses`);
          setFile(null);
        }
        setLoading(false);
      },
      error: (err) => {
        console.error(err);
        setMessage("❌ Gagal parsing CSV!");
        setLoading(false);
      },
    });
  };

  return (
    <div className="p-6 min-h-screen">
      <h1 className="text-xl font-bold mb-4">📤 Upload Data CSV</h1>

      {/* Pilih file */}
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="mb-4"
      />

      {/* Tombol upload */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => handleUpload("staging_companies")}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Processing..." : "Upload Companies"}
        </button>

        <button
          onClick={() => handleUpload("staging_updates")}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Processing..." : "Upload Updates"}
        </button>
      </div>

      {/* Status pesan */}
      {message && (
        <p className="mt-4 text-sm font-medium">{message}</p>
      )}

      {rows > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          Total baris terbaca: {rows}
        </p>
      )}
    </div>
  );
}
