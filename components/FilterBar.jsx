import React, { memo } from "react";
import AutoSuggestInput from "./AutoSuggestInput";

const FilterFields = memo(function FilterFields({
  filters,
  setFilters,
  pageSize,
  setPageSize,
  resetAll,
  companyOptions,
}) {
  const handleChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAutoCommit = (field, val) => {
    setFilters((prev) => ({ ...prev, [field]: val }));
  };

  return (
    <>
      {/* 🌐 Global Search */}
      <AutoSuggestInput
        value={filters.global}
        onCommit={(val) => handleAutoCommit("global", val)}
        options={companyOptions}
        placeholder="Global search… (nama perusahaan, PIC, status, dll)"
        width="18rem"
      />

      {/* 🔍 Nama Perusahaan */}
      <AutoSuggestInput
        value={filters.company}
        onCommit={(val) => handleAutoCommit("company", val)}
        options={companyOptions}
        placeholder="Nama perusahaan…"
        width="14rem"
      />

      {/* 📅 Range Tanggal */}
      <div className="flex gap-2 items-center">
        <label className="text-xs text-gray-400">Dari</label>
        <input
          type="date"
          name="dateFrom"
          value={filters.dateFrom}
          onChange={handleChange}
          className="p-2 rounded bg-gray-800 text-gray-100 border border-gray-700 text-sm"
        />
        <label className="text-xs text-gray-400">Sampai</label>
        <input
          type="date"
          name="dateTo"
          value={filters.dateTo}
          onChange={handleChange}
          className="p-2 rounded bg-gray-800 text-gray-100 border border-gray-700 text-sm"
        />
      </div>

      {/* 🗂️ Kategori */}
      <select
        name="kategori"
        value={filters.kategori}
        onChange={handleChange}
        className="p-2 rounded bg-gray-800 text-gray-100 border border-gray-700 text-sm"
      >
        <option value="">Kategori</option>
        <option value="KONTRAK">KLIEN KONTRAK</option>
        <option value="LANGGANAN">LANGGANAN</option>
        <option value="KLIEN BARU">KLIEN BARU</option>
        <option value="BELUM KATEGORI">BELUM KATEGORI</option>
      </select>

      {/* 📊 Status */}
      <select
        name="status"
        value={filters.status}
        onChange={handleChange}
        className="p-2 rounded bg-gray-800 text-gray-100 border border-gray-700 text-sm"
      >
        <option value="">Status</option>
        <option value="TELE">TELE</option>
        <option value="EMOL">EMOL</option>
        <option value="MEET">MEET</option>
        <option value="QUOT">QUOT</option>
        <option value="CUGR">CUGR</option>
      </select>

      {/* ✅ Checking */}
      <select
        name="checking"
        value={filters.checking}
        onChange={handleChange}
        className="p-2 rounded bg-gray-800 text-gray-100 border border-gray-700 text-sm"
      >
        <option value="">Checking</option>
        <option value="CHECKLIST">Checklist</option>
        <option value="UNCHECKED">Unchecked</option>
      </select>

      {/* 📄 Page size */}
      <select
        value={pageSize}
        onChange={(e) => setPageSize(e.target.value)}
        className="p-2 rounded bg-gray-800 text-gray-100 border border-gray-700 text-sm"
      >
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
        <option value="200">200</option>
        <option value="ALL">ALL</option>
      </select>

      {/* 🔄 Reset */}
      <button
        onClick={resetAll}
        className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
      >
        Reset Filter
      </button>
    </>
  );
});

export default function FilterBar({
  filters,
  setFilters,
  fetchUpdates,
  pageSize,
  setPageSize,
  resetAll,
  companyOptions = [],
}) {
  return (
    <div>
      {/* Desktop Filter Bar */}
      <div className="hidden md:flex flex-wrap gap-3 items-center p-3 bg-gray-900 rounded">
        <FilterFields
          filters={filters}
          setFilters={setFilters}
          pageSize={pageSize}
          setPageSize={setPageSize}
          resetAll={resetAll}
          companyOptions={companyOptions}
        />
      </div>

      {/* Mobile Collapsible Filter */}
      <div className="md:hidden p-2 bg-gray-900 rounded">
        <details>
          <summary className="cursor-pointer font-medium py-1 text-gray-100">
            🔍 Filter
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            <FilterFields
              filters={filters}
              setFilters={setFilters}
              pageSize={pageSize}
              setPageSize={setPageSize}
              resetAll={resetAll}
              companyOptions={companyOptions}
            />
          </div>
        </details>
      </div>
    </div>
  );
}
