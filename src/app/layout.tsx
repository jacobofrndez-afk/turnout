import { BRAND } from "@/lib/brand-copy";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Big_Shoulders, Instrument_Sans } from "next/font/google";
import { Wordmark } from "@/components/Logo";
import "./globals.css";
import "./workspace.css";
import { AppNav } from "@/components/AppNav";

// Brand typography stays distinct from the compact application interface.
const display = Big_Shoulders({ subsets: ["latin"], variable: "--font-display", axes: ["opsz"], display: "swap", adjustFontFallback: false });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Turnout",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  description: BRAND.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="workspace-header">
          <div className="workspace-header-inner">
            <Link href="/today" aria-label="Turnout home" className="flex shrink-0 items-center">
              <Wordmark size={32} phone={29} />
            </Link>
            <Suspense fallback={<span className="nav-loading">Your workspace</span>}><AppNav /></Suspense>
          </div>
        </header>
        {children}
        <footer className="workspace-footer"><span>Turnout · {BRAND.tagline}</span><Link href="/about">The Turnout promise</Link></footer>
      </body>
    </html>
  );
}
