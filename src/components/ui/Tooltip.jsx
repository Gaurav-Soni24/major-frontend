import { cloneElement, isValidElement, useId } from "react";
import styles from "./Tooltip.module.css";

/**
 * CSS tooltip shown on hover and keyboard focus (after a short delay). The text is wired to the child with
 * `aria-describedby`. Do not hide essential information in a tooltip: it does not appear on touch.
 * @param {{ text: string, side?: "top"|"bottom", children: import("react").ReactElement }} props
 */
export default function Tooltip({ text, side = "top", children }) {
  const uid = useId();
  const id = `tip${uid}`;
  const child = isValidElement(children) ? cloneElement(children, { "aria-describedby": id }) : children;
  return (
    <span className={styles.wrap}>
      {child}
      <span id={id} role="tooltip" className={`${styles.tip} ${side === "bottom" ? styles.bottom : styles.top}`}>
        {text}
      </span>
    </span>
  );
}
