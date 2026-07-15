import { createTeam } from "../actions";
import { card, input, label, select, btnPrimary, pageTitle } from "@/lib/ui";

export default function NewTeamPage() {
  return (
    <div className="max-w-lg">
      <h1 className={pageTitle}>New Team</h1>
      <form action={createTeam} className={`${card} space-y-4`}>
        <div>
          <label className={label}>School / Team Name</label>
          <input type="text" name="name" required placeholder="e.g. Ohio State" className={input} />
        </div>
        <div>
          <label className={label}>Division</label>
          <select name="division" className={select} defaultValue="boys">
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
          </select>
        </div>
        <div>
          <label className={label}>Captain</label>
          <input type="text" name="captain" className={input} />
        </div>
        <button className={btnPrimary}>Create Team</button>
      </form>
    </div>
  );
}
