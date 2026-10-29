import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { provider } from "@/server/agent/run";
const binary = () => resolve(/* turbopackIgnore: true */ process.cwd(), ".tmp/photo-ocr/read-menu");
export function photoReaderMode(): "local" | "connected" | "manual" {
  if (process.env.PHOTO_READER === "manual") return "manual";
  if (process.platform === "darwin" && existsSync(binary())) return "local";
  return provider() === "anthropic" ? "connected" : "manual";
}
export type ReadLine = { text: string; confidence: number };
export function menuFromLines(lines: ReadLine[]) {
  // Keep uncertain associations visible for review. Never guess a missing currency or price.
  const money = /(?:[$€£]\s*\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s*(?:€|\$|£|EUR\b|USD\b|GBP\b))/i;
  const offers: { title: string; description: string; price: string }[] = [];
  const text = lines.map(l => l.text.trim()).filter(Boolean);
  for (let i = 0; i < text.length && offers.length < 12; i++) {
    const match = text[i].match(money);
    if (!match) continue;
    const remainder = text[i].replace(match[0], "").replace(/^[\s.·:—–-]+|[\s.·:—–-]+$/g, "");
    const title = remainder || (i > 0 && !money.test(text[i-1]) ? text[i-1] : "");
    if (title) offers.push({ title: title.slice(0,100), description: "", price: match[0] });
  }
  return { offers, uncertainty: "Check every item and price against the photo, especially columns, handwritten text and which price belongs to which item. Unpriced items are not turned into offers.", transcription: text.join("\n").slice(0,8000) };
}
export async function readMenuLocally(bytes: Buffer) {
  const output = await new Promise<string>((resolve, reject) => {
    const child = execFile(binary(), [], { timeout: 20_000, maxBuffer: 128 * 1024 }, (err, stdout) => err ? reject(err) : resolve(stdout));
    child.stdin?.on("error", reject); child.stdin?.end(bytes);
  });
  return menuFromLines(JSON.parse(output) as ReadLine[]);
}
