/** Delivery is derived from receipts, including campaigns saved by older app versions. */
export type DeliveryReceipt = {
  status: string;
  simulated: number;
  channel: string;
};
export function deliverySummary(receipts: DeliveryReceipt[]) {
  const sent = receipts.filter(
    (r) => !r.simulated && r.status === "sent",
  ).length;
  const failed = receipts.filter((r) => r.status.startsWith("failed")).length;
  const paused = receipts.filter(
    (r) => !r.simulated && r.status === "created (paused)",
  ).length;
  const saved = receipts.length - sent - failed - paused;
  const status =
    failed && !sent && !paused
      ? "failed"
      : sent && (failed || paused || saved)
        ? "partial"
        : sent
          ? "sent"
          : "prepared";
  const title = failed
    ? sent || paused
      ? "Some channels need attention"
      : "Sending failed"
    : sent
      ? "Demo message sent"
      : paused
        ? "Ad created, still paused"
        : "Campaign saved";
  const parts = [
    sent
      ? `${sent} message${sent > 1 ? "s" : ""} sent to the demo number.`
      : "No message has been sent.",
    paused
      ? "The Snapchat ad is paused; it needs creative and activation in Ads Manager."
      : "",
    saved
      ? "Other materials are saved here for manual use. Nothing is queued for automatic delivery."
      : "",
    failed
      ? `${failed} channel${failed > 1 ? "s" : ""} failed. Check the channel details below.`
      : "",
  ];
  return {
    sent,
    failed,
    paused,
    saved,
    status,
    title,
    description: parts.filter(Boolean).join(" "),
  };
}
