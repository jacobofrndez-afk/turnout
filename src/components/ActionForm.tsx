"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
export function ActionForm({
  action,
  children,
  label,
  pendingLabel = "Working…",
  className = "",
}: {
  action: string;
  children?: ReactNode;
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const submitted = useRef(false);
  useEffect(() => {
    const reset = () => {
      submitted.current = false;
      setPending(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  return (
    <form
      action={action}
      method="post"
      className={className}
      onSubmit={(e) => {
        if (submitted.current) {
          e.preventDefault();
          return;
        }
        submitted.current = true;
        setPending(true);
      }}
    >
      {children}
      <button
        disabled={pending}
        aria-busy={pending}
        className="btn btn-accent btn-lg"
      >
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
