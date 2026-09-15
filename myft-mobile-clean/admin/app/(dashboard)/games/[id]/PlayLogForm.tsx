"use client";

import { useState } from "react";
import { STAT_FIELDS } from "@/lib/types";
import { addPlayLogEntries } from "../actions";
import SubmitButton from "@/components/SubmitButton";
import { select, btnSecondary } from "@/lib/ui";

export type RosterOption = { id: string; name: string; team: string };

export default function PlayLogForm({
  gameId,
  team1: { name: team1Name, roster: team1Roster },
  team2: { name: team2Name, roster: team2Roster },
}: {
  gameId: string;
  team1: { name: string; roster: RosterOption[] };
  team2: { name: string; roster: RosterOption[] };
}) {
  const [rowCount, setRowCount] = useState(1);

  const action = addPlayLogEntries.bind(null, gameId);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="rowCount" value={rowCount} />
      {Array.from({ length: rowCount }).map((_, i) => (
        <div key={i} className="flex flex-wrap gap-2">
          <select name={`playerId_${i}`} required defaultValue="" className={`${select} min-w-[12rem] flex-1`}>
            <option value="" disabled>
              Player…
            </option>
            <optgroup label={team1Name}>
              {team1Roster.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label={team2Name}>
              {team2Roster.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          </select>
          <select name={`statKey_${i}`} required defaultValue="" className={`${select} min-w-[10rem] flex-1`}>
            <option value="" disabled>
              Stat…
            </option>
            {STAT_FIELDS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          {rowCount > 1 && (
            <button
              type="button"
              onClick={() => setRowCount((c) => c - 1)}
              className="rounded-lg border border-line px-3 text-sm text-text/70 hover:border-red-400 hover:text-red-300"
              aria-label="Remove this row"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setRowCount((c) => c + 1)} className={btnSecondary}>
          + Simultaneous play
        </button>
        <SubmitButton pendingText="Logging…">Log Play{rowCount > 1 ? "s" : ""}</SubmitButton>
      </div>
    </form>
  );
}
