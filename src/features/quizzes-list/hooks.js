"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { quizzes } from "@/lib/api";
import { toApiParams } from "./logic";

/**
 * Fetches one page of the teacher's quizzes. Keeps the previous rows while the next request is running.
 * `status` is derived: "loading" until the response for the current query (and reload count) has arrived.
 * `mutate(fn)` edits the loaded rows locally (optimistic updates). `onOverflow(pages)` fires when the
 * requested page is beyond the last page (for example after deleting the last row of a page).
 * @param {{ q: string, status: string, sort: string, page: number }} query
 * @param {(pages: number) => void} [onOverflow]
 */
export function useQuizList(query, onOverflow) {
  const { q, status, sort, page } = query;
  const [nonce, setNonce] = useState(0);
  const key = `${q}|${status}|${sort}|${page}|${nonce}`;
  const [data, setData] = useState({ items: /** @type {any[]} */ ([]), pagination: null, loadedKey: null, error: null, errorKey: null });
  const overflow = useRef(onOverflow);
  useEffect(() => {
    overflow.current = onOverflow;
  });

  useEffect(() => {
    let live = true;
    quizzes
      .listMyQuizzes(toApiParams({ q, status, sort, page }))
      .then((res) => {
        if (!live) return;
        const pagination = res.pagination || null;
        if (pagination && pagination.pages > 0 && page > pagination.pages) {
          overflow.current?.(pagination.pages);
          return;
        }
        setData({ items: res.quizzes || [], pagination, loadedKey: key, error: null, errorKey: null });
      })
      .catch((error) => {
        if (live) setData((d) => ({ ...d, error, errorKey: key }));
      });
    return () => {
      live = false;
    };
  }, [key, q, status, sort, page]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const mutate = useCallback((fn) => setData((d) => ({ ...d, items: fn(d.items) })), []);

  const state = data.errorKey === key ? "error" : data.loadedKey === key ? "ready" : "loading";
  return { status: state, items: data.items, pagination: data.pagination, error: data.errorKey === key ? data.error : null, loaded: data.loadedKey !== null, reload, mutate };
}

/** `true` when the media query matches (false on the server and during hydration). @param {string} query */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Copy text with a textarea fallback. @param {string} text @returns {Promise<boolean>} */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
