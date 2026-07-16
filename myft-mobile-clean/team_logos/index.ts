// Team logos are uploaded per-team via the admin dashboard (Storage, not
// bundled locally) so they can change without a client-side app deploy.
export function getTeamLogo(teamId?: string): { uri: string } | undefined {
  if (!teamId) return undefined;
  return {
    uri: `https://firebasestorage.googleapis.com/v0/b/myft-2025.firebasestorage.app/o/teams%2F${teamId}%2Flogo.png?alt=media`,
  };
}
