import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The native SQLite module stays outside the bundler.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
