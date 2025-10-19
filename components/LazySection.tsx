"use client";
import { ReactNode, Suspense } from "react";
import { useVisibility } from "@/hooks/useVisibility";

export default function LazySection({ placeholderHeight = 280, children }: { placeholderHeight?: number; children: ReactNode }) {
  const { ref, isVisible } = useVisibility<HTMLDivElement>();
  return (
    <div ref={ref}>
      {isVisible ? (
        <Suspense fallback={<div style={{height: placeholderHeight}} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" />} >
          {children}
        </Suspense>
      ) : (
        <div style={{height: placeholderHeight}} className="bg-transparent" />
      )}
    </div>
  );
}

