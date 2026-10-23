// "Aladdin, Maybe Happy Ending and 31 more shows": a list of names that fits in `max` characters, built to fit
// rather than cut by CSS or a slice, so the noun at the end always survives. Names are added while the whole line
// (tail included) stays within `max`; when none fits, just the count: "34 shows". `total` is the real number of
// members when more exist than were named.
export function memberSummary(names: string[], max: number, noun = "shows", total = names.length): string {
  names = names.map(showName);
  const count = Math.max(total, names.length);
  const one = noun.endsWith("s") ? noun.slice(0, -1) : noun;
  const word = (n: number) => (n === 1 ? one : noun);
  const line = (used: string[]) => {
    const rest = count - used.length;
    if (rest > 0) return `${used.join(", ")} and ${rest} more ${word(rest)}`;
    return used.length <= 1 ? used.join("") : `${used.slice(0, -1).join(", ")} and ${used[used.length - 1]}`;
  };
  let used: string[] = [];
  for (const name of names) {
    const next = [...used, name];
    if (line(next).length > max) break;
    used = next;
  }
  return used.length ? line(used) : `${count} ${word(count)}`;
}

// Ticketmaster suffixes the city onto show and house names ("Schmigadoon! (NY)", "Jacobs Theatre-NY"): a merchant
// in New York does not need it.
export function showName(name: string): string {
  return name.replace(/\s*\((NY|NYC|New York)\)\s*$/i, "").replace(/\s*[-–]\s*NY\s*$/, "").trim();
}

