"use client";

import { useEffect, useRef, useState } from "react";

/** Width of the wrapper element in px (ResizeObserver), so charts draw at true size and text never scales down. */
export function useChartWidth(fallback = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
