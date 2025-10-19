"use client";
import { useEffect, useRef, useState } from "react";

type Options = { root?: Element | null; rootMargin?: string; threshold?: number | number[] };

export function useVisibility<T extends HTMLElement>(opts: Options = { root: null, rootMargin: "0px 0px -20% 0px", threshold: 0.01 }) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let cancelled = false;

    const io = new IntersectionObserver(
      (entries) => {
        if (cancelled) return;
        const entry = entries[0];
        if (entry.isIntersecting) setIsVisible(true);
      },
      { root: opts.root ?? null, rootMargin: opts.rootMargin ?? "0px", threshold: opts.threshold ?? 0.01 }
    );

    io.observe(node);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [opts.root, opts.rootMargin, opts.threshold]);

  return { ref, isVisible };
}
