/** Authored 24px line icons (1.75 stroke, round caps). Decorative by default (aria-hidden). */

/** @param {number} cx @param {number} cy @param {number} r */
const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const PATHS = {
  check: "M4 12.5 9.5 18 20 6",
  x: "M6 6l12 12M18 6 6 18",
  "chevron-down": "m6 9 6 6 6-6",
  "chevron-up": "m6 15 6-6 6 6",
  "chevron-left": "m15 6-6 6 6 6",
  "chevron-right": "m9 6 6 6-6 6",
  "arrow-right": "M5 12h14M13 6l6 6-6 6",
  "arrow-left": "M19 12H5M11 6l-6 6 6 6",
  search: `${circle(11, 11, 6.5)}M16 16l4.5 4.5`,
  menu: "M4 7h16M4 12h16M4 17h16",
  plus: "M12 5v14M5 12h14",
  copy: "M9 9h11v11H9zM5 15V5h10",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3",
  user: `${circle(12, 8, 4)}M4 20a8 8 0 0 1 16 0`,
  logout: "M9 4H5v16h4M16 8l4 4-4 4M20 12H9",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  file: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  clock: `${circle(12, 12, 9)}M12 7v5l3 2`,
  camera: `M4 8h3l2-3h6l2 3h3v11H4z${circle(12, 13.5, 3.5)}`,
  eye: `M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z${circle(12, 12, 3)}`,
  "eye-off": `M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM4 4l16 16${circle(12, 12, 3)}`,
  external: "M14 4h6v6M20 4l-9 9M18 14v5H5V6h5",
  alert: "M12 4 3 20h18zM12 10v4M12 17.5v.01",
  info: `${circle(12, 12, 9)}M12 11v5M12 8v.01`,
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16v4M17 18h4",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  pencil: "M4 20l1-4L16 5l3 3L8 19zM14 7l3 3",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  window: "M3 5h18v14H3zM3 9h18",
  clipboard: "M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h4",
  code: "m8 7-5 5 5 5M16 7l5 5-5 5M14 5l-4 14",
  hash: "M5 9h15M4 15h15M10 4 8 20M16 4l-2 16",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  save: "M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6",
  play: "M7 4v16l13-8z",
  flag: "M5 21V4M5 4h12l-2 4 2 4H5",
  "arrow-up": "M12 19V5M6 11l6-6 6 6",
  "arrow-down": "M12 5v14M6 13l6 6 6-6",
  undo: "M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12",
  redo: "m15 7 5 5-5 5M20 12H10a6 6 0 0 0 0 12",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};

/**
 * @param {{ name: keyof typeof PATHS, size?: number, className?: string, title?: string }} props
 */
export default function Icon({ name, size = 18, className, title }) {
  const d = PATHS[name];
  if (!d) {
    if (process.env.NODE_ENV !== "production") console.warn(`[ui/Icon] unknown icon "${name}"`);
    return null;
  }
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

export const ICON_NAMES = Object.keys(PATHS);
