import { db } from "@/lib/firebaseAdmin";
import type { PlayerDoc, TeamDoc } from "@/lib/types";
import type { PlayerOption } from "./PlayerPicker";
import UploadForm from "./UploadForm";

// Reads live Firestore state via the Admin SDK — never statically prerender.
export const dynamic = "force-dynamic";

export default async function UploadPhotoPage() {
  const [playersSnap, teamsSnap] = await Promise.all([
    db.collection("players").get(),
    db.collection("teams").get(),
  ]);

  const teamNameById = new Map(teamsSnap.docs.map((d) => [d.id, (d.data() as TeamDoc).name ?? d.id]));
  const players: PlayerOption[] = playersSnap.docs
    .map((d) => {
      const data = d.data() as PlayerDoc;
      return {
        id: d.id,
        name: data.display_name ?? d.id,
        team: data.team_id ? teamNameById.get(data.team_id) ?? data.team_id : "Unassigned",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-6 py-10">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-2xl font-black text-yellow">Upload Your Photo</h1>
        <p className="mb-4 text-sm text-text/70">
          Find your name below and upload a photo to use in the MYFT app.
        </p>

        <UploadForm players={players} />
      </div>
    </div>
  );
}
