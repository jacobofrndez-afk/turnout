import { z } from "zod";
export const SourceKey = z.enum(["trends", "openAgenda", "social"]);
export type SourceKey = z.infer<typeof SourceKey>;
export type PublicAccount = { did: string; handle: string; name: string };
export type SourceSettings = { trends: boolean; openAgenda: boolean; social: boolean; accounts: PublicAccount[]; version: number };
export const SourceChange = z.discriminatedUnion("action", [
  z.object({ action: z.literal("toggle"), key: SourceKey, enabled: z.boolean(), version: z.number().int().nonnegative() }),
  z.object({ action: z.literal("follow"), handle: z.string().trim().min(3).max(253), version: z.number().int().nonnegative() }),
  z.object({ action: z.literal("remove"), did: z.string().max(200), version: z.number().int().nonnegative() }),
]);
/** A handle, never an arbitrary fetch URL. Resolution stays on Bluesky's public API. */
export function publicHandle(input: string): string | null {
  const handle = input.trim().replace(/^@/, "").toLowerCase();
  return /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]*[a-z0-9]$/.test(handle) ? handle : null;
}
