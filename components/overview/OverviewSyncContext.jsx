// /contexts/OverviewSyncContext.jsx — v2025.10U (Cross-Section Sync)
"use client";
import { createContext, useContext, useState, useCallback } from "react";

const OverviewSyncContext = createContext();

export function OverviewSyncProvider({ children }) {
  // 🔁 counter setiap kali ada event refresh/filter
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [activeSource, setActiveSource] = useState(null);

  // 🧩 trigger dari satu section
  const triggerGlobalRefresh = useCallback((source) => {
    setActiveSource(source);
    setRefreshKey(Date.now()); // ubah key supaya useEffect di listener jalan
  }, []);

  return (
    <OverviewSyncContext.Provider
      value={{ refreshKey, activeSource, triggerGlobalRefresh }}
    >
      {children}
    </OverviewSyncContext.Provider>
  );
}

export function useOverviewSync() {
  return useContext(OverviewSyncContext);
}
