// app/utils/fantasy.ts
import type { Player, Team } from './TournamentContext';

export const allPlayersFromTeams = (teams: Team[]) =>
  teams.flatMap(t => t.players);

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
