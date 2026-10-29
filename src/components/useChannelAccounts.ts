"use client";
import { useEffect, useState } from "react";
import type { ChannelAccount } from "@/lib/social-channels";
import type { ConnectionState } from "@/lib/campaign-destination";
export function useChannelAccounts(merchantId: string) {
  const [result, setResult] = useState<{ merchant: string; accounts: ChannelAccount[]; state: ConnectionState } | null>(null);
  useEffect(() => {
    let controller: AbortController | undefined, alive = true;
    async function refresh() {
      controller?.abort(); const current = new AbortController(); controller = current;
      try {
        const response = await fetch(`/api/channels?merchant=${encodeURIComponent(merchantId)}`, { cache: "no-store", signal: current.signal });
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json();
        if (!Array.isArray(data.accounts)) throw new Error("unavailable");
        if (alive && !current.signal.aborted) setResult({ merchant: merchantId, accounts: data.accounts, state: "ready" });
      } catch {
        if (alive && !current.signal.aborted) setResult({ merchant: merchantId, accounts: [], state: "unavailable" });
      }
    }
    function visible() { if (document.visibilityState === "visible") void refresh(); }
    void refresh(); window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", visible);
    return () => { alive = false; controller?.abort(); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", visible); };
  }, [merchantId]);
  // A place switch never renders the previous place's private account while fetching.
  return result?.merchant === merchantId ? result : { merchant: merchantId, accounts: [], state: "loading" as const };
}
