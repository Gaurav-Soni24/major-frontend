"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, IconButton, Logo } from "@/components/ui";
import styles from "./landing.module.css";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#teachers", label: "For teachers" },
  { href: "#students", label: "For students" },
  { href: "#integrity", label: "Proctoring and grading" },
];

/** Sticky landing navigation. Collapses to a menu button under 900px (Esc closes). */
export default function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={styles.nav}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className={styles.navInner}>
        <Logo />
        <nav className={styles.navLinks} aria-label="Sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className={styles.navActions}>
          <Button href="/login" variant="ghost" size="sm" className={styles.navSignin}>
            Sign in
          </Button>
          <Button href="/register" size="sm">
            Create a quiz
          </Button>
          <IconButton className={styles.navToggle} icon={open ? "x" : "menu"} label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="landing-menu" onClick={() => setOpen((v) => !v)} />
        </div>
      </div>
      {open ? (
        <nav id="landing-menu" className={styles.navMenu} aria-label="Sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link href="/student" onClick={() => setOpen(false)}>
            Student results
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
