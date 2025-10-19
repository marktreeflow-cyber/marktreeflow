// components/HeaderTabel.js
import React from "react";
import { PlusIcon } from "@heroicons/react/24/solid";
import StatusBadge from "./StatusBadge";

export function UpdateTableHead({ headers, onSort, getSortIcon, sortableKeys }) {
  return (
    <thead className="sticky top-0 z-20 bg-gray-800 text-white text-sm uppercase">
      <tr>
        {headers.map((h, i) => (
          <th
            key={i}
            onClick={() => onSort(h)}
            className={`px-3 py-2 select-none text-left ${
              sortableKeys[h] ? "cursor-pointer" : ""
            }`}
          >
            {h} {getSortIcon(h)}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function InlineAddRow({
  newRow,
  setNewRow,
  addRow,
  saving,
  companyOptions = [],
  onCompanyChange,
}) {
  return (
    <tr className="bg-gray-900/60">
      <td className="px-3 py-2">+</td>

      <td className="px-3 py-2">
        <select
          value={newRow.kategori}
          onChange={(e) => setNewRow((p) => ({ ...p, kategori: e.target.value }))}
          className="w-36 p-1 rounded bg-gray-800 border border-gray-700"
        >
          <option value="">-</option>
          <option value="BELUM KATEGORI">BELUM KATEGORI</option>
          <option value="KLIEN BARU">KLIEN BARU</option>
          <option value="LANGGANAN">LANGGANAN</option>
          <option value="KONTRAK">KLIEN KONTRAK</option>
        </select>
      </td>

      <td className="px-3 py-2">
        <input
          list="inlineCompanyList"
          value={newRow.company_name}
          onChange={(e) => onCompanyChange(e.target.value)}
          placeholder="Nama perusahaan…"
          className="w-56 p-1 rounded bg-gray-800 border border-gray-700"
        />
        <datalist id="inlineCompanyList">
          {companyOptions.map((c) => (
            <option key={c.company_code} value={c.company_name} />
          ))}
        </datalist>
      </td>

      <td className="px-3 py-2">
        <input
          value={newRow.company_telp}
          onChange={(e) => setNewRow((p) => ({ ...p, company_telp: e.target.value }))}
          placeholder="Telp"
          className="w-40 p-1 rounded bg-gray-800 border border-gray-700"
        />
      </td>

      <td className="px-3 py-2">
        <input
          value={newRow.pic}
          onChange={(e) => setNewRow((p) => ({ ...p, pic: e.target.value }))}
          placeholder="PIC"
          className="w-40 p-1 rounded bg-gray-800 border border-gray-700"
        />
      </td>

      <td className="px-3 py-2">
        <input
          value={newRow.pic_email}
          onChange={(e) => setNewRow((p) => ({ ...p, pic_email: e.target.value }))}
          placeholder="Email"
          className="w-48 p-1 rounded bg-gray-800 border border-gray-700"
        />
      </td>

      <td className="px-3 py-2">
        <input
          value={newRow.pic_whatsapp}
          onChange={(e) => setNewRow((p) => ({ ...p, pic_whatsapp: e.target.value }))}
          placeholder="WhatsApp"
          className="w-40 p-1 rounded bg-gray-800 border border-gray-700"
        />
      </td>

      <td className="px-3 py-2">
        <input
          value={newRow.update_notes}
          onChange={(e) => setNewRow((p) => ({ ...p, update_notes: e.target.value }))}
          className="w-full p-1 rounded bg-gray-800 border border-gray-700"
          placeholder="Tulis update terakhir…"
        />
      </td>

      <td className="px-3 py-2">-</td>
      <td className="px-3 py-2"><StatusBadge value="TELE" /></td>
      <td className="px-3 py-2">-</td>
      <td className="px-3 py-2"><StatusBadge value="EMOL" /></td>
      <td className="px-3 py-2">-</td>

      <td className="px-3 py-2">
        <button
          onClick={addRow}
          disabled={saving}
          className="text-green-500 hover:text-green-600 disabled:opacity-60"
          title="Tambah"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </td>
    </tr>
  );
}
