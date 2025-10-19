"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  listTemplates,
  getTemplate,
  upsertTemplate,
  deleteTemplate,
  renderTemplate,
} from "../lib/emailTemplatesService";

// Editor (Gmail-like)
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

const modules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image"],
    ["clean"],
  ],
};

const TOKENS = [
  "Perusahaan",
  "Email",
  "FirstName",
  "NamaPerusahaan",
  "Bagian",
  "Website",
  "WhatsAppLink",
  "CompanyProfileURL",
  "PriceListURL",
];

// Dummy data untuk preview
const DUMMY = {
  Perusahaan: "PT Ayam Goreng",
  Email: "contact@ayamgoreng.com",
  FirstName: "Budi",
  NamaPerusahaan: "PT Ayam Goreng",
  Bagian: "Purchasing",
  Website: "https://ayamgoreng.com",
  WhatsAppLink: "https://wa.me/628123456789",
  CompanyProfileURL: "https://example.com/profile.pdf",
  PriceListURL: "https://example.com/pricelist.pdf",
};

export default function EmailTemplatesPage() {
  // Data list & selection
  const [templates, setTemplates] = useState([]);
  const [activeKey, setActiveKey] = useState(null);

  // Editor state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // UI state
  const [openNew, setOpenNew] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  // Refs for caret-aware insert
  const quillRef = useRef(null);
  const subjectRef = useRef(null);
  const [lastFocus, setLastFocus] = useState("body"); // 'body' | 'subject'
  const [subjectCaret, setSubjectCaret] = useState(0);

  useEffect(() => {
    refreshList(true);
  }, []);

  async function refreshList(selectFirst = false) {
    const { data } = await listTemplates();
    setTemplates(data || []);
    if (selectFirst && data?.length) {
      loadTemplate(data[0].template_key);
    }
  }

  async function loadTemplate(key) {
    setActiveKey(key);
    const { data } = await getTemplate(key);
    if (data) {
      setName(data.name || "");
      setSubject(data.subject || "");
      setBody(data.html_body || "");
    } else {
      setName("");
      setSubject("");
      setBody("");
    }
  }

  async function saveTemplate() {
    if (!activeKey) return alert("Pilih template dulu");
    const { error } = await upsertTemplate({
      template_key: activeKey,
      name,
      subject,
      html_body: body,
    });
    if (error) return alert("❌ Error: " + error.message);
    await refreshList(false);
    alert("✅ Template tersimpan");
  }

  async function createNew() {
    if (!newKey || !newName) return alert("Isi Key & Nama template");
    const key = newKey.toUpperCase();
    const { error } = await upsertTemplate({
      template_key: key,
      name: newName,
      subject: "",
      html_body: "",
    });
    if (error) return alert("❌ Error: " + error.message);
    setOpenNew(false);
    setNewKey("");
    setNewName("");
    await refreshList(false);
    await loadTemplate(key);
  }

  async function remove(key) {
    if (!confirm(`Hapus template ${key}?`)) return;
    await deleteTemplate(key);
    await refreshList(true);
  }

  async function duplicateCurrent() {
    if (!activeKey) return;
    const key = prompt("KEY baru (huruf besar & underscore, contoh: EMOL_COPY):", `${activeKey}_COPY`);
    if (!key) return;
    const nameCopy = prompt("Nama template baru:", `${name} (Copy)`) || `${name} (Copy)`;
    const { error } = await upsertTemplate({
      template_key: key.toUpperCase(),
      name: nameCopy,
      subject,
      html_body: body,
    });
    if (error) return alert("❌ Error: " + error.message);
    await refreshList(false);
    await loadTemplate(key.toUpperCase());
    alert("✅ Template berhasil di-duplicate");
  }

  // ===== Token insert di posisi kursor =====
  function insertToken(token) {
    const text = ` {{${token}}} `;
    if (lastFocus === "subject") {
      // insert ke subject pada caret
      const el = subjectRef.current;
      const start = subjectCaret;
      const end = el?.selectionEnd ?? start;
      const next =
        subject.slice(0, start) + text + subject.slice(end != null ? end : start);
      setSubject(next);
      // move caret after inserted token
      requestAnimationFrame(() => {
        if (el) {
          const pos = start + text.length;
          el.setSelectionRange(pos, pos);
          el.focus();
        }
      });
      return;
    }
    // default ke BODY (Quill)
    const quill = quillRef.current?.getEditor?.();
    if (quill) {
      const sel = quill.getSelection(true);
      const index = sel ? sel.index : quill.getLength();
      quill.insertText(index, text, "user");
      quill.setSelection(index + text.length, 0, "user");
      quill.focus();
    } else {
      // fallback append
      setBody((v) => (v || "") + text);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-2 border-b bg-white dark:bg-gray-800">
        <Link
          href="/dashboard"
          className="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600"
        >
          ← Back
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar list */}
        <aside className="w-64 border-r bg-white dark:bg-gray-800 p-3 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold">Templates</h2>
            <button
              onClick={() => setOpenNew(true)}
              className="px-2 py-1 text-sm bg-blue-600 text-white rounded"
            >
              + New
            </button>
          </div>
          {templates.map((t) => (
            <div
              key={t.template_key}
              className={`px-2 py-1 rounded cursor-pointer flex justify-between ${
                activeKey === t.template_key
                  ? "bg-gray-200 dark:bg-gray-700"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => loadTemplate(t.template_key)}
            >
              <span className="truncate">{t.template_key}</span>
              <div className="flex items-center gap-2">
                <button
                  title="Duplicate"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveKey(t.template_key);
                    // load state dulu biar pasti terbaru
                    loadTemplate(t.template_key).then(duplicateCurrent);
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  copy
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(t.template_key);
                  }}
                  className="text-red-500 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </aside>

        {/* Compose */}
        <main className="flex-1 flex flex-col">
          <div className="p-4 border-b flex flex-wrap gap-2 justify-between items-center bg-white dark:bg-gray-800">
            <h1 className="font-semibold">
              {activeKey ? `Compose: ${activeKey}` : "No Template Selected"}
            </h1>
            {activeKey && (
              <div className="flex gap-2">
                <button
                  onClick={duplicateCurrent}
                  className="px-3 py-1 bg-indigo-600 text-white rounded"
                >
                  Duplicate
                </button>
                <button
                  onClick={saveTemplate}
                  className="px-3 py-1 bg-green-600 text-white rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  {showPreview ? "Hide Preview" : "Preview"}
                </button>
              </div>
            )}
          </div>

          <div className="p-4 flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Editor panel */}
            {activeKey ? (
              <div className="space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Template"
                  className="w-full border p-2 rounded"
                  onFocus={() => setLastFocus("none")}
                />

                <input
                  ref={subjectRef}
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setSubjectCaret(e.target.selectionStart ?? 0);
                  }}
                  onClick={(e) => setSubjectCaret(e.currentTarget.selectionStart ?? 0)}
                  onKeyUp={(e) => setSubjectCaret(e.currentTarget.selectionStart ?? 0)}
                  onFocus={(e) => {
                    setLastFocus("subject");
                    setSubjectCaret(e.currentTarget.selectionStart ?? 0);
                  }}
                  placeholder="Subject (bisa pakai {{FirstName}})"
                  className="w-full border p-2 rounded"
                />

                <div
                  onFocus={() => setLastFocus("body")}
                  className="relative"
                >
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={body}
                    onChange={setBody}
                    modules={modules}
                    className="h-72"
                  />
                </div>

                <div className="mt-3">
                  <p className="font-semibold text-sm">
                    Tokens (klik untuk insert ke field aktif):
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {TOKENS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => insertToken(t)}
                        className="px-2 py-1 border rounded text-xs bg-gray-100 hover:bg-gray-200"
                        title={`Insert {{${t}}} ke ${lastFocus === "subject" ? "Subject" : "Body"}`}
                      >
                        {`{{${t}}}`}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs mt-1 opacity-70">
                    Field aktif: <b>{lastFocus === "subject" ? "Subject" : "Body"}</b>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Pilih template di sebelah kiri</p>
            )}

            {/* Preview panel */}
            {showPreview && activeKey && (
              <div className="border rounded bg-white dark:bg-gray-800 p-3 overflow-auto">
                <h2 className="font-semibold mb-2">Preview (Dummy Data)</h2>
                <div className="mb-2">
                  <strong>Subject:</strong>{" "}
                  {renderTemplate(subject, DUMMY) || (
                    <span className="opacity-50">-</span>
                  )}
                </div>
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: renderTemplate(body, DUMMY),
                  }}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Tambah */}
      {openNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-[400px]">
            <h2 className="font-semibold mb-3">Tambah Template Baru</h2>
            <input
              placeholder="Key (ex: EMOL2)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase())}
              className="w-full border p-2 mb-2 rounded"
            />
            <input
              placeholder="Nama Template"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border p-2 mb-4 rounded"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpenNew(false)}
                className="px-3 py-1 rounded border"
              >
                Batal
              </button>
              <button
                onClick={createNew}
                className="px-3 py-1 rounded bg-blue-600 text-white"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
