"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styles from "./detail.module.css";

// CodeMirror is heavy: it is only fetched when a code answer is actually on screen.
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <pre className={styles.codeFallback}>Loading code…</pre>,
});

/**
 * Read-only code view. `language` is "javascript" | "python" (anything else shows plain text).
 * @param {{ value: string, language?: string, label: string }} props
 */
export default function CodeView({ value, language, label }) {
  const [extensions, setExtensions] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = language === "python" ? import("@codemirror/lang-python").then((m) => m.python()) : language === "javascript" ? import("@codemirror/lang-javascript").then((m) => m.javascript()) : Promise.resolve(null);
    load.then((ext) => alive && setExtensions(ext ? [ext] : []));
    return () => {
      alive = false;
    };
  }, [language]);

  return (
    <div className={styles.code} role="group" aria-label={label}>
      <CodeMirror
        value={value}
        readOnly
        editable={false}
        theme="light"
        maxHeight="320px"
        extensions={extensions}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
      />
    </div>
  );
}
