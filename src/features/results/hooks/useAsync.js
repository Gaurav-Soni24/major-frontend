"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tiny data hook. `load` runs whenever `key` changes or `reload()` is called.
 * While a new request is running `data` keeps the previous value (so lists can dim instead of flashing) and `loading` is true.
 * `error` is only set for the request that is current. `setData` replaces the cached value (optimistic updates).
 *
 * @template T
 * @param {() => Promise<T>} load
 * @param {string} key
 * @returns {{ data: T|undefined, error: any, loading: boolean, reload: () => void, setData: (next: T) => void }}
 */
export function useAsync(load, key) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ id: "", data: undefined, error: null });
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const id = `${key}#${tick}`;

  useEffect(() => {
    let alive = true;
    loadRef.current().then(
      (data) => alive && setState({ id, data, error: null }),
      (error) => alive && setState({ id, data: undefined, error }),
    );
    return () => {
      alive = false;
    };
  }, [id]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((data) => setState((s) => ({ ...s, data })), []);
  const current = state.id === id;
  return { data: state.data, error: current ? state.error : null, loading: !current, reload, setData };
}
