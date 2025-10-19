// /contexts/SnapshotContext.js — Phase2.14.v2025.10A (Auto Analytics Counter)
"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

const SnapshotContext = createContext();

export function SnapshotProvider({ children }) {
  const [lastGlobalRefresh, setLastGlobalRefresh] = useState(Date.now());
  const [eventLogs, setEventLogs] = useState([]);
  const [ttl, setTtl] = useState(60_000);
  const { toast } = useToast();

  // 🔧 Controls & Filters
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [filterType, setFilterType] = useState("ALL");

  // 🆕 Counter analytics
  const [analytics, setAnalytics] = useState({ insert: 0, update: 0, del: 0 });

  // Toast debounce
  const [toastTimeout, setToastTimeout] = useState(null);
  const showToastDebounced = useCallback(
    (payload, section) => {
      if (toastTimeout) clearTimeout(toastTimeout);
      const t = setTimeout(() => {
        toast({
          title: "Data updated automatically",
          description: `${payload.eventType} on ${section || "overview"}`,
          duration: 2500,
        });
      }, 500);
      setToastTimeout(t);
    },
    [toast, toastTimeout]
  );

  // ⏱ Adaptive TTL
  useEffect(() => {
    let timer;
    const extend = () => {
      clearTimeout(timer);
      setTtl(prev => Math.min(prev + 30_000, 180_000));
      timer = setTimeout(() => setTtl(60_000), 180_000);
    };
    window.addEventListener("mousemove", extend);
    window.addEventListener("keydown", extend);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", extend);
      window.removeEventListener("keydown", extend);
    };
  }, []);

  const refreshAll = useCallback(() => setLastGlobalRefresh(Date.now()), []);
  const clearAll = useCallback(() => {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith("overview_"))
      .forEach(k => sessionStorage.removeItem(k));
    setEventLogs([]);
    setAnalytics({ insert: 0, update: 0, del: 0 });
  }, []);

  // 📡 Realtime listener
  useEffect(() => {
    const channel = supabase
      .channel("realtime_mplan_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "mplan", table: "updates" },
        payload => {
          if (paused) return;

          const section =
            payload.new?.status || payload.old?.status
              ? "status_count"
              : payload.new?.company_code
              ? "kpi_category"
              : "overview";

          const colorMap = {
            INSERT: "text-green-400",
            UPDATE: "text-blue-400",
            DELETE: "text-red-400",
          };

          const log = {
            id: crypto.randomUUID(),
            time: new Date().toLocaleTimeString(),
            timestamp: Date.now(),
            type: payload.eventType,
            section,
            status: payload.new?.status || payload.old?.status || "-",
            color: colorMap[payload.eventType] || "text-gray-300",
          };

          setEventLogs(prev => [log, ...prev].slice(0, 200));
          setLastGlobalRefresh(Date.now());
          showToastDebounced(payload, section);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paused, showToastDebounced]);

  // 🧮 Recalculate analytics every 10 s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      const lastHourLogs = eventLogs.filter(l => l.timestamp > oneHourAgo);
      const insertCount = lastHourLogs.filter(l => l.type === "INSERT").length;
      const updateCount = lastHourLogs.filter(l => l.type === "UPDATE").length;
      const deleteCount = lastHourLogs.filter(l => l.type === "DELETE").length;

      setAnalytics({
        insert: insertCount,
        update: updateCount,
        del: deleteCount,
      });
    }, 10_000);

    return () => clearInterval(interval);
  }, [eventLogs]);

  return (
    <SnapshotContext.Provider
      value={{
        ttl,
        lastGlobalRefresh,
        eventLogs,
        refreshAll,
        clearAll,
        paused,
        setPaused,
        expanded,
        setExpanded,
        filterType,
        setFilterType,
        analytics, // 🆕 expose counters
      }}
    >
      {children}
    </SnapshotContext.Provider>
  );
}

export const useSnapshot = () => useContext(SnapshotContext);
