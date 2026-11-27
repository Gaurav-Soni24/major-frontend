"use client";

// Loaded with next/dynamic only when a code question is shown, so CodeMirror stays out of the first bundle.
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";

export default function CodeEditor({ value, onChange, language, label }) {
  const extensions = [language === "python" ? python() : javascript({ jsx: false }), EditorView.lineWrapping, EditorView.contentAttributes.of({ "aria-label": label })];
  return (
    <CodeMirror
      value={value}
      height="320px"
      theme="light"
      extensions={extensions}
      onChange={onChange}
      indentWithTab={false}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false, autocompletion: false, closeBrackets: false }}
    />
  );
}
