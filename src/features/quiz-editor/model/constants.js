/** Limits mirror docs/API_CONTRACT.md ("Quizzes"). Keep in sync with backend/validators/quiz.js. */

export const LIMITS = {
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 1000,
  instructionsMax: 20,
  instructionMax: 300,
  timeLimitMin: 1,
  timeLimitMax: 600,
  passingMin: 1,
  passingMax: 100,
  customFieldsMax: 5,
  customFieldNameMax: 40,
  passwordMax: 64,
  strikesMin: 1,
  strikesMax: 10,
  questionsMin: 1,
  questionsMax: 100,
  questionTextMax: 4000,
  marksMax: 100,
  optionsMin: 2,
  optionsMax: 8,
  optionTextMax: 500,
  referenceMax: 4000,
  starterCodeMax: 8000,
};

/** @type {ReadonlyArray<"single"|"multiple"|"integer"|"text"|"code">} */
export const QUESTION_TYPES = ["single", "multiple", "integer", "text", "code"];

export const TYPE_LABEL = {
  single: "Single choice",
  multiple: "Multiple choice",
  integer: "Number",
  text: "Written answer",
  code: "Code",
};

export const TYPE_SHORT = {
  single: "Single",
  multiple: "Multiple",
  integer: "Number",
  text: "Written",
  code: "Code",
};

export const CODE_LANGUAGES = ["javascript", "python"];

export const DIFFICULTIES = ["easy", "medium", "hard"];

export const isChoice = (type) => type === "single" || type === "multiple";
