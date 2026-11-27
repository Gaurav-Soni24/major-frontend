"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RequireTeacher, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils/cn";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import Menu from "@/components/ui/Menu";
import { Skeleton } from "@/components/ui/Skeleton";
import styles from "./TeacherShell.module.css";

/** Sidebar navigation. Extend here when phase B adds screens. `match` decides when an item is "current". */
export const TEACHER_NAV = [
  { href: "/dashboard", label: "Overview", icon: "grid", match: (p) => p === "/dashboard" },
  { href: "/dashboard/quizzes", label: "Quizzes", icon: "file", match: (p) => p.startsWith("/dashboard/quizzes") || p.startsWith("/dashboard/submissions") },
  { href: "/dashboard/create-quiz", label: "Create quiz", icon: "plus", match: (p) => p.startsWith("/dashboard/create-quiz") },
  { href: "/dashboard/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/dashboard/profile") },
];

/** Title shown in the top bar. Longest matching prefix wins. */
const TITLES = [
  ["/dashboard/create-quiz", "Create quiz"],
  ["/dashboard/quizzes", "Quizzes"],
  ["/dashboard/submissions", "Submissions"],
  ["/dashboard/profile", "Profile"],
  ["/dashboard", "Overview"],
];

function titleFor(pathname) {
  const hit = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return hit ? hit[1] : "Quizify";
}

function ShellSkeleton() {
  return (
    <div className={styles.loading} aria-busy="true">
      <span className="sr-only" role="status">
        Loading
      </span>
      <Skeleton width={160} height={20} />
      <Skeleton width="60%" height={14} />
    </div>
  );
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * Teacher app shell: sidebar (drawer on small screens), top bar with the page title and account menu, skip link,
 * and the `RequireTeacher` guard. Wrap every `/dashboard/*` page in it (done once in `app/dashboard/layout.jsx`).
 * Pages render their own `<PageHeader>` (the page's only `h1`) inside.
 *
 * @param {{ children: import("react").ReactNode }} props
 */
export default function TeacherShell({ children }) {
  return (
    <RequireTeacher fallback={<ShellSkeleton />}>
      <Shell>{children}</Shell>
    </RequireTeacher>
  );
}

function Shell({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return undefined;
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key === "Escape") setDrawer(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    if (window.matchMedia("(max-width: 899px)").matches) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  const name = user?.name || "Account";

  return (
    <div className={styles.shell}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <aside id="app-nav" className={cn(styles.sidebar, drawer && styles.open)} aria-label="Primary">
        <div className={styles.brand}>
          <Logo href="/dashboard" />
        </div>
        <nav className={styles.nav}>
          <ul role="list" className={styles.list}>
            {TEACHER_NAV.map((item) => {
              const current = item.match(pathname);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={cn(styles.link, current && styles.current)} aria-current={current ? "page" : undefined} onClick={() => setDrawer(false)}>
                    <Icon name={item.icon} size={18} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      {drawer ? <div className={styles.scrim} onClick={() => setDrawer(false)} aria-hidden="true" /> : null}

      <div className={styles.column}>
        <header className={styles.topbar}>
          <div className={styles.topLeft}>
            <IconButton className={styles.menuBtn} icon="menu" label="Open navigation" aria-expanded={drawer} aria-controls="app-nav" onClick={() => setDrawer((v) => !v)} />
            <p className={styles.pageTitle}>{titleFor(pathname)}</p>
          </div>
          <Menu
            label="Account menu"
            align="end"
            triggerClassName={styles.account}
            trigger={
              <>
                <span className={styles.avatar} aria-hidden="true">
                  {initials(user?.name)}
                </span>
                <span className={styles.accountName}>{name}</span>
                <Icon name="chevron-down" size={14} />
              </>
            }
            items={[
              ...(user?.email ? [{ label: user.email, disabled: true }, { separator: true }] : []),
              { label: "Profile", icon: "user", href: "/dashboard/profile" },
              { label: "Log out", icon: "logout", danger: true, onSelect: logout },
            ]}
          />
        </header>
        <main id="main" tabIndex={-1} className={styles.main}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </div>
  );
}
