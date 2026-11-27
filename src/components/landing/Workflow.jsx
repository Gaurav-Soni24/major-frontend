"use client";

import { useEffect, useRef, useState } from "react";
import { CreateMock, ResultsMock, ShareMock } from "./Mocks";
import styles from "./landing.module.css";

const STEPS = [
  {
    no: "01",
    title: "Create or generate",
    text: "Write questions by hand, or paste a syllabus and choose how many of each type you want. Gemini drafts them, you review and edit every one before anything is published.",
    Mock: CreateMock,
  },
  {
    no: "02",
    title: "Publish and share a link",
    text: "Set a time limit, a passing score, an optional password and any extra fields you need, such as a roll number. Publish, copy the link, send it. Students sign in with Google and attempt in the browser.",
    Mock: ShareMock,
  },
  {
    no: "03",
    title: "Review marks and flags",
    text: "Objective answers are marked the moment a student submits. Written and code answers are graded by AI against your rubric. Open any submission to see each answer, the marks, and the snapshots flagged during the attempt.",
    Mock: ResultsMock,
  },
];

/**
 * Three-step workflow. On wide screens the steps scroll past a sticky stage that swaps to the matching screen;
 * on narrow screens each step carries its own screen inline. All text is in the DOM either way.
 */
export default function Workflow() {
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.step));
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className={styles.flow}>
      <ol className={styles.steps} role="list">
        {STEPS.map((s, i) => (
          <li
            key={s.no}
            data-step={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`${styles.step} ${i === active ? styles.stepActive : ""}`}
          >
            <span className={styles.stepNo}>{s.no}</span>
            <div>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepText}>{s.text}</p>
              <div className={styles.stepInline}>
                <s.Mock />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.stageSticky}>
          {STEPS.map((s, i) => (
            <div key={s.no} className={`${styles.stagePane} ${i === active ? styles.stagePaneOn : ""}`}>
              <s.Mock />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
