# Quizify UI components ("Mark Scheme")

Import from the barrel: `import { Button, Field, Input, Badge } from "@/components/ui";`
Tokens live in `src/styles/tokens.css` (see `docs/DESIGN.md`). Use CSS variables, never raw hex. Light theme only.
Components with handlers are client components; the barrel is safe to import from server components.

| Component | Key props / notes |
|---|---|
| `Button` | `variant` primary/secondary/ghost/danger, `size` sm/md/lg, `loading`, `block`, `iconLeft`/`iconRight` (Icon name), `href` renders a Next Link |
| `IconButton` | `icon`, `label` (required, accessible name), `size`, `variant` |
| `Field` | `label`, `hint`, `error` (role=alert), `required`, `optional`, `hideLabel`. Child is one control (cloned with id, aria-describedby, aria-invalid) or `(props) => node` |
| `Input` / `Textarea` / `Select` | native props; `Input` has `size` md/lg, `leading`, `trailing`; `Textarea` `mono`; `Select` `options=[{value,label}]` or children |
| `Checkbox` / `Radio` | `label`, `hint`, native input props |
| `AnswerOption` | player/review option. `multiple` (square) vs single (round), pen-red tick when checked, `state` correct/wrong/missed, `stateLabel` |
| `Switch` | `checked`, `onChange(bool)`, `label`, `hint` |
| `Badge` | `status` (published, draft, in-progress, submitted, graded, needs-review, flagged, passed, failed) or `tone` |
| `Mark` | `value`, optional `obtained`: `[2]` / `[1.5 / 2]` |
| `Tick` | `size`, `animate` (120ms draw), `color`, `title` |
| `Panel` | `title`, `description`, `actions`, `padded`, `headingLevel` |
| `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell` | `caption` required; `numeric`, `mono` on cells; `maxHeight` for sticky header; `onClick`/`selected` on rows |
| `Tabs` + `TabPanel` | `tabs=[{id,label,count}]`, `value`, `onChange`, `label`, `idPrefix` |
| `Dialog` / `ConfirmDialog` | native `<dialog>`: focus trap, Esc, scroll lock. `open`, `onClose`, `title`, `description`, `footer`, `size`, `dismissible`. Confirm: `onConfirm`, `confirmLabel`, `tone`, `loading` |
| `Menu` | `label`, `trigger`, `items=[{label,onSelect,href,icon,danger,disabled}\|{separator:true}]`, `align`; arrow keys, Esc, outside click |
| `Tooltip` | `text`, `side`; hover and focus only |
| `AppToaster`, `toast` | mounted once in root layout; `toast.success()` / `toast.error()` |
| `Skeleton`, `SkeletonText` | `width`, `height`, `lines` |
| `EmptyState` | `title`, children (one sentence), `action`, `compact` |
| `Pagination` | `page` (1-based), `pages`, `onChange`, `total` |
| `SearchInput` | `value`, `onChange(string)`; debounce with `useDebouncedValue` from `@/lib/utils/hooks` |
| `SegmentedControl` | `options`, `value`, `onChange`, `label`, `size` |
| `ProgressBar` | `value`, `max`, `label`, `tone` |
| `Stat`, `StatStrip` | label + figure in a ruled strip (not cards) |
| `PageHeader` | `title` (the page's only h1), `description`, `actions` |
| `CopyField` | `value`, `label`; Copy button with polite "Copied" announcement |
| `Logo`, `LogoMark` | `href`, `size`, `wordmark` |
| `Icon` | `name` from `ICON_NAMES`, `size`, `title` (decorative if omitted) |
| `Spinner` | `size`, `label` |

Rules: no nested panels, no icon-card grids, no gradients, marks always in brackets (`Mark`), buttons name their action.
