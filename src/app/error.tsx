"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="t-display mt-4">Let’s try that again.</h1>
      <p className="t-lead mt-5">
        Turnout could not load this page. If you were saving a campaign, check
        its delivery details before trying to send again.
      </p>
      <div className="mt-8 flex flex-wrap gap-6 items-center">
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link className="link" href="/today">
          Return to Today
        </Link>
      </div>
    </main>
  );
}
