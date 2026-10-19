import Link from "next/link";
import { listMerchants } from "@/server/events/radar";

export const dynamic = "force-dynamic";

export default function Home() {
  const demos = listMerchants().filter((m) => m.id === "m_penn_pour" || m.id === "m_quai_bercy");
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
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/start" className="inline-block rounded-md px-5 py-3 font-medium text-white" style={{ background: "var(--accent)" }}>
          Set up your place
        </Link>
        {demos.map((m) => (
          <Link key={m.id} href={`/radar?merchant=${m.id}`} className="inline-block rounded-md px-5 py-3 font-medium" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            Try {m.name}, {m.city}
          </Link>
        ))}
      </div>
      <p className="mt-6 text-xs" style={{ color: "var(--muted)" }}>
        Qloo results describe what groups tend to like, not what any person will do. No personal data is sent to Qloo.
      </p>
    </main>
  );
}
