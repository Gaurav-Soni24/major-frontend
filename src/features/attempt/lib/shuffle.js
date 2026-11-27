/**
 * Deterministic shuffling. The same seed always gives the same order, so a reload shows the
 * questions and options exactly where the student left them.
 */

/** xmur3 string hash -> 32-bit seed */
export function hashSeed(str) {
  const s = String(str);
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** mulberry32 PRNG: () => float in [0, 1) */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates on a copy. */
export function seededShuffle(items, seed) {
  const out = items.slice();
  const rand = seededRandom(hashSeed(String(seed)));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const idOf = (q) => String(q && q._id != null ? q._id : "");

/**
 * Questions in the order the student sees them. The base order is the author's order
 * (originalIndex), so the result does not depend on how the server returned them.
 */
export function orderQuestions(questions, { shuffle, seed }) {
  const base = (questions || [])
    .map((q, i) => ({ q, i }))
    .sort((a, b) => (a.q.originalIndex ?? a.i) - (b.q.originalIndex ?? b.i) || a.i - b.i)
    .map((x) => x.q);
  return shuffle ? seededShuffle(base, `${seed}:questions`) : base;
}

/**
 * Options in a stable order. When shuffling, the server's (random) order is ignored: options are
 * put into a canonical order (by text) and then shuffled with the seed. When not shuffling the
 * server's order is the author's order and is kept.
 */
export function orderOptions(question, { shuffle, seed }) {
  const options = question.options || [];
  if (!shuffle) return options;
  const canonical = options.slice().sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));
  return seededShuffle(canonical, `${seed}:${idOf(question)}`);
}

/** Full prepared list: questions in order, each with its options in order. */
export function prepareQuestions(quiz, seed) {
  const settings = (quiz && quiz.settings) || {};
  return orderQuestions(quiz.questions, { shuffle: !!settings.shuffleQuestions, seed }).map((q) =>
    q.options ? { ...q, options: orderOptions(q, { shuffle: !!settings.shuffleOptions, seed }) } : q,
  );
}
