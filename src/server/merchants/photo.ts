import { z } from "zod";
export const MenuCaptureSchema = z.object({
  offers: z.array(z.object({ title: z.string().max(100), description: z.string().max(240), price: z.string().max(40) })).max(12),
  uncertainty: z.string().max(500),
});
export function imageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (Buffer.from(bytes.slice(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (Buffer.from(bytes.slice(0, 4)).toString() === "RIFF" && Buffer.from(bytes.slice(8, 12)).toString() === "WEBP") return "image/webp";
}
