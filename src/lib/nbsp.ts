// Units stay with their number, ranges never break at the hyphen, a signed figure gets a true minus.
export const nb = (s: string) =>
  s
    .replace(/(\d) (pm|am|km|m|min|h|guests|people|seats|shows)\b/g, "$1 $2")
    .replace(/(\d)-(\d)/g, "$1‑$2")
    .replace(/\(-(\d)/g, "(−$1");
