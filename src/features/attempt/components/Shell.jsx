"use client";

import { Logo, Icon, Button } from "@/components/ui";
import styles from "./screens.module.css";

/** Page frame for every screen except the player: logo, optional signed-in identity, one main landmark. */
export default function Shell({ student, onSignOut, narrow = false, children }) {
  return (
    <div className={styles.page}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className={styles.head}>
        <div className={styles.headInner}>
          <Logo href={null} size={26} />
          {student ? (
            <div className={styles.who}>
              <span className={styles.whoName}>{student.name || student.email}</span>
              {onSignOut ? (
                <Button variant="ghost" size="sm" onClick={onSignOut}>
                  Not you? Sign out
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      <main id="main" className={`${styles.main} ${narrow ? styles.narrow : ""}`} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

/** Inline notice with an icon (never colour alone). */
export function Notice({ tone = "info", children, role }) {
  const cls = tone === "error" ? styles.noticeError : tone === "warn" ? styles.noticeWarn : styles.noticeInfo;
  return (
    <div className={`${styles.notice} ${cls}`} role={role || (tone === "error" ? "alert" : undefined)}>
      <Icon name={tone === "info" ? "info" : "alert"} size={16} />
      <div>{children}</div>
    </div>
  );
}
