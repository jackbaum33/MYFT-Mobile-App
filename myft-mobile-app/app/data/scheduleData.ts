// app/data/scheduleData.ts
export type Gender = 'men' | 'women';
export type GameStatus = 'Scheduled' | 'Live' | 'Final';

export type PlayerGameStat = {
  playerId: string;
  touchdowns: number;
  interceptions: number;
  flagsPulled: number;
  mvpAwards: number;
};

export type PerSide = {
  team1: PlayerGameStat[];
  team2: PlayerGameStat[];
};

export type TeamId = 'michigan' | 'maryland' | 'yeshiva' | 'binghamton';

export type Game = {
  id: string;
  gender: Gender;
  team1: TeamId;
  team2: TeamId;
  time: string;
  field: string;
  status: GameStatus;

  // always editable; UI renders only when Live/Final
  liveStats?: PerSide;

  // snapshot when game is finalized
  finalBoxScore?: PerSide;
};

export type DaySchedule = {
  label: string;  // e.g., 'APR 4'
  date: string;   // ISO
  games: Game[];
};

let gid = 1;
const g = () => `g${gid++}`;

// Seed with some games. (Stats optional while Scheduled)
export const scheduleData: DaySchedule[] = [
  {
    label: 'APR 4',
    date: '2025-04-04',
    games: [
      {
        id: g(),
        gender: 'men',
        team1: 'michigan',
        team2: 'maryland',
        time: '09:00 AM',
        field: 'Field A',
        status: 'Live',
        liveStats: {
          team1: [
            { playerId: 'p1', touchdowns: 2, interceptions: 0, flagsPulled: 1, mvpAwards: 1 },
            { playerId: 'p2', touchdowns: 1, interceptions: 0, flagsPulled: 2, mvpAwards: 0 },
          ],
          team2: [
            { playerId: 'p3', touchdowns: 2, interceptions: 1, flagsPulled: 0, mvpAwards: 0 },
            { playerId: 'p4', touchdowns: 0, interceptions: 0, flagsPulled: 3, mvpAwards: 0 },
          ],
        },
      },
      {
        id: g(),
        gender: 'women',
        team1: 'yeshiva',
        team2: 'binghamton',
        time: '09:45 AM',
        field: 'Field B',
        status: 'Final',
        finalBoxScore: {
          team1: [
            { playerId: 'p5', touchdowns: 2, interceptions: 0, flagsPulled: 1, mvpAwards: 1 },
            { playerId: 'p6', touchdowns: 1, interceptions: 0, flagsPulled: 0, mvpAwards: 0 },
          ],
          team2: [
            { playerId: 'p7', touchdowns: 2, interceptions: 0, flagsPulled: 2, mvpAwards: 0 },
            { playerId: 'p8', touchdowns: 0, interceptions: 1, flagsPulled: 3, mvpAwards: 0 },
          ],
        },
      },
      { id: g(), gender: 'men',   team1: 'maryland',   team2: 'michigan',   time: '10:30 AM', field: 'Field A', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'binghamton', team2: 'yeshiva',    time: '11:15 AM', field: 'Field B', status: 'Scheduled' },
      { id: g(), gender: 'men',   team1: 'michigan',   team2: 'maryland',   time: '12:00 PM', field: 'Field C', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'yeshiva',    team2: 'binghamton', time: '12:45 PM', field: 'Field A', status: 'Scheduled' },
    ],
  },
  {
    label: 'APR 5',
    date: '2025-04-05',
    games: [
      { id: g(), gender: 'men',   team1: 'maryland',   team2: 'michigan',   time: '09:00 AM', field: 'Field A', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'binghamton', team2: 'yeshiva',    time: '09:45 AM', field: 'Field B', status: 'Scheduled' },
      { id: g(), gender: 'men',   team1: 'michigan',   team2: 'maryland',   time: '10:30 AM', field: 'Field C', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'yeshiva',    team2: 'binghamton', time: '11:15 AM', field: 'Field A', status: 'Scheduled' },
    ],
  },
  {
    label: 'APR 6',
    date: '2025-04-06',
    games: [
      { id: g(), gender: 'men',   team1: 'michigan',   team2: 'maryland',   time: '09:00 AM', field: 'Field A', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'yeshiva',    team2: 'binghamton', time: '09:45 AM', field: 'Field B', status: 'Scheduled' },
      { id: g(), gender: 'men',   team1: 'maryland',   team2: 'michigan',   time: '10:30 AM', field: 'Field C', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'binghamton', team2: 'yeshiva',    time: '11:15 AM', field: 'Field A', status: 'Scheduled' },
    ],
  },
];

/** UTILITIES **/

export const findGameById = (id?: string) => {
  if (!id) return null;
  for (const day of scheduleData) {
    const game = day.games.find(g => g.id === id);
    if (game) return { day, game };
  }
  return null;
};

// Which stat bucket should the UI render?
export const statsForRender = (g: Game): PerSide | undefined =>
  g.status === 'Final' ? g.finalBoxScore
  : g.status === 'Live' ? g.liveStats
  : undefined;

// Touchdowns × 7 from the appropriate bucket
export const derivedPoints = (g: Game, side: 'team1'|'team2') => {
  const box = statsForRender(g);
  if (!box) return '-';
  const arr = side === 'team1' ? box.team1 : box.team2;
  const tds = (arr ?? []).reduce((sum, l) => sum + (l.touchdowns || 0), 0);
  return String(tds * 7);
};

/** LIFECYCLE HELPERS (simple in-memory; replace with API later) **/

export function setGameStatus(gameId: string, next: GameStatus) {
  for (const day of scheduleData) {
    const g = day.games.find(x => x.id === gameId);
    if (!g) continue;

    if (next === 'Live') {
      g.liveStats ??= { team1: [], team2: [] };
    }
    if (next === 'Final') {
      g.finalBoxScore = {
        team1: [...(g.liveStats?.team1 ?? [])],
        team2: [...(g.liveStats?.team2 ?? [])],
      };
    }
    g.status = next;
    return g;
  }
  return null;
}

export function applyLiveStat(
  gameId: string,
  team: 'team1'|'team2',
  playerId: string,
  patch: Partial<PlayerGameStat>
) {
  for (const day of scheduleData) {
    const g = day.games.find(x => x.id === gameId);
    if (!g) continue;
    g.liveStats ??= { team1: [], team2: [] };
    const bucket = team === 'team1' ? g.liveStats.team1 : g.liveStats.team2;
    let line = bucket.find(l => l.playerId === playerId);
    if (!line) {
      line = { playerId, touchdowns: 0, interceptions: 0, flagsPulled: 0, mvpAwards: 0 };
      bucket.push(line);
    }
    if (patch.touchdowns != null)   line.touchdowns   = patch.touchdowns;
    if (patch.interceptions != null)line.interceptions= patch.interceptions;
    if (patch.flagsPulled != null)  line.flagsPulled  = patch.flagsPulled;
    if (patch.mvpAwards != null)    line.mvpAwards    = patch.mvpAwards;
    return line;
  }
  return null;
}
