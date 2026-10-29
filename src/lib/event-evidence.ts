export type SourceCheck = { source: "Ticketmaster"; checkedAt: string; mode: "live" | "cache" | "stored" };

export function sourceCheck(meta?: Record<string, unknown>): SourceCheck | undefined {
  const check = meta?.sourceCheck as Partial<SourceCheck> | undefined;
  if (check?.source !== "Ticketmaster" || typeof check.checkedAt !== "string" || !Number.isFinite(Date.parse(check.checkedAt)) || !["live", "cache", "stored"].includes(check.mode ?? "")) return undefined;
  return check as SourceCheck;
}

// Old rows have no evidence of a current source response. They remain in history, never in the live agenda.
export function recentlyChecked(meta?: Record<string, unknown>, now = Date.now()): boolean {
  const check = sourceCheck(meta);
  if (!check) return false;
  const age = now - Date.parse(check.checkedAt);
  return age >= -60_000 && age <= 6 * 3_600_000;
}

export function sourceUrl(url?: string | null): string | undefined {
  try {
    const parsed = new URL(url ?? "");
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : undefined;
  } catch { return undefined; }
}
