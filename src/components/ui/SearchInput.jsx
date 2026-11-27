"use client";

import { cn } from "@/lib/utils/cn";
import Icon from "./Icon";
import styles from "./form.module.css";

/**
 * Search box with a leading icon and a clear button. Controlled: `value` + `onChange(string)`.
 * Combine with `useDebouncedValue` (lib/utils/hooks) before calling the API.
 * @param {{ value: string, onChange: (next: string) => void, placeholder?: string, label?: string, className?: string } & Omit<import("react").InputHTMLAttributes<HTMLInputElement>, "onChange"|"value">} props
 */
export default function SearchInput({ value, onChange, placeholder = "Search", label = "Search", className, ...rest }) {
  return (
    <div className={cn(styles.wrap, className)} role="search">
      <span className={styles.leading}>
        <Icon name="search" size={16} />
      </span>
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(styles.control, styles.hasLeading, value && styles.hasTrailing)}
        {...rest}
      />
      {value ? (
        <span className={styles.trailing}>
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange("")}
            style={{ display: "grid", placeItems: "center", width: 32, height: 32, border: 0, background: "transparent", color: "var(--ink-2)", borderRadius: 4 }}
          >
            <Icon name="x" size={15} />
          </button>
        </span>
      ) : null}
    </div>
  );
}
