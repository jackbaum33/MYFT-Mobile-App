import { db } from "@/lib/firebaseAdmin";
import type { TeamDoc } from "@/lib/types";
import { teamOptionLabel } from "@/lib/utils";
import { createGame } from "../actions";
import SubmitButton from "@/components/SubmitButton";
import { card, input, label, pageTitle, select } from "@/lib/ui";

export default async function NewGamePage() {
  const teamsSnap = await db.collection("teams").orderBy("name").get();
  const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as TeamDoc) }));

  return (
    <div className="max-w-xl">
      <h1 className={pageTitle}>New Game</h1>
      <form action={createGame} className={`${card} space-y-4`}>
        <div>
          <label className={label}>Team 1</label>
          <select name="team1ID" className={select} defaultValue="">
            <option value="">— Select a team… —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {teamOptionLabel(t, { showDivision: true })}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="team1Placeholder"
            placeholder="…or type a placeholder, e.g. &quot;Boys 1 Seed&quot; (overrides the dropdown)"
            className={`${input} mt-2`}
          />
        </div>

        <div>
          <label className={label}>Team 2</label>
          <select name="team2ID" className={select} defaultValue="">
            <option value="">— Select a team… —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {teamOptionLabel(t, { showDivision: true })}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="team2Placeholder"
            placeholder="…or type a placeholder, e.g. &quot;Boys 16 Seed&quot; (overrides the dropdown)"
            className={`${input} mt-2`}
          />
        </div>
        <p className="text-xs text-text/60">
          For playoff slots where the teams aren&apos;t set yet, type a placeholder like &quot;Boys 1 Seed&quot;
          instead of picking a team — it&apos;ll show up in the app as plain text with no score, and you can swap
          in the real team here once it&apos;s known.
        </p>

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

        <SubmitButton pendingText="Creating…">Create Game</SubmitButton>
      </form>
    </div>
  );
}
