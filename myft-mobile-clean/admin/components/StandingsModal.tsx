"use client";

import { useEffect, useMemo, useState } from "react";
import { getStandings, type StandingsTeam } from "@/lib/standingsActions";
import { btnPrimary } from "@/lib/ui";

const POLL_MS = 15_000;

function rank(teams: StandingsTeam[], division: "boys" | "girls"): StandingsTeam[] {
  return teams
    .filter((t) => t.division === division)
    .sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.pointDifferential !== b.pointDifferential) return b.pointDifferential - a.pointDifferential;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.name.localeCompare(b.name);
    });
}

/** Self-contained trigger button + modal — drop it anywhere, no state wiring needed. */
export default function StandingsModal() {
  const [open, setOpen] = useState(false);
  const [division, setDivision] = useState<"boys" | "girls">("boys");
  const [teams, setTeams] = useState<StandingsTeam[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = () => {
      getStandings()
        .then((t) => {
          if (!cancelled) setTeams(t);
        })
        .catch((e) => console.warn("[StandingsModal] getStandings failed:", e));
    };

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open]);

  const ranked = useMemo(() => rank(teams ?? [], division), [teams, division]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnPrimary}>
        🏆 Standings
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl border border-line bg-navy"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line p-4">
              <h2 className="text-lg font-black text-yellow">Standings</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-text/60 hover:text-yellow">
                ✕
              </button>
            </div>

            <div className="flex gap-2 border-b border-line p-4">
              {(["boys", "girls"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDivision(d)}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold capitalize ${
                    division === d ? "bg-yellow text-navy" : "bg-card text-text/80"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
              {teams === null ? (
                <p className="py-6 text-center text-sm text-text/60">Loading…</p>
              ) : ranked.length === 0 ? (
                <p className="py-6 text-center text-sm text-text/60">No teams yet.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border-b border-line py-2 text-left text-xs font-bold uppercase text-text/50">#</th>
                      <th className="border-b border-line py-2 text-left text-xs font-bold uppercase text-text/50">
                        Team
                      </th>
                      <th className="border-b border-line py-2 text-right text-xs font-bold uppercase text-text/50">
                        W-L
                      </th>
                      <th className="border-b border-line py-2 text-right text-xs font-bold uppercase text-text/50">
                        PD
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((t, i) => (
                      <tr key={t.id}>
                        <td className="border-b border-line py-2 font-black text-yellow">{i + 1}</td>
                        <td className="border-b border-line py-2 font-semibold text-text">
                          {t.name}
                          {t.captain ? ` (${t.captain})` : ""}
                        </td>
                        <td className="border-b border-line py-2 text-right text-text">
                          {t.wins}-{t.losses}
                        </td>
                        <td
                          className={`border-b border-line py-2 text-right font-bold ${
                            t.pointDifferential > 0
                              ? "text-green-400"
                              : t.pointDifferential < 0
                                ? "text-red-400"
                                : "text-text"
                          }`}
                        >
                          {t.pointDifferential > 0 ? `+${t.pointDifferential}` : t.pointDifferential}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-3 text-center text-[11px] text-text/40">Refreshes every 15s while open</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
