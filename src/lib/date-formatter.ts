// Intl formatters retain native ICU memory that is not reflected in the JS heap.
// Today formats thousands of candidate service times, so reuse formats, not dates.
const formatters = new Map<string, Intl.DateTimeFormat>();
const MAX_FORMATTERS = 64;

export function dateFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify([locale, Object.entries(options).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b))]);
  const existing = formatters.get(key);
  if (existing) return existing;
  const formatter = new Intl.DateTimeFormat(locale, options);
  // Bound the cache even when many different merchant timezones are requested.
  if (formatters.size >= MAX_FORMATTERS) formatters.delete(formatters.keys().next().value!);
  formatters.set(key, formatter);
  return formatter;
}
