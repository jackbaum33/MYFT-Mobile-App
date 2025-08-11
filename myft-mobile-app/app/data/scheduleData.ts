// app/data/scheduleData.ts
// Refactored: per‑game box scores reference ONLY playerId.
// Names/positions/captains/logos are *always* resolved from mockData via TournamentContext.

export type Gender = 'men' | 'women';

export type PlayerGameStat = {
  playerId: string;            // ← references a player that exists in mockData
  touchdowns: number;          // per-game, not season
  interceptions: number;
  flagsPulled: number;
  mvpAwards: number;
};

export type GameStatus = 'Final' | 'Live' | 'Scheduled';

export type TeamId = 'michigan' | 'maryland' | 'yeshiva' | 'binghamton';

export type Game = {
  id: string;
  gender: Gender;
  team1: TeamId;
  team2: TeamId;
  time: string;
  field: string;
  status: GameStatus;
  boxScore?: {
    team1: PlayerGameStat[];
    team2: PlayerGameStat[];
  };
};

export type DaySchedule = {
  label: string;   // e.g., 'APR 4'
  date: string;    // ISO-like string for dev/demo
  games: Game[];
};

// --- Helpers ---------------------------------------------------------------
let gid = 1;
const g = () => `g${gid++}`;

export const derivePointsFor = (game: Game, side: 'team1' | 'team2', pointsPerTD = 7) => {
  const lines = side === 'team1' ? game.boxScore?.team1 : game.boxScore?.team2;
  const tds = (lines ?? []).reduce((acc, l) => acc + (l.touchdowns || 0), 0);
  return tds * pointsPerTD;
};

export const findGameById = (id?: string) => {
  if (!id) return null;
  for (const day of scheduleData) {
    const match = day.games.find(g => g.id === id);
    if (match) return { day, game: match };
  }
  return null;
};

// ---------------------------------------------------------------------------
// IMPORTANT: The only duplicated values here are *per-game* numbers.
// All descriptive data (player name/position, captain, team name/logo)
// must be read from mockData/TournamentContext using playerId/teamId.
// ---------------------------------------------------------------------------

// Known player IDs from your mockData:
// michigan:   p1, p2
// maryland:   p3, p4
// yeshiva:    p5, p6
// binghamton: p7, p8

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
        boxScore: {
          team1: [
            { playerId: 'p1', touchdowns: 3, interceptions: 0, flagsPulled: 1, mvpAwards: 1 },
            { playerId: 'p2', touchdowns: 1, interceptions: 0, flagsPulled: 2, mvpAwards: 0 },
          ],
          team2: [
            { playerId: 'p3', touchdowns: 2, interceptions: 1, flagsPulled: 0, mvpAwards: 0 },
            { playerId: 'p4', touchdowns: 0, interceptions: 1, flagsPulled: 3, mvpAwards: 0 },
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
        boxScore: {
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
      { id: g(), gender: 'men',   team1: 'maryland',   team2: 'michigan',   time: '10:30 AM', field: 'Field A', status: 'Final',     boxScore: { team1: [{ playerId: 'p3', touchdowns: 1, interceptions: 0, flagsPulled: 1, mvpAwards: 0 }], team2: [{ playerId: 'p1', touchdowns: 2, interceptions: 0, flagsPulled: 0, mvpAwards: 0 }] } },
      { id: g(), gender: 'women', team1: 'binghamton', team2: 'yeshiva',    time: '11:15 AM', field: 'Field B', status: 'Final',     boxScore: { team1: [{ playerId: 'p7', touchdowns: 1, interceptions: 0, flagsPulled: 1, mvpAwards: 0 }], team2: [{ playerId: 'p5', touchdowns: 2, interceptions: 0, flagsPulled: 0, mvpAwards: 1 }] } },
      { id: g(), gender: 'men',   team1: 'michigan',   team2: 'maryland',   time: '12:00 PM', field: 'Field C', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'yeshiva',    team2: 'binghamton', time: '12:45 PM', field: 'Field A', status: 'Scheduled' },
      { id: g(), gender: 'men',   team1: 'maryland',   team2: 'michigan',   time: '01:30 PM', field: 'Field B', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'binghamton', team2: 'yeshiva',    time: '02:15 PM', field: 'Field C', status: 'Scheduled' },
      { id: g(), gender: 'men',   team1: 'michigan',   team2: 'maryland',   time: '03:00 PM', field: 'Field A', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'yeshiva',    team2: 'binghamton', time: '03:45 PM', field: 'Field B', status: 'Scheduled' },
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
      { id: g(), gender: 'men',   team1: 'maryland',   team2: 'michigan',   time: '12:00 PM', field: 'Field B', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'binghamton', team2: 'yeshiva',    time: '12:45 PM', field: 'Field C', status: 'Scheduled' },
      { id: g(), gender: 'men',   team1: 'michigan',   team2: 'maryland',   time: '01:30 PM', field: 'Field A', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'yeshiva',    team2: 'binghamton', time: '02:15 PM', field: 'Field B', status: 'Scheduled' },
      { id: g(), gender: 'men',   team1: 'maryland',   team2: 'michigan',   time: '03:00 PM', field: 'Field C', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'binghamton', team2: 'yeshiva',    time: '03:45 PM', field: 'Field A', status: 'Scheduled' },
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
      { id: g(), gender: 'men',   team1: 'michigan',   team2: 'maryland',   time: '12:00 PM', field: 'Field B', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'yeshiva',    team2: 'binghamton', time: '12:45 PM', field: 'Field C', status: 'Scheduled' },
      { id: g(), gender: 'men',   team1: 'maryland',   team2: 'michigan',   time: '01:30 PM', field: 'Field A', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'binghamton', team2: 'yeshiva',    time: '02:15 PM', field: 'Field B', status: 'Scheduled' },
      { id: g(), gender: 'men',   team1: 'michigan',   team2: 'maryland',   time: '03:00 PM', field: 'Field C', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'yeshiva',    team2: 'binghamton', time: '03:45 PM', field: 'Field A', status: 'Scheduled' },
    ],
  },
];
