// data/mockData.ts
import { Team } from '../context/TournamentContext';

export const mockTeams: Team[] = [
  {
    id: 'boys1',
    name: 'Falcons',
    division: 'boys',
    players: [
      {
        id: 'p1',
        name: 'John Doe',
        division: 'boys',
        teamId: 'boys1',
        stats: {
          touchdowns: 3,
          interceptions: 1,
          flagsPulled: 4,
          mvpAwards: 1,
        },
      },
      {
        id: 'p2',
        name: 'Mike West',
        division: 'boys',
        teamId: 'boys1',
        stats: {
          touchdowns: 1,
          interceptions: 2,
          flagsPulled: 3,
          mvpAwards: 0,
        },
      },
    ],
  },
  {
    id: 'boys2',
    name: 'Wolves',
    division: 'boys',
    players: [
      {
        id: 'p3',
        name: 'Alex Smith',
        division: 'boys',
        teamId: 'boys2',
        stats: {
          touchdowns: 2,
          interceptions: 0,
          flagsPulled: 6,
          mvpAwards: 1,
        },
      },
      {
        id: 'p4',
        name: 'Chris Young',
        division: 'boys',
        teamId: 'boys2',
        stats: {
          touchdowns: 0,
          interceptions: 3,
          flagsPulled: 1,
          mvpAwards: 0,
        },
      },
    ],
  },
  {
    id: 'girls1',
    name: 'Panthers',
    division: 'girls',
    players: [
      {
        id: 'p5',
        name: 'Sarah Lee',
        division: 'girls',
        teamId: 'girls1',
        stats: {
          touchdowns: 4,
          interceptions: 1,
          flagsPulled: 2,
          mvpAwards: 1,
        },
      },
      {
        id: 'p6',
        name: 'Emily Fox',
        division: 'girls',
        teamId: 'girls1',
        stats: {
          touchdowns: 1,
          interceptions: 1,
          flagsPulled: 5,
          mvpAwards: 0,
        },
      },
    ],
  },
  {
    id: 'girls2',
    name: 'Hawks',
    division: 'girls',
    players: [
      {
        id: 'p7',
        name: 'Lily Chen',
        division: 'girls',
        teamId: 'girls2',
        stats: {
          touchdowns: 2,
          interceptions: 2,
          flagsPulled: 3,
          mvpAwards: 2,
        },
      },
      {
        id: 'p8',
        name: 'Ava Johnson',
        division: 'girls',
        teamId: 'girls2',
        stats: {
          touchdowns: 0,
          interceptions: 0,
          flagsPulled: 6,
          mvpAwards: 0,
        },
      },
    ],
  },
];
