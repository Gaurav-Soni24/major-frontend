"use client";

import dynamic from "next/dynamic";
import { AnswerOption, Input, Textarea, Skeleton } from "@/components/ui";
import { isAllowedNumberInput, isValidNumberText, toggleOption } from "../lib/answers.js";
import styles from "./player.module.css";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => <Skeleton height={320} />,
});

const TEXT_LIMIT = 10000;
const CODE_LIMIT = 20000;

function Choices({ question, value, onChange }) {
  const multiple = question.type === "multiple";
  const order = question.options.map((o) => o.text);
  return (
    <div className={styles.options} role={multiple ? "group" : "radiogroup"} aria-labelledby={`qtext-${question._id}`}>
      {question.options.map((o, i) => {
        const checked = multiple ? Array.isArray(value) && value.includes(o.text) : value === o.text;
        return (
          <AnswerOption
            key={o.text}
            multiple={multiple}
            name={`q-${question._id}`}
            checked={checked}
            data-opt={i + 1}
            onChange={() => onChange(multiple ? toggleOption(value, o.text, order) : o.text)}
          >
            <span className={styles.optKey} aria-hidden="true">
              {i + 1 <= 9 ? i + 1 : ""}
            </span>
            {o.text}
          </AnswerOption>
        );
      })}
      {multiple ? <p className={styles.hintLine}>Select all that apply.</p> : null}
    </div>
  );
}

function IntegerInput({ question, value, onChange }) {
  const text = typeof value === "string" ? value : "";
  const invalid = text.trim() !== "" && !isValidNumberText(text);
  const flipSign = () => {
    const t = text.trim();
    onChange(t.startsWith("-") ? t.slice(1) : `-${t}`);
  };
  return (
    <div className={styles.numberRow}>
      <label htmlFor={`num-${question._id}`} className="sr-only">
        Your answer, a number
      </label>
      <Input
        id={`num-${question._id}`}
        size="lg"
        inputMode="decimal"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Type a number"
        value={text}
        aria-describedby={`numhint-${question._id}`}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const v = e.target.value;
          if (isAllowedNumberInput(v)) onChange(v);
        }}
      />
      <button type="button" className={styles.signBtn} onClick={flipSign} aria-label="Toggle minus sign">
        +/&minus;
      </button>
      <p id={`numhint-${question._id}`} className={invalid ? styles.hintBad : styles.hintLine}>
        {invalid ? "That is not a complete number yet. Examples: 42, -3.5, 1e3." : "Decimals and negative numbers are fine."}
      </p>
    </div>
  );
}

function TextAnswer({ question, value, onChange }) {
  const text = typeof value === "string" ? value : "";
  return (
    <div className={styles.textWrap}>
      <label htmlFor={`txt-${question._id}`} className="sr-only">
        Your answer
      </label>
      <Textarea id={`txt-${question._id}`} rows={8} maxLength={TEXT_LIMIT} value={text} placeholder="Write your answer here" onChange={(e) => onChange(e.target.value)} className={styles.textarea} />
      <p className={styles.count} aria-live="off">
        {text.length.toLocaleString("en-IN")} / {TEXT_LIMIT.toLocaleString("en-IN")} characters
      </p>
    </div>
  );
}

function CodeAnswer({ question, value, onChange }) {
  const current = typeof value === "string" ? value : question.starterCode || "";
  return (
    <div className={styles.codeWrap}>
      <CodeEditor
        value={current}
        language={question.codeLanguage}
        label={`Your ${question.codeLanguage === "python" ? "Python" : "JavaScript"} answer`}
        onChange={(v) => onChange(v.length > CODE_LIMIT ? v.slice(0, CODE_LIMIT) : v)}
      />
      <p className={styles.hintLine}>{question.codeLanguage === "python" ? "Python" : "JavaScript"}. Tab moves to the next control; press Ctrl + ] to indent.</p>
    </div>
  );
}

/** One input per question type. `value` is the stored answer (or undefined). */
export default function QuestionInput({ question, value, onChange }) {
  switch (question.type) {
    case "single":
    case "multiple":
      return <Choices question={question} value={value} onChange={onChange} />;
    case "integer":
      return <IntegerInput question={question} value={value} onChange={onChange} />;
    case "code":
      return <CodeAnswer question={question} value={value} onChange={onChange} />;
    default:
      return <TextAnswer question={question} value={value} onChange={onChange} />;
  }
}
