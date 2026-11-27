import { isAnswered } from "./answers.js";

/**
 * Status of one palette cell. `current` is drawn as a ring on top of the answered/unanswered fill,
 * `marked` as a flag; information is never carried by colour alone.
 */
export function cellStatus({ answered, marked, current }) {
  return {
    state: answered ? "answered" : "unanswered",
    marked: !!marked,
    current: !!current,
    label: [answered ? "answered" : "not answered", marked ? "marked for review" : null, current ? "current" : null].filter(Boolean).join(", "),
  };
}

/** Palette model for all questions (order = display order). */
export function buildPalette(questions, answers, marked, currentIndex) {
  return questions.map((q, i) => {
    const id = String(q._id);
    return { index: i, number: i + 1, id, ...cellStatus({ answered: isAnswered(q, answers[id]), marked: marked.has(id), current: i === currentIndex }) };
  });
}

/** Counts and number lists for the progress line and the submit dialog. */
export function summarize(palette) {
  const unanswered = palette.filter((c) => c.state === "unanswered").map((c) => c.number);
  const markedNumbers = palette.filter((c) => c.marked).map((c) => c.number);
  return { total: palette.length, answered: palette.length - unanswered.length, unanswered, marked: markedNumbers };
}

/** "3, 5 and 9" for dialogs. Long lists are cut with a count. */
export function listNumbers(numbers, max = 12) {
  if (!numbers.length) return "";
  if (numbers.length > max) return `${numbers.slice(0, max).join(", ")} and ${numbers.length - max} more`;
  const shown = numbers.map(String);
  return shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}` : shown[0];
}
