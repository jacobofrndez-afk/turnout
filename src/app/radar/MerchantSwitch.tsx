"use client";
import { useRouter } from "next/navigation";

// One quiet control to switch between demo places.
export default function MerchantSwitch({ current, options, destination = "/radar" }: { destination?: string; current: string; options: { id: string; label: string }[] }) {
  const router = useRouter();
  if (options.length < 2) return null;
  return (
    <label className="inline-flex items-center gap-2 text-[var(--muted)]">
      <span className="sr-only">Place</span>
      <select
        className="field"
        style={{ width: "auto" }}
        value={current}
        onChange={(e) => router.push(`${destination}?merchant=${encodeURIComponent(e.target.value)}`)}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
