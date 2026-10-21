// Server boot hook (Next.js instrumentation). Starts the hourly scan that turns the radar into push:
// every merchant is scanned, the strongest new moment gets its campaign drafted and the merchant is alerted.
// SCAN_EVERY_MIN=0 disables it (tests, builds); the first scan runs one minute after boot.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const everyMin = Number(process.env.SCAN_EVERY_MIN ?? 60);
  if (!Number.isFinite(everyMin) || everyMin <= 0) return;
  const g = globalThis as unknown as { __turnoutScan?: NodeJS.Timeout };
  if (g.__turnoutScan) return; // dev hot reload: keep the one already running
  const { scanAll } = await import("./server/agent/scan");
  const run = async () => {
    const t0 = Date.now();
    try {
      const r = await scanAll();
      console.log(`[scan] ${r.map((x) => `${x.merchant}: ${x.alerts} alert${x.alerts === 1 ? "" : "s"}${x.error ? ` (${x.error})` : ""}`).join("; ")} in ${Math.round((Date.now() - t0) / 1000)} s`);
    } catch (e) {
      console.warn(`[scan] failed: ${String((e as Error).message).slice(0, 200)}`);
    }
  };
  const first = setTimeout(run, 60_000);
  first.unref();
  g.__turnoutScan = setInterval(run, everyMin * 60_000);
  g.__turnoutScan.unref();
  console.log(`[scan] push scan every ${everyMin} min; first run in 60 s`);
}
