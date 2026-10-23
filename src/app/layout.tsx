import type { Metadata } from "next";
import Link from "next/link";
import { Big_Shoulders, Instrument_Sans } from "next/font/google";
import { Wordmark } from "@/components/Logo";
import "./globals.css";

// Velours type: Big Shoulders (variable, opsz 10..72) for names and numbers, Instrument Sans for sentences, clocks and distances (tabular).
const display = Big_Shoulders({ subsets: ["latin"], variable: "--font-display", axes: ["opsz"], display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Turnout",
  description: "Turn the crowd outside into customers inside. An agent for independent merchants, grounded in Qloo taste data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20" style={{ background: "var(--paper)" }}>
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:h-[76px]">
            <Link href="/" aria-label="Turnout home" className="flex shrink-0 items-center">
              <Wordmark size={44} phone={34} />
            </Link>
            <nav className="flex min-w-0 items-center gap-1 text-[15px] font-medium">
              <Link href="/today" className="inline-flex min-h-11 items-center whitespace-nowrap px-3 text-[var(--ink)] transition-colors hover:text-[var(--wine)]">Today</Link>
              <Link href="/radar" className="inline-flex min-h-11 items-center whitespace-nowrap px-3 text-[var(--ink)] transition-colors hover:text-[var(--wine)]">Radar</Link>
              <Link href="/start" className="inline-flex min-h-11 items-center whitespace-nowrap px-3 text-[var(--ink)] transition-colors hover:text-[var(--wine)]">
                <span className="hidden sm:inline">Set up your place</span>
                <span className="sm:hidden">Set up</span>
              </Link>
              <a href="https://github.com/qloo/qloo-hackathon-kit" target="_blank" rel="noreferrer" className="ml-2 -mr-3 hidden min-h-11 items-center whitespace-nowrap px-3 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--plum)] md:inline-flex">
                Powered by Qloo
              </a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="mx-auto max-w-6xl px-5 pb-12 pt-24">
          <p className="measure text-sm text-[var(--muted)]">Qloo results describe what groups tend to like, not what any person will do. No personal data is sent to Qloo. Turnout is built for the Qloo Agentic Hackathon.</p>
        </footer>
      </body>
    </html>
  );
}
