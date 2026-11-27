"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { dashboard } from "@/lib/api";

/**
 * Loads the dashboard summary once and on `reload()`.
 * @returns {{ status: "loading"|"ready"|"error", data: any, error: any, reload: () => void }}
 */
export function useDashboardSummary() {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const run = useRef(0);

  const load = useCallback(() => {
    const id = ++run.current;
    dashboard
      .getDashboardSummary()
      .then((data) => {
        if (id === run.current) setState({ status: "ready", data, error: null });
      })
      .catch((error) => {
        if (id === run.current) setState({ status: "error", data: null, error });
      });
  }, []);

  useEffect(() => {
    load();
    return () => {
      run.current += 1;
    };
  }, [load]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: "loading", error: null }));
    load();
  }, [load]);

  return { ...state, reload };
}

const noop = () => () => {};

/** Local hour (0-23) in the browser, null while hydrating. */
export function useLocalHour() {
  return useSyncExternalStore(noop, () => new Date().getHours(), () => null);
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Width of an element in px (updates on resize). `fallback` is used until measured.
 * @param {number} fallback
 * @returns {[import("react").RefObject<HTMLDivElement|null>, number]}
 */
export function useElementWidth(fallback = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setWidth(Math.round(el.getBoundingClientRect().width) || fallback);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width];
}
