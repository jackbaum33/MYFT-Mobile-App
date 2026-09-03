"use client";

import { useState } from "react";
import { input } from "@/lib/ui";

/** Color swatch picker paired with a free-text hex field, kept in sync. Only the text field submits. */
export default function ColorInput({ name, defaultValue = "#00274C" }: { name: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-10 w-12 shrink-0 rounded-lg border border-line bg-navy"
        aria-label="Pick team color"
      />
      <input
        type="text"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="#00274C"
        pattern="^#[0-9A-Fa-f]{6}$"
        title="Hex color, e.g. #00274C"
        className={`${input} font-mono`}
      />
    </div>
  );
}
