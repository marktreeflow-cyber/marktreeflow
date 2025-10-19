// /components/overview/LiveCursor.jsx — v2025.10Z
"use client";
import { useEffect, useRef } from "react";
import { usePresence } from "@/contexts/PresenceContext";

export default function LiveCursor({ sectionKey }) {
  const { online, updatePresence, me } = usePresence();
  const containerRef = useRef(null);

  // Track mouse moves within section
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      updatePresence({ mouse: { x, y } });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [updatePresence]);

  const others = online.filter(u => u.sectionKey === sectionKey && u.id !== me.id && u.mouse);

  return (
    <div ref={containerRef} className="relative">
      {/* slot content via children */}
      <div className="pointer-events-none absolute inset-0">
        {others.map(u => (
          <div
            key={u.id}
            className="absolute text-[10px] px-1.5 py-0.5 rounded-md text-white shadow"
            style={{
              left: `${(u.mouse?.x ?? 0)*100}%`,
              top: `${(u.mouse?.y ?? 0)*100}%`,
              transform: "translate(-50%, -120%)",
              background: u.color,
              whiteSpace: "nowrap",
            }}
          >
            ▲ {u.name}
          </div>
        ))}
      </div>
    </div>
  );
}
