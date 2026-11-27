"use client";

import { createContext, useContext } from "react";

/**
 * What every panel needs: the draft, the dispatcher, `errorFor(key)`/`touch(key)` for field messages,
 * `readOnly` flags for a locked quiz, and the AI helpers. Built once in QuizEditor.
 */
const EditorContext = createContext(null);

export const EditorProvider = EditorContext.Provider;

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside <EditorProvider>");
  return ctx;
}
