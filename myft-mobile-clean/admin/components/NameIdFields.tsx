"use client";

import { useState } from "react";
import { slugify } from "@/lib/utils";
import { input, label } from "@/lib/ui";

export default function NameIdFields({
  defaultName = "",
  defaultId = "",
}: {
  defaultName?: string;
  defaultId?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [id, setId] = useState(defaultId);
  const [idTouched, setIdTouched] = useState(false);

  return (
    <>
      <div>
        <label className={label}>Name</label>
        <input
          type="text"
          name="name"
          required
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!idTouched) setId(slugify(e.target.value));
          }}
          className={input}
        />
      </div>
      <div>
        <label className={label}>Player ID (auto-suggested, editable)</label>
        <input
          type="text"
          name="id"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setIdTouched(true);
          }}
          className={input}
        />
      </div>
    </>
  );
}
