// data/mockData.ts (example shape – adjust to your full list)
import { Team } from '../../context/TournamentContext';

export const mockTeams: Team[] = [
  {
    id: 'michigan',
    name: 'Michigan',
    division: 'boys',
    captain: 'John Doe',
    record: { wins: 3, losses: 1 },
    players: [
      {
        id: 'p1',
        name: 'John Doe',
        position: 'QB',
        division: 'boys',
        teamId: 'falcons',
        stats: { touchdowns: 10, interceptions: 1, flagsPulled: 3, mvpAwards: 1 },
      },
      {
        id: 'p2',
        name: 'Mike West',
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
    captain: 'Alex Smith',
    record: { wins: 2, losses: 2 },
    players: [
      {
        id: 'p3',
        name: 'Alex Smith',
        position: 'RB',
        division: 'boys',
        teamId: 'wolves',
        stats: { touchdowns: 5, interceptions: 0, flagsPulled: 4, mvpAwards: 0 },
      },
      {
        id: 'p4',
        name: 'Chris Young',
        position: 'DB',
        division: 'boys',
        teamId: 'wolves',
        stats: { touchdowns: 1, interceptions: 2, flagsPulled: 5, mvpAwards: 0 },
      },
    ],
  },
  {
    id: 'yeshiva',
    name: 'YU',
    division: 'girls',
    captain: 'Sarah Lee',
    record: { wins: 4, losses: 0 },
    players: [
      {
        id: 'p5',
        name: 'Sarah Lee',
        position: 'QB',
        division: 'girls',
        teamId: 'panthers',
        stats: { touchdowns: 9, interceptions: 0, flagsPulled: 2, mvpAwards: 2 },
      },
      {
        id: 'p6',
        name: 'Emily Fox',
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
    captain: 'Lily Chen',
    record: { wins: 1, losses: 3 },
    players: [
      {
        id: 'p7',
        name: 'Lily Chen',
        position: 'RB',
        division: 'girls',
        teamId: 'hawks',
        stats: { touchdowns: 2, interceptions: 0, flagsPulled: 6, mvpAwards: 0 },
      },
      {
        id: 'p8',
        name: 'Ava Johnson',
        position: 'DB',
        division: 'girls',
        teamId: 'hawks',
        stats: { touchdowns: 0, interceptions: 3, flagsPulled: 7, mvpAwards: 0 },
      },
    ],
  },
];
