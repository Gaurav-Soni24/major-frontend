"use client";

import { useCallback, useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import styles from "./auth.module.css";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Google sign-in for teachers. `onCredential(idToken)` is called on success, `onError(message)` otherwise.
 * Without `NEXT_PUBLIC_GOOGLE_CLIENT_ID` it renders an honest disabled state instead of a broken button.
 * Width follows the container (Google needs a pixel width, so it is measured).
 *
 * @param {{ onCredential: (credential: string) => void, onError: (message: string) => void, text?: "signin_with"|"signup_with"|"continue_with", disabled?: boolean }} props
 */
export default function GoogleButton({ onCredential, onError, text = "continue_with", disabled = false }) {
  const [width, setWidth] = useState(0);

  // Callback ref: measure once when mounted and keep it in sync on resize.
  const measure = useCallback((node) => {
    if (!node) return undefined;
    const update = () => setWidth(Math.min(400, Math.max(200, Math.floor(node.getBoundingClientRect().width))));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  if (!CLIENT_ID) {
    return (
      <div className={styles.googleOff}>
        <button type="button" disabled className={styles.googleOffBtn}>
          Continue with Google
        </button>
        <p className={styles.googleNote}>Google sign-in is not configured in this environment.</p>
      </div>
    );
  }

  return (
    <div ref={measure} className={styles.google} aria-disabled={disabled || undefined} style={disabled ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
      {width > 0 ? (
        <GoogleOAuthProvider clientId={CLIENT_ID}>
          <GoogleLogin
            onSuccess={(res) => (res.credential ? onCredential(res.credential) : onError("Google did not return a credential. Try again."))}
            onError={() => onError("Google sign-in failed. Try again or use your email.")}
            theme="outline"
            size="large"
            shape="rectangular"
            text={text}
            width={String(width)}
          />
        </GoogleOAuthProvider>
      ) : null}
    </div>
  );
}
