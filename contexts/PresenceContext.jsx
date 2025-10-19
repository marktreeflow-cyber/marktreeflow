// /contexts/PresenceContext.jsx — v2025.10Z (Supabase Realtime Presence)
"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const PresenceContext = createContext(null);
export const usePresence = () => useContext(PresenceContext);

// Helper: random color & initials
const colors = ["#6366f1","#10b981","#f59e0b","#ef4444","#06b6d4","#8b5cf6","#84cc16"];
const rand = (arr) => arr[Math.floor(Math.random()*arr.length)];
const initials = (name="Guest") => name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();

export function PresenceProvider({ children, user }) {
  // user: { id, name, email, avatarUrl } ← opsional; fallback anonymous
  const me = useMemo(() => ({
    id: user?.id || crypto.randomUUID(),
    name: user?.name || "Guest",
    email: user?.email,
    avatarUrl: user?.avatarUrl,
    color: rand(colors),
  }), [user]);

  const [online, setOnline] = useState([]); // [{id,name,color,sectionKey,mouse:{x,y}}]
  const channelRef = useRef(null);

  useEffect(() => {
    const ch = supabase.channel("overview_presence", {
      config: { presence: { key: me.id } }
    });

    // Join with initial state
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const flat = Object.values(state).flat().map(p => p);
      setOnline(flat);
    });

    ch.on("presence", { event: "join" }, ({ newPresences }) => {
      setOnline(prev => {
        const map = new Map(prev.map(p=>[p.id,p]));
        newPresences.forEach(p => map.set(p.id, p));
        return Array.from(map.values());
      });
    });

    ch.on("presence", { event: "leave" }, ({ leftPresences }) => {
      setOnline(prev => prev.filter(p => !leftPresences.some(lp => lp.id === p.id)));
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({
          ...me,
          sectionKey: null,      // updated on section view
          mouse: null,           // updated on move
          ts: Date.now()
        });
      }
    });

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [me]);

  // Update partial fields (sectionKey / mouse)
  const updatePresence = (patch) => {
    if (!channelRef.current) return;
    channelRef.current.track({ ...patch, id: me.id, name: me.name, color: me.color, ts: Date.now() });
  };

  return (
    <PresenceContext.Provider value={{ me, online, updatePresence }}>
      {children}
    </PresenceContext.Provider>
  );
}
