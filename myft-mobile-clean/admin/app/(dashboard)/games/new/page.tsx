import { db } from "@/lib/firebaseAdmin";
import type { TeamDoc } from "@/lib/types";
import { createGame } from "../actions";
import { card, input, label, btnPrimary, pageTitle, select } from "@/lib/ui";

export default async function NewGamePage() {
  const teamsSnap = await db.collection("teams").orderBy("name").get();
  const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as TeamDoc) }));

  return (
    <div className="max-w-xl">
      <h1 className={pageTitle}>New Game</h1>
      <form action={createGame} className={`${card} space-y-4`}>
        <div>
          <label className={label}>Team 1</label>
          <select name="team1ID" required className={select} defaultValue="">
            <option value="" disabled>
              Select a team…
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.division})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Team 2</label>
          <select name="team2ID" required className={select} defaultValue="">
            <option value="" disabled>
              Select a team…
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.division})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Status</label>
          <select name="status" className={select} defaultValue="Scheduled">
            <option value="Scheduled">Scheduled</option>
            <option value="Live">Live</option>
            <option value="Final">Final</option>
            <option value="TBD">TBD</option>
          </select>
        </div>

        <div>
          <label className={label}>Start Time</label>
          <input type="datetime-local" name="startTime" className={input} />
        </div>

        <div>
          <label className={label}>Field</label>
          <input type="text" name="field" placeholder="e.g. Field 3" className={input} />
        </div>

        <button className={btnPrimary}>Create Game</button>
      </form>
    </div>
  );
}
