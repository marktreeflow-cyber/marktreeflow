// components/AutoSuggestInput.jsx — FINAL ENTER SUBMIT v2025.10L
import React, { useState, useEffect, useRef } from "react";

export default function AutoSuggestInput({
  value = "",
  onCommit,
  placeholder = "Cari nama perusahaan...",
  options = [],
  width = "16rem",
  onEnterAdd = null, // 🔥 fungsi opsional (dari UpdatesQuickAdd → panggil addRow)
  canAdd = false, // 🔥 boolean (true jika field update_notes sudah diisi)
}) {
  const [localValue, setLocalValue] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [active, setActive] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef();
  const debounceRef = useRef(null);
  const inputRef = useRef();

  /** 🔄 Sinkronisasi saat parent reset value */
  useEffect(() => {
    if (!value && localValue) setLocalValue("");
  }, [value]);

  /** 🔒 Tutup popup kalau klik di luar */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setActive(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** 🔍 Update suggestions */
  const updateSuggestions = (val) => {
    if (!val.trim()) {
      setSuggestions([]);
      setActive(false);
      return;
    }
    const filtered = options
      .filter((opt) =>
        (opt.company_name || "").toLowerCase().includes(val.toLowerCase())
      )
      .slice(0, 8);
    setSuggestions(filtered);
    setActive(filtered.length > 0);
  };

  /** 🧠 Saat mengetik */
  const handleInput = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onCommit?.(val);
    }, 400);
    updateSuggestions(val);
  };

  /** ✅ Saat memilih dari daftar */
  const handleSelect = (name) => {
    setLocalValue(name);
    clearTimeout(debounceRef.current);
    onCommit?.(name);
    setActive(false);
    setHighlightIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  /** ✨ Highlight teks */
  const highlightMatch = (text, query) => {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <span className="text-blue-400 font-semibold">
          {text.substring(idx, idx + query.length)}
        </span>
        {text.substring(idx + query.length)}
      </>
    );
  };

  /** 🎹 Navigasi keyboard + Enter submit */
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      clearTimeout(debounceRef.current);

      if (active && highlightIndex >= 0 && suggestions[highlightIndex]) {
        // pilih item dari daftar
        handleSelect(suggestions[highlightIndex].company_name);
      } else {
        // commit input manual
        onCommit?.(localValue);
      }

      // 🔥 Kalau bisa tambah (update_notes sudah diisi) → auto-submit
      if (canAdd && typeof onEnterAdd === "function") {
        e.preventDefault();
        onEnterAdd();
      }

      setActive(false);
      return;
    }

    if (!active || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Escape" || e.key === "Tab") {
      setActive(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative" style={{ width }}>
      <input
        ref={inputRef}
        value={localValue}
        onChange={handleInput}
        onFocus={() => updateSuggestions(localValue)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-sm text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />

      {active && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto z-50 suggest-popover">
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => handleSelect(s.company_name)} // kirim sebelum blur
              className={`px-3 py-1 text-sm cursor-pointer ${
                i === highlightIndex
                  ? "bg-blue-700 text-white"
                  : "text-gray-200 hover:bg-gray-700"
              }`}
            >
              {highlightMatch(s.company_name, localValue)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
