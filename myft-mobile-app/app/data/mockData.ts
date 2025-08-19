// data/mockData.ts (example shape – adjust to your full list)
import { Team } from '../../context/TournamentContext';
export const mockTeams: Team[] = [
  {
    id: 'michigan',
    name: 'Michigan',
    division: 'boys',
    captain: 'Eli Plotkin',
    record: { wins: 3, losses: 1 },
    players: [
      {
        id: 'p1',
        name: 'Eli Plotkin',
        position: 'QB',
        division: 'boys',
        teamId: 'falcons',
        stats: { touchdowns: 10, interceptions: 1, flagsPulled: 3, mvpAwards: 1 },
      },
      {
        id: 'p2',
        name: 'Boaz Edidin',
        position: 'WR',
        division: 'boys',
        teamId: 'falcons',
        stats: { touchdowns: 4, interceptions: 0, flagsPulled: 2, mvpAwards: 0 },
      },
    ],
  },
  {
    id: 'maryland',
    name: 'Maryland',
    division: 'boys',
    captain: 'Lev Blumenfeld',
    record: { wins: 2, losses: 2 },
    players: [
      {
        id: 'p3',
        name: 'Lev Blumenfeld',
        position: 'RB',
        division: 'boys',
        teamId: 'wolves',
        stats: { touchdowns: 5, interceptions: 0, flagsPulled: 4, mvpAwards: 0 },
      },
      {
        id: 'p4',
        name: 'Elliot Sokol',
        position: 'DB',
        division: 'boys',
        teamId: 'wolves',
        stats: { touchdowns: 1, interceptions: 2, flagsPulled: 5, mvpAwards: 0 },
      },
    ],
  },
  {
    id: 'yeshiva',
    name: 'Yeshiva',
    division: 'girls',
    captain: 'Yoni Arnet',
    record: { wins: 4, losses: 0 },
    players: [
      {
        id: 'p5',
        name: 'Yoni Arnet',
        position: 'QB',
        division: 'girls',
        teamId: 'panthers',
        stats: { touchdowns: 9, interceptions: 0, flagsPulled: 2, mvpAwards: 2 },
      },
      {
        id: 'p6',
        name: 'David Gaffen',
        position: 'WR',
        division: 'girls',
        teamId: 'panthers',
        stats: { touchdowns: 3, interceptions: 0, flagsPulled: 1, mvpAwards: 0 },
      },
    ],
  },
  {
    id: 'binghamton',
    name: 'Binghamton',
    division: 'girls',
    captain: 'Jared Moskowitz',
    record: { wins: 1, losses: 3 },
    players: [
      {
        id: 'p7',
        name: 'Jared Moskowitz',
        position: 'RB',
        division: 'girls',
        teamId: 'hawks',
        stats: { touchdowns: 2, interceptions: 0, flagsPulled: 6, mvpAwards: 0 },
      },
      {
        id: 'p8',
        name: 'Joey Bond',
        position: 'DB',
        division: 'girls',
        teamId: 'hawks',
        stats: { touchdowns: 0, interceptions: 3, flagsPulled: 7, mvpAwards: 0 },
      },
    ],
  },
];
