"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { session } from "./storage.js";
import { EMPTY_SESSION } from "./storage.js";

const noopSubscribe = () => () => {};

/** True once we are running in the browser after hydration (false on the server and during hydration). */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Teacher session hook.
 *
 * @returns {{
 *   status: "loading"|"authenticated"|"unauthenticated",
 *   user: import("./storage.js").SessionUser|null,
 *   token: string|null,
 *   login: (res: { token: string, userId?: string, user?: import("./storage.js").SessionUser }) => void,
 *   logout: () => void,
 * }}
 * `status` is "loading" on the server and during hydration, so guards never flash the wrong screen.
 */
export function useAuth() {
  const router = useRouter();
  const hydrated = useHydrated();
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, () => EMPTY_SESSION);

  const login = useCallback((res) => {
    session.save({ token: res.token, userId: res.userId ?? null, user: res.user ?? null });
  }, []);

  const logout = useCallback(() => {
    session.clear();
    router.replace("/login");
  }, [router]);

  return useMemo(
    () => ({
      status: !hydrated ? "loading" : snap.token ? "authenticated" : "unauthenticated",
      user: snap.user,
      token: snap.token,
      login,
      logout,
    }),
    [hydrated, snap, login, logout],
  );
}
