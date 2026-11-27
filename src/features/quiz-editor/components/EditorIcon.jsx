import { Icon } from "@/components/ui";

/** Editor-only line icons (same 24px, 1.75 stroke language as the ui kit). Falls back to the ui kit's Icon. */
const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const PATHS = {
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  undo: "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  redo: "m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13",
  "arrow-up": "M12 19V5M6 11l6-6 6 6",
  "arrow-down": "M12 5v14M6 13l6 6 6-6",
  sliders: "M4 7h9M17 7h3M4 17h3M11 17h9M13 5v4M7 15v4",
  single: `${circle(12, 12, 8)}${circle(12, 12, 2.5)}`,
  multiple: "M5 5h14v14H5zM8.5 12.5l2.5 2.5 4.5-5.5",
  textlines: "M5 7h14M5 12h14M5 17h9",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  doc: "M7 3h8l4 4v14H7zM14 3v5h5M10 13h6M10 17h6",
  wand: "M5 19 17 7M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.3L21 14l-1.3.7L19 16l-.7-1.3L17 14l1.3-.7z",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
};

/** @param {{ name: string, size?: number, className?: string, title?: string }} props */
export default function EditorIcon({ name, size = 18, className, title }) {
  const d = PATHS[name];
  if (!d) return <Icon name={name} size={size} className={className} title={title} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

/** Icon name for a question type. */
export const TYPE_ICON = { single: "single", multiple: "multiple", integer: "hash", text: "textlines", code: "code" };
