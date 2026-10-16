// Loads .env.local for scripts run outside Next.js (Next loads it on its own).
// Existing environment variables win. Relative QLOO_HOME / TMPDIR are resolved against the project root.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnv(root = process.cwd()): void {
  const file = resolve(root, ".env.local");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  for (const k of ["QLOO_HOME", "TMPDIR"]) {
    const v = process.env[k];
    if (v?.startsWith("./")) process.env[k] = resolve(root, v);
  }
  process.env.QLOO_HOME ??= resolve(root, ".qloo");
  process.env.QLOO_BASE_URL ??= "https://hackathon.api.qloo.com";
  process.env.QLOO_TRUSTED_BASE_URL ??= "https://hackathon.api.qloo.com";
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. Add it to .env.local (see .env.example).`);
  return v;
}
