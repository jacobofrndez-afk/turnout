/** Delivery is derived from receipts, including campaigns saved by older app versions. */
export type DeliveryReceipt = {
  status: string;
  simulated: number;
  channel: string;
};
export function deliverySummary(receipts: DeliveryReceipt[]) {
  const sent = receipts.filter(
    (r) => !r.simulated && ["sent","delivered","read"].includes(r.status),
  ).length;
  const failed = receipts.filter((r) => r.status.startsWith("failed") || r.status === "undelivered").length;
  const pending = receipts.filter(r=>!r.simulated&&["accepted","queued","sending"].includes(r.status)).length;
  const delivered = receipts.filter(r=>!r.simulated&&["delivered","read"].includes(r.status)).length;
  const paused = receipts.filter(
    (r) => !r.simulated && r.status === "created (paused)",
  ).length;
  const saved = receipts.length - sent - failed - paused - pending;
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
    : pending
      ? "Message awaiting delivery"
    : delivered
      ? "Demo message delivered"
    : sent
      ? "Demo message sent"
      : paused
        ? "Ad created, still paused"
        : "Campaign saved";
  const parts = [
    delivered ? `${delivered} message${delivered>1?"s":""} delivered to the demo number.` : sent
      ? `${sent} message${sent > 1 ? "s" : ""} sent to the demo number.`
      : pending ? "Twilio accepted the request. Delivery has not been confirmed." : "No message has been sent.",
    paused
      ? "The Snapchat ad is paused; it needs creative and activation in Ads Manager."
      : "",
    saved
      ? "Other materials are saved here for manual use. No other automatic publication is scheduled."
      : "",
    failed
      ? `${failed} channel${failed > 1 ? "s" : ""} failed. Check the channel details below.`
      : "",
  ];
  return {
    sent,
    pending,
    delivered,
    failed,
    paused,
    saved,
    status,
    title,
    description: parts.filter(Boolean).join(" "),
  };
}
