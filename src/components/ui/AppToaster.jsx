"use client";

import { Toaster, toast } from "react-hot-toast";

/**
 * Toast host (mount once, in the root layout). Bottom centre, ruled paper style, 160ms ease.
 * Use `import { toast } from "@/components/ui"`: `toast.success("Saved")`, `toast.error(err.message)`.
 * Prefer inline messages for form errors; toasts are for results of actions that leave the screen unchanged.
 */
export default function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      gutter={8}
      toastOptions={{
        duration: 3500,
        style: {
          background: "var(--ink)",
          color: "#fff",
          borderRadius: "4px",
          padding: "10px 14px",
          fontFamily: "var(--font-ui)",
          fontSize: "0.875rem",
          fontWeight: 500,
          boxShadow: "var(--shadow-overlay)",
          maxWidth: "420px",
        },
        success: { iconTheme: { primary: "#fff", secondary: "#0E7C54" } },
        error: { iconTheme: { primary: "#fff", secondary: "#B3261E" }, duration: 5000 },
      }}
    />
  );
}

export { toast };
