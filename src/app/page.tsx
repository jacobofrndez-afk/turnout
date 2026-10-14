import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm uppercase tracking-widest" style={{ color: "var(--accent-2)" }}>
        Qloo Agentic Hackathon
      </p>
      <h1 className="mt-3 text-4xl font-semibold">Crowd to Campaign</h1>
      <p className="mt-4 text-lg" style={{ color: "var(--muted)" }}>
        An agent for independent merchants. When a crowd is about to gather nearby, it learns what that crowd
        loves through Qloo, picks the offer that fits, writes the campaign, and publishes it once you approve.
      </p>
      <Link
        href="/radar"
        className="mt-8 inline-block rounded-md px-5 py-3 font-medium text-white"
        style={{ background: "var(--accent)" }}
      >
        Open the radar
      </Link>
    </main>
  );
}
