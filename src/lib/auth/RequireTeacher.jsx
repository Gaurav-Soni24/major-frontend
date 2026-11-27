"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./useAuth.js";
import { loginUrl } from "./redirect.js";

/**
 * Client guard for teacher-only routes. Renders `children` only when a teacher session exists.
 * While the session is being read (or while redirecting to `/login?next=...`) it renders `fallback`.
 * This is a convenience, not a security boundary: the API enforces access on every request.
 *
 * @param {{ children: import("react").ReactNode, fallback?: import("react").ReactNode }} props
 */
export default function RequireTeacher({ children, fallback = null }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(loginUrl(pathname + window.location.search));
    }
  }, [status, router, pathname]);

  if (status !== "authenticated") return fallback;
  return children;
}
