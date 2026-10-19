import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { Wordmark } from "@/components/Logo";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["opsz", "SOFT"], style: ["normal", "italic"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Turnout",
  description: "Turn the crowd outside into customers inside. An agent for independent merchants, grounded in Qloo taste data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20" style={{ background: "rgba(247,244,238,0.85)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
            <Link href="/" aria-label="Turnout home">
              <Wordmark size={20} tagline />
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/radar" className="rounded-full px-3 py-1.5 hover:bg-white" style={{ color: "var(--ink)" }}>Radar</Link>
              <Link href="/start" className="rounded-full px-3 py-1.5 hover:bg-white" style={{ color: "var(--ink)" }}>Set up your place</Link>
              <a href="https://github.com/qloo/qloo-hackathon-kit" target="_blank" rel="noreferrer" className="ml-2 rounded-full px-3 py-1.5 text-xs" style={{ border: "1px solid var(--line-strong)", color: "var(--muted)" }}>
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
