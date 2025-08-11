// app/data/scheduleData.ts
export type Gender = 'men' | 'women';

export type PlayerGameStat = {
  playerId: string;
  touchdowns: number;
  interceptions: number;
  flagsPulled: number;
  mvpAwards: number;
};

export type Game = {
  id: string;
  gender: Gender;
  team1: 'michigan' | 'maryland' | 'yeshiva' | 'binghamton';
  team2: 'michigan' | 'maryland' | 'yeshiva' | 'binghamton';
  time: string;
  field: string;
  status: 'Final' | 'Live' | 'Scheduled';
  score1?: number;
  score2?: number;
  boxScore?: {
    team1: PlayerGameStat[];
    team2: PlayerGameStat[];
  };
};

export type DaySchedule = {
  label: string;   // e.g., 'APR 4'
  date: string;    // ISO (optional)
  games: Game[];
};

// helper to keep ids tidy
let gid = 1;
const g = () => `g${gid++}`;

// Some per-game stats referencing your existing mock player IDs:
// michigan: p1, p2
// maryland: p3, p4
// yeshiva:  p5, p6
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
        score1: 27,
        score2: 21,
        boxScore: {
          team1: [
            { playerId: 'p1', touchdowns: 3, interceptions: 0, flagsPulled: 1, mvpAwards: 1 },
            { playerId: 'p2', touchdowns: 1, interceptions: 0, flagsPulled: 2, mvpAwards: 0 },
          ],
          team2: [
            { playerId: 'p3', touchdowns: 2, interceptions: 1, flagsPulled: 0, mvpAwards: 0 },
            { playerId: 'p4', touchdowns: 1, interceptions: 0, flagsPulled: 3, mvpAwards: 0 },
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
        score1: 22,
        score2: 14,
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
      { id: g(), gender: 'men', team1: 'maryland', team2: 'michigan',   time: '10:30 AM', field: 'Field A', status: 'Final',    score1: 19, score2: 26 },
      { id: g(), gender: 'women', team1: 'binghamton', team2: 'yeshiva',time: '11:15 AM', field: 'Field B', status: 'Final',    score1: 12, score2: 18 },
      { id: g(), gender: 'men', team1: 'michigan',   team2: 'maryland', time: '12:00 PM', field: 'Field C', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'yeshiva',  team2: 'binghamton',time:'12:45 PM', field: 'Field A', status: 'Scheduled' },
      { id: g(), gender: 'men', team1: 'maryland',   team2: 'michigan', time: '01:30 PM', field: 'Field B', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'binghamton',team2:'yeshiva',  time: '02:15 PM', field: 'Field C', status: 'Scheduled' },
      { id: g(), gender: 'men', team1: 'michigan',   team2: 'maryland', time: '03:00 PM', field: 'Field A', status: 'Scheduled' },
      { id: g(), gender: 'women', team1: 'yeshiva',  team2: 'binghamton',time:'03:45 PM', field: 'Field B', status: 'Scheduled' },
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
