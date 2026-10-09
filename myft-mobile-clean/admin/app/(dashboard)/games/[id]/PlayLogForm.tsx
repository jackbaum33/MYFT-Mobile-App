"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { STAT_FIELDS } from "@/lib/types";
import { addPlayLogEntries } from "../actions";
import SubmitButton from "@/components/SubmitButton";
import { select, input, btnSecondary } from "@/lib/ui";

export type RosterOption = { id: string; name: string; team: string; jerseyNumber?: number };

type Row = { rid: number; playerId: string; query: string; statKey: string };

function playerLabel(p: RosterOption): string {
  return p.jerseyNumber !== undefined ? `#${p.jerseyNumber} ${p.name}` : p.name;
}

/** Type-to-filter player picker: matches by name OR jersey number, since calling out a
 * jersey number during a live game is faster than reading a roster for a name. */
function PlayerPicker({
  roster,
  row,
  onChange,
}: {
  roster: RosterOption[];
  row: Row;
  onChange: (next: Partial<Row>) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const matches = useMemo(() => {
    const q = row.query.trim().toLowerCase();
    if (!q) return roster.slice(0, 8);
    return roster
      .filter((p) => p.name.toLowerCase().includes(q) || (p.jerseyNumber !== undefined && String(p.jerseyNumber).includes(q)))
      .slice(0, 8);
  }, [roster, row.query]);

  return (
    <div ref={wrapRef} className="relative min-w-[14rem] flex-1">
      <input
        type="text"
        className={input}
        placeholder="Name or #jersey…"
        value={row.query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange({ query: e.target.value, playerId: "" });
          setOpen(true);
        }}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-navy shadow-lg">
          {matches.map((p) => (
            <button
              type="button"
              key={p.id}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-text hover:bg-white/10"
              onClick={() => {
                onChange({ playerId: p.id, query: playerLabel(p) });
                setOpen(false);
              }}
            >
              <span>{p.name}</span>
              <span className="shrink-0 text-xs text-text/50">
                {p.jerseyNumber !== undefined ? `#${p.jerseyNumber} • ` : ""}
                {p.team}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayLogForm({
  gameId,
  team1: { roster: team1Roster },
  team2: { roster: team2Roster },
}: {
  gameId: string;
  team1: { name: string; roster: RosterOption[] };
  team2: { name: string; roster: RosterOption[] };
}) {
  const nextRid = useRef(1);
  const [rows, setRows] = useState<Row[]>([{ rid: 0, playerId: "", query: "", statKey: "" }]);
  const [error, setError] = useState<string | null>(null);

  const roster = useMemo(() => [...team1Roster, ...team2Roster], [team1Roster, team2Roster]);

  const updateRow = (rid: number, next: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.rid === rid ? { ...r, ...next } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { rid: nextRid.current++, playerId: "", query: "", statKey: "" }]);
  const removeRow = (rid: number) => setRows((prev) => prev.filter((r) => r.rid !== rid));

  const action = addPlayLogEntries.bind(null, gameId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (rows.some((r) => !r.playerId || !r.statKey)) {
      e.preventDefault();
      setError("Pick a player (from the dropdown) and a stat for every row before logging.");
      return;
    }
    setError(null);
  };

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="rowCount" value={rows.length} />
      {rows.map((row, i) => (
        <div key={row.rid} className="flex flex-wrap gap-2">
          <input type="hidden" name={`playerId_${i}`} value={row.playerId} />
          <PlayerPicker roster={roster} row={row} onChange={(next) => updateRow(row.rid, next)} />
          <select
            name={`statKey_${i}`}
            required
            value={row.statKey}
            onChange={(e) => updateRow(row.rid, { statKey: e.target.value })}
            className={`${select} min-w-[10rem] flex-1`}
          >
            <option value="" disabled>
              Stat…
            </option>
            {STAT_FIELDS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(row.rid)}
              className="rounded-lg border border-line px-3 text-sm text-text/70 hover:border-red-400 hover:text-red-300"
              aria-label="Remove this row"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={addRow} className={btnSecondary}>
          + Simultaneous play
        </button>
        <SubmitButton pendingText="Logging…">Log Play{rows.length > 1 ? "s" : ""}</SubmitButton>
      </div>
    </form>
  );
}
