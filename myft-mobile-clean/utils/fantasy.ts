// app/utils/fantasy.ts
import type { Player, Team } from '../context/TournamentContext';

export const allPlayersFromTeams = (teams: Team[]) =>
  teams.flatMap(t => t.players);

/**
 * `version` busts the browser cache after a re-upload in the admin panel — the underlying
 * storage object is served with a 1-year Cache-Control at an otherwise-fixed URL.
 */
export function getPlayerImageUrl(playerId: string, version?: number): string {
  const imageFilename = playerId.replace(/-/g, '');
  const base = `https://firebasestorage.googleapis.com/v0/b/myft-2025.firebasestorage.app/o/players%2F${playerId}%2F${imageFilename}.jpg?alt=media`;
  return version ? `${base}&v=${version}` : base;
}

/**
 * `version` busts the browser cache after a re-upload in the admin panel — the underlying
 * storage object is served with a 1-year Cache-Control at an otherwise-fixed URL.
 */
export function getTeamLogoUrl(teamId: string, version?: number): string {
  const base = `https://firebasestorage.googleapis.com/v0/b/myft-2025.firebasestorage.app/o/teams%2F${teamId}%2Flogo.png?alt=media`;
  return version ? `${base}&v=${version}` : base;
}

export const mapPlayersById = (players: Player[]) => {
  const m = new Map<string, Player>();
  for (const p of players) m.set(p.id, p);
  return m;
};

export const rosterTotalPoints = (
  roster: string[] | undefined,
  playersById: Map<string, Player>,
  calculatePoints: (p: Player) => number
) =>
  (roster ?? []).reduce((sum, pid) => {
    const p = playersById.get(pid);
    return p ? sum + calculatePoints(p) : sum;
  }, 0);

export const rosterWithPoints = (
  roster: string[] | undefined,
  playersById: Map<string, Player>,
  calculatePoints: (p: Player) => number
) =>
  (roster ?? [])
    .map(pid => playersById.get(pid))
    .filter((p): p is Player => !!p)
    .map(p => ({ ...p, fantasy: calculatePoints(p) }));
