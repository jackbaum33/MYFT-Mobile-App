"use client";

import { useMemo, useState } from "react";
import { input } from "@/lib/ui";

export type PlayerOption = { id: string; name: string; team: string };

export default function PlayerPicker({ players }: { players: PlayerOption[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PlayerOption | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? players.filter((p) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))
      : players;
    return matches.slice(0, 25);
  }, [players, query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={selected ? selected.name : query}
        onChange={(e) => {
          setSelected(null);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search for your name…"
        autoComplete="off"
        className={input}
      />
      <input type="hidden" name="playerId" value={selected?.id ?? ""} required />

      {open && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-navy shadow-lg">
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-text/50">No players found.</li>}
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={() => {
                  setSelected(p);
                  setQuery(p.name);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-card"
              >
                {p.name} <span className="text-text/50">— {p.team}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
