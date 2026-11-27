/**
 * Teacher session storage. Framework-free so it can be unit tested with a fake storage.
 *
 * Keys are kept backward compatible with the old screens: `token`, `userId`, plus `user` (JSON `{name,email,role}`).
 * All access is guarded: SSR (no window), blocked storage (Safari private mode, disabled cookies) and corrupt JSON
 * never throw, they just read as "signed out".
 */

export const STORAGE_KEYS = Object.freeze({ token: "token", userId: "userId", user: "user" });

/** @typedef {{ name?: string, email?: string, role?: string }} SessionUser */
/** @typedef {{ token: string|null, userId: string|null, user: SessionUser|null }} Session */

/** @type {Session} */
export const EMPTY_SESSION = Object.freeze({ token: null, userId: null, user: null });

/** @returns {Storage|null} */
function defaultGetStorage() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** @param {string|null} raw */
function parseUser(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @param {() => (Storage|null)} [getStorage] injectable for tests
 */
export function createSessionStore(getStorage = defaultGetStorage) {
  /** @type {Set<() => void>} */
  const listeners = new Set();
  let cachedKey = "\u0000";
  /** @type {Session} */
  let cached = EMPTY_SESSION;

  /** @param {string} key @returns {string|null} */
  const read = (key) => {
    try {
      const s = getStorage();
      return s ? s.getItem(key) : null;
    } catch {
      return null;
    }
  };

  const emit = () => listeners.forEach((fn) => fn());

  /**
   * Stable snapshot: the same object is returned until the stored values change
   * (required by React's useSyncExternalStore).
   * @returns {Session}
   */
  function getSnapshot() {
    const token = read(STORAGE_KEYS.token);
    const userId = read(STORAGE_KEYS.userId);
    const rawUser = read(STORAGE_KEYS.user);
    const key = `${token}|${userId}|${rawUser}`;
    if (key !== cachedKey) {
      cachedKey = key;
      cached = token ? { token, userId, user: parseUser(rawUser) } : EMPTY_SESSION;
    }
    return cached;
  }

  /** @returns {string|null} */
  const getToken = () => getSnapshot().token;

  /**
   * @param {{ token: string, userId?: string|null, user?: SessionUser|null }} session
   * @returns {boolean} false when storage is unavailable
   */
  function save({ token, userId = null, user = null }) {
    try {
      const s = getStorage();
      if (!s) return false;
      s.setItem(STORAGE_KEYS.token, token);
      if (userId) s.setItem(STORAGE_KEYS.userId, String(userId));
      else s.removeItem(STORAGE_KEYS.userId);
      if (user) s.setItem(STORAGE_KEYS.user, JSON.stringify(user));
      else s.removeItem(STORAGE_KEYS.user);
    } catch {
      return false;
    }
    emit();
    return true;
  }

  /** Update only the cached user profile (e.g. after the profile page saves). */
  function saveUser(user) {
    try {
      const s = getStorage();
      if (!s) return;
      if (user) s.setItem(STORAGE_KEYS.user, JSON.stringify(user));
      else s.removeItem(STORAGE_KEYS.user);
    } catch {
      /* ignore */
    }
    emit();
  }

  function clear() {
    try {
      const s = getStorage();
      if (s) Object.values(STORAGE_KEYS).forEach((k) => s.removeItem(k));
    } catch {
      /* ignore */
    }
    emit();
  }

  /**
   * @param {() => void} fn
   * @returns {() => void} unsubscribe
   */
  function subscribe(fn) {
    listeners.add(fn);
    /** @param {StorageEvent} e */
    const onStorage = (e) => {
      if (!e.key || Object.values(STORAGE_KEYS).includes(e.key)) fn();
    };
    const hasWindow = typeof window !== "undefined";
    if (hasWindow) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(fn);
      if (hasWindow) window.removeEventListener("storage", onStorage);
    };
  }

  return { getSnapshot, getToken, save, saveUser, clear, subscribe };
}

/** App-wide teacher session. */
export const session = createSessionStore();
