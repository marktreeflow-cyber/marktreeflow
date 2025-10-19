// /components/overview/PresenceBar.jsx — v2025.10Z
"use client";
import { usePresence } from "@/contexts/PresenceContext";

export default function PresenceBar({ sectionKey }) {
  const { online } = usePresence();
  const here = online.filter(u => u.sectionKey === sectionKey);
  if (!here.length) return null;

  return (
    <div className="flex -space-x-2 items-center">
      {here.slice(0,4).map((u) => (
        <div
          key={u.id}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold ring-2 ring-white dark:ring-gray-800"
          style={{ background: u.color }}
          title={u.name}
        >
          {u.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.avatarUrl} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            (u.name || "G").split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase()
          )}
        </div>
      ))}
      {here.length > 4 && (
        <span className="ml-2 text-xs text-gray-500">+{here.length-4}</span>
      )}
    </div>
  );
}
