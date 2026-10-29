"use client";
import { useId, useRef, useState } from "react";
import { CampaignVisualSchema, MAX_VISUAL_BYTES, type CampaignVisual as Visual } from "@/lib/campaign-creative";
import { Icon } from "./Icon";

export function CampaignVisual({ visual, onChange, preview = true }: { visual?: Visual; onChange?: (value: Visual | undefined) => void; preview?: boolean }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function choose(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_VISUAL_BYTES || !file.size) {
      setError("Choose a JPG, PNG or WebP image up to 2 MB."); return;
    }
    setLoading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("This image could not be read.")); reader.readAsDataURL(file); });
      const next = CampaignVisualSchema.parse({ name: file.name.replace(/[/\\\x00-\x1f]/g, "_").slice(0, 120), dataUrl });
      await new Promise<void>((resolve, reject) => { const img = new Image(); img.onload = () => img.naturalWidth && img.naturalHeight ? resolve() : reject(new Error()); img.onerror = () => reject(new Error()); img.src = dataUrl; });
      onChange?.(next);
    } catch { setError("This image could not be opened. Try another JPG, PNG or WebP."); }
    finally { setLoading(false); }
  }
  if (!visual && !onChange) return null;
  return <div className={`campaign-visual ${visual ? "has-visual" : ""}`}>
    {visual && preview && <img src={visual.dataUrl} alt="Your campaign visual" className="campaign-visual-image"/>}
    <div className="campaign-visual-controls">
      {onChange && <><input ref={input} id={id} className="sr-only" tabIndex={-1} aria-hidden="true" type="file" accept="image/jpeg,image/png,image/webp" disabled={loading} aria-label="Upload a campaign visual" onChange={e => { void choose(e.target.files?.[0]); e.target.value = ""; }}/><button type="button" className="visual-add" disabled={loading} onClick={() => input.current?.click()}><Icon name="camera" size={visual?18:28}/><span><strong>{loading ? "Opening image…" : visual ? "Replace visual" : "Add a photo"}</strong>{!visual&&<small>Your offer, your menu, your place</small>}</span>{!visual&&<Icon name="plus" size={17}/>}</button></>}
      {visual ? <><a href={visual.dataUrl} download={visual.name} className="text-link">Download image</a>{onChange && <button type="button" className="text-link" disabled={loading} onClick={() => { setError(""); onChange(undefined); }}>Remove</button>}</> : <span>JPG, PNG or WebP · up to 2 MB</span>}
    </div>
    {error && <p role="alert" className="plan-inline-error">{error}</p>}
  </div>;
}
