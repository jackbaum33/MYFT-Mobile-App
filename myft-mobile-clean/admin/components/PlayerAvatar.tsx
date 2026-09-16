"use client";

import { useState } from "react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

/** Player photo with an initials-circle fallback when no image has been uploaded (or it 404s). */
export default function PlayerAvatar({
  src,
  name,
  size = 32,
  className = "",
}: {
  src: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
        className={`flex shrink-0 items-center justify-center rounded-full bg-card font-bold text-yellow ${className}`}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external Firebase Storage URL, not worth Next/Image config
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full bg-navy object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
}
