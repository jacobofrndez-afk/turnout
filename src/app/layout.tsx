import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crowd to Campaign",
  description: "Turn tonight's crowd into a campaign your neighbors will actually like. Powered by Qloo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
