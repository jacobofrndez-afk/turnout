"use client";
import { useRouter } from "next/navigation";

// One quiet control to switch between demo places.
export default function MerchantSwitch({ current, options }: { current: string; options: { id: string; label: string }[] }) {
  const router = useRouter();
  if (options.length < 2) return null;
  return (
    <label className="inline-flex items-center gap-2" style={{ color: "var(--muted)" }}>
      <span className="sr-only">Place</span>
      <select
        className="field"
        style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
        value={current}
        onChange={(e) => router.push(`/radar?merchant=${e.target.value}`)}
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
