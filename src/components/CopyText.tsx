"use client";
import { useState } from "react";
export function CopyText({ text, label = "Copy text" }: { text: string; label?: string }) {
  const [state, setState] = useState(label);
  return (
    <button
      type="button"
      className="link copy-action"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("Copied");
        } catch {
          setState("Select the text to copy");
        }
      }}
      aria-live="polite"
    >
      {state}
    </button>
  );
}
