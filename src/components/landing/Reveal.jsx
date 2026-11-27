"use client";

import { useEffect, useRef } from "react";
import styles from "./landing.module.css";

/**
 * Scroll reveal that never hides content by default.
 * Server HTML and no-JS users see everything. After hydration, only blocks that start below the fold are
 * marked pending and then revealed (fade + 8px rise) when they scroll into view. Reduced motion: no effect.
 *
 * @param {{ as?: any, delay?: number, className?: string, children: import("react").ReactNode } & Record<string, any>} props
 */
export default function Reveal({ as: Tag = "div", delay = 0, className, children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return undefined;
    if (el.getBoundingClientRect().top < window.innerHeight) return undefined;
    el.dataset.reveal = "pending";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.reveal = "in";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`${styles.reveal} ${className || ""}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined} {...rest}>
      {children}
    </Tag>
  );
}
