"use client";

import { useRef, useState } from "react";
import PlayerPicker, { type PlayerOption } from "./PlayerPicker";
import { submitPlayerPhoto } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import SavedToast from "@/components/SavedToast";
import { card, input, label } from "@/lib/ui";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Vercel Functions hard-cap request bodies at 4.5MB regardless of Next's own
 * serverActions.bodySizeLimit — an unresized phone photo (often 3-10MB+) blows past
 * that and fails as a raw connection error rather than a readable server response.
 * Downscaling + re-encoding client-side keeps uploads reliably small.
 */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // Fall back to the original if the browser can't do canvas compression.
  }
}

export default function UploadForm({ players }: { players: PlayerOption[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);

  const onFileChange = async () => {
    const el = fileInputRef.current;
    const file = el?.files?.[0];
    if (!el || !file) return;

    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      const dt = new DataTransfer();
      dt.items.add(compressed);
      el.files = dt.files;
    } finally {
      setCompressing(false);
    }
  };

  return (
    <form action={submitPlayerPhoto} encType="multipart/form-data" className={`${card} space-y-4`}>
      <div>
        <label className={label}>Your Name</label>
        <PlayerPicker players={players} />
      </div>
      <div>
        <label className={label}>Photo</label>
        <input
          ref={fileInputRef}
          type="file"
          name="photo"
          accept="image/*"
          required
          onChange={onFileChange}
          className={input}
        />
        {compressing && <p className="mt-1 text-xs text-text/60">Preparing photo…</p>}
      </div>
      <SubmitButton pendingText="Uploading…" disabled={compressing}>
        Upload Photo
      </SubmitButton>
      <SavedToast message="Photo uploaded!" />
    </form>
  );
}
