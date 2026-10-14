import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native and process-spawning packages must stay outside the bundler.
  serverExternalPackages: ["better-sqlite3", "@modelcontextprotocol/sdk", "@qloo/qloo-harness"],
};

export default nextConfig;
