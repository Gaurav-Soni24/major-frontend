"use client";

import { useMemo } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";

/**
 * Starter-code editor. Loaded lazily (next/dynamic, ssr: false) so CodeMirror stays out of the main editor bundle.
 * @param {{ value: string, onChange: (v: string) => void, language: "javascript"|"python", label: string, readOnly?: boolean, onBlur?: () => void }} props
 */
export default function CodeField({ value, onChange, language, label, readOnly = false, onBlur }) {
  const extensions = useMemo(
    () => [language === "python" ? python() : javascript(), EditorView.contentAttributes.of({ "aria-label": label }), EditorView.lineWrapping],
    [language, label],
  );
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      extensions={extensions}
      readOnly={readOnly}
      theme="light"
      minHeight="140px"
      maxHeight="320px"
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
    />
  );
}
