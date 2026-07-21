import { notFound } from "next/navigation";
import { db } from "@/lib/firebaseAdmin";
import type { GameDoc, PlayerDoc, TeamDoc } from "@/lib/types";
import { STAT_FIELDS, statsFromArray } from "@/lib/types";
import { toDateTimeLocalValue } from "@/lib/utils";
import { updateGame, updatePlayerStats, markFinal, deleteGame } from "../actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SubmitButton from "@/components/SubmitButton";
import SavedToast from "@/components/SavedToast";
import { card, input, label, select, btnDanger, pageTitle, sectionTitle } from "@/lib/ui";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [gameSnap, teamsSnap] = await Promise.all([
    db.doc(`games/${id}`).get(),
    db.collection("teams").orderBy("name").get(),
  ]);

  if (!gameSnap.exists) notFound();
  const game = gameSnap.data() as GameDoc;
  const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as TeamDoc) }));

  const rosterTeamIds = [game.team1ID, game.team2ID].filter((v): v is string => !!v);
  let players: { id: string; data: PlayerDoc }[] = [];
  if (rosterTeamIds.length > 0) {
    const playersSnap = await db.collection("players").where("team_id", "in", rosterTeamIds).get();
    players = playersSnap.docs
      .map((d) => ({ id: d.id, data: d.data() as PlayerDoc }))
      .sort((a, b) => (a.data.display_name ?? a.id).localeCompare(b.data.display_name ?? b.id));
  }

  const boundUpdateGame = updateGame.bind(null, id);
  const boundUpdateStats = updatePlayerStats.bind(null, id);
  const boundMarkFinal = markFinal.bind(null, id);
  const boundDelete = deleteGame.bind(null, id);

  const startTimeValue = game.startTime ? toDateTimeLocalValue(game.startTime.toDate()) : "";

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitle}>Edit Game</h1>
        <div className="flex gap-2">
          <form action={boundMarkFinal} className="flex items-center gap-2">
            <SubmitButton variant="secondary" pendingText="Marking…">Mark Final</SubmitButton>
            <SavedToast message="Marked Final" />
          </form>
          <form action={boundDelete}>
            <ConfirmSubmitButton confirmText="Delete this game permanently?" pendingText="Deleting…" className={btnDanger}>
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <form action={boundUpdateGame} className={`${card} space-y-4`}>
        <h2 className={sectionTitle}>Game Info</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Team 1</label>
            <select name="team1ID" defaultValue={game.team1ID ?? ""} className={select}>
              <option value="">— TBD —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.division})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Team 2</label>
            <select name="team2ID" defaultValue={game.team2ID ?? ""} className={select}>
              <option value="">— TBD —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.division})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Team 1 Score</label>
            <input type="number" name="team1score" defaultValue={game.team1score ?? 0} className={input} />
          </div>
          <div>
            <label className={label}>Team 2 Score</label>
            <input type="number" name="team2score" defaultValue={game.team2score ?? 0} className={input} />
          </div>
        </div>

        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={game.status ?? "Scheduled"} className={select}>
            <option value="Scheduled">Scheduled</option>
            <option value="Live">Live</option>
            <option value="Final">Final</option>
            <option value="TBD">TBD</option>
            <option value="Bye">Bye</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Start Time</label>
            <input type="datetime-local" name="startTime" defaultValue={startTimeValue} className={input} />
          </div>
          <div>
            <label className={label}>Field</label>
            <input type="text" name="field" defaultValue={game.field ?? ""} className={input} />
          </div>
        </div>

        <h2 className={`${sectionTitle} pt-2`}>Bracket / Playoff Fields (manual correction)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Round (0-based)</label>
            <input type="number" name="round" defaultValue={game.round ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Round Label</label>
            <input type="text" name="roundLabel" defaultValue={game.roundLabel ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Division</label>
            <select name="division" defaultValue={game.division ?? ""} className={select}>
              <option value="">—</option>
              <option value="boys">Boys</option>
              <option value="girls">Girls</option>
            </select>
          </div>
          <div>
            <label className={label}>Bracket Slot</label>
            <input type="number" name="bracketSlot" defaultValue={game.bracketSlot ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Seed 1</label>
            <input type="number" name="seed1" defaultValue={game.seed1 ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Seed 2</label>
            <input type="number" name="seed2" defaultValue={game.seed2 ?? ""} className={input} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-text/90">
          <input type="checkbox" name="isBye" defaultChecked={!!game.isBye} />
          Is Bye
        </label>

        <SubmitButton pendingText="Saving…">Save Game Info</SubmitButton>
        <SavedToast message="Game info saved" />
      </form>

      <form action={boundUpdateStats} className={`${card} space-y-4`}>
        <h2 className={sectionTitle}>Player Stats</h2>
        {players.length === 0 ? (
          <p className="text-sm text-text/70">
            No players found for either team yet — add them under Teams first.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-line px-2 py-2 text-left text-xs font-bold uppercase text-text/60">
                    Player
                  </th>
                  {STAT_FIELDS.map((f) => (
                    <th key={f.key} className="border-b border-line px-2 py-2 text-xs font-bold uppercase text-text/60">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const current = statsFromArray(game.playerStats?.[p.id]);
                  return (
                    <tr key={p.id}>
                      <td className="border-b border-line px-2 py-2 font-semibold">
                        {p.data.display_name ?? p.id}
                      </td>
                      {STAT_FIELDS.map((f, idx) => (
                        <td key={f.key} className="border-b border-line px-2 py-2">
                          <input
                            type="number"
                            name={`stat_${p.id}_${idx}`}
                            defaultValue={current[idx]}
                            className="w-14 rounded border border-line bg-navy px-1 py-1 text-center text-text"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {players.length > 0 && <SubmitButton pendingText="Saving…">Save Stats</SubmitButton>}
        <SavedToast message="Stats saved" />
      </form>
    </div>
  );
}
