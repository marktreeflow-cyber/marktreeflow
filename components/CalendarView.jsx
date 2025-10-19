// components/CalendarView.jsx — v2025.10A
"use client";

import { useEffect, useState } from "react";
import { CalendarDays, PlusCircle, Loader2 } from "lucide-react";
import { getAllTargets, createSchedule } from "@/lib/socialService";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", caption: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🧠 Load semua jadwal
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getAllTargets();
      setEvents(data || []);
    } catch (err) {
      console.error(err);
      alert("Gagal memuat jadwal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openModal = (date) => {
    setSelectedDate(date);
    setForm({ title: "", caption: "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const newSchedule = {
        status: "scheduled",
        scheduled_at: selectedDate,
        created_at: new Date().toISOString(),
      };
      await createSchedule(newSchedule);
      alert("Jadwal berhasil disimpan!");
      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan jadwal.");
    } finally {
      setSaving(false);
    }
  };

  // 🧮 Buat grid tanggal manual (tanpa library dulu)
  const days = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  const startDay = startOfMonth.getDay();
  const totalDays = endOfMonth.getDate();

  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i));
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <CalendarDays size={20} /> Social Calendar
      </h2>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={18} /> Loading jadwal...
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2 text-sm">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
            <div
              key={d}
              className="text-center font-semibold text-gray-500 dark:text-gray-400"
            >
              {d}
            </div>
          ))}
          {days.map((date, idx) =>
            date ? (
              <div
                key={idx}
                onClick={() => openModal(date)}
                className="relative border rounded-lg p-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
              >
                <div className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {date.getDate()}
                </div>

                {/* tampilkan jadwal */}
                <div className="mt-1 space-y-1">
                  {events
                    .filter(
                      (ev) =>
                        ev.scheduled_at &&
                        new Date(ev.scheduled_at).toDateString() ===
                          date.toDateString()
                    )
                    .map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[10px] bg-indigo-600 text-white px-1 py-[1px] rounded truncate"
                      >
                        {ev.post_drafts?.title || "Untitled"}
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div key={idx}></div>
            )
          )}
        </div>
      )}

      {/* MODAL TAMBAH */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-96">
            <h3 className="font-bold mb-3">
              Tambah Jadwal -{" "}
              {format(selectedDate, "d MMMM yyyy", { locale: id })}
            </h3>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Judul (opsional)"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800"
              />
              <textarea
                placeholder="Catatan atau caption (opsional)"
                value={form.caption}
                onChange={(e) =>
                  setForm((f) => ({ ...f, caption: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Menyimpan
                  </>
                ) : (
                  <>
                    <PlusCircle size={14} /> Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
