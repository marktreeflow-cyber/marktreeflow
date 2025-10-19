"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { Perf } from "@/utils/perf";

type Ctx = { enabled: boolean; setEnabled: (v:boolean)=>void; samples: ReturnType<typeof Perf.getAll>; refresh: ()=>void; };
const PerfContext = createContext<Ctx | null>(null);

export function PerfProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [nonce, setNonce] = useState(0);
  Perf.enable(enabled);

  return (
    <PerfContext.Provider value={{
      enabled,
      setEnabled,
      samples: Perf.getAll(),
      refresh: ()=> setNonce(n=>n+1),
    }}>
      {children}
    </PerfContext.Provider>
  );
}
export function usePerf() {
  const ctx = useContext(PerfContext);
  if (!ctx) throw new Error("usePerf must be used within PerfProvider");
  return ctx;
}
