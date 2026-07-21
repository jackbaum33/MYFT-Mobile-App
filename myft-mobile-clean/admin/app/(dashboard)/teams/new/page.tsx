import { createTeam } from "../actions";
import SubmitButton from "@/components/SubmitButton";
import { card, input, label, select, pageTitle } from "@/lib/ui";

export default function NewTeamPage() {
  return (
    <div className="max-w-lg">
      <h1 className={pageTitle}>New Team</h1>
      <form action={createTeam} encType="multipart/form-data" className={`${card} space-y-4`}>
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
        <div>
          <label className={label}>Logo</label>
          <input type="file" name="logo" accept="image/*" className={input} />
        </div>
        <SubmitButton pendingText="Creating…">Create Team</SubmitButton>
      </form>
    </div>
  );
}
