import type { Metadata } from "next";
import Link from "next/link";
import { Big_Shoulders, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { Wordmark } from "@/components/Logo";
import "./globals.css";

// Marquise type: Big Shoulders (variable, opsz 10..72) for names and numbers, Instrument Sans for sentences,
// IBM Plex Mono 500 for clock and distances.
const display = Big_Shoulders({ subsets: ["latin"], variable: "--font-display", axes: ["opsz"], display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: "500", variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Turnout",
  description: "Turn the crowd outside into customers inside. An agent for independent merchants, grounded in Qloo taste data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20" style={{ background: "var(--paper)", borderBottom: "1px solid var(--line)" }}>
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
            <Link href="/" aria-label="Turnout home" className="flex shrink-0 items-center">
              <Wordmark size={36} tagline />
            </Link>
            <nav className="flex min-w-0 items-center gap-1 text-sm font-medium">
              <Link href="/today" className="inline-flex min-h-11 items-center whitespace-nowrap px-3 decoration-[1.5px] underline-offset-[6px] hover:underline" style={{ color: "var(--ink)" }}>Today</Link>
              <Link href="/radar" className="inline-flex min-h-11 items-center whitespace-nowrap px-3 decoration-[1.5px] underline-offset-[6px] hover:underline" style={{ color: "var(--ink)" }}>Radar</Link>
              <Link href="/start" className="inline-flex min-h-11 items-center whitespace-nowrap px-3 decoration-[1.5px] underline-offset-[6px] hover:underline" style={{ color: "var(--ink)" }}>
                <span className="hidden sm:inline">Set up your place</span>
                <span className="sm:hidden">Set up</span>
              </Link>
              <a href="https://github.com/qloo/qloo-hackathon-kit" target="_blank" rel="noreferrer" className="ml-2 hidden min-h-11 items-center whitespace-nowrap pl-3 text-xs font-medium decoration-[1.5px] underline-offset-[5px] hover:underline md:inline-flex" style={{ color: "var(--muted)" }}>
                Powered by Qloo
              </a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="mx-auto max-w-6xl px-5 py-10 text-xs" style={{ color: "var(--muted)" }}>
          Qloo results describe what groups tend to like, not what any person will do. No personal data is sent to Qloo. Turnout is built for the Qloo Agentic Hackathon.
        </footer>
      </body>
    </html>
  );
}
