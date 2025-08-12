// app/(tabs)/leaderboard/_fakeUsers.ts
import type { Player } from '../../../context/TournamentContext';

export type FakeUser = {
  id: string;
  username: string;
  displayName: string;
  roster: string[];      // player IDs
  totalPoints: number;
};

// --- deterministic RNG (mulberry32) so results are stable across screens ---
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffleStable<T>(arr: T[], rand: () => number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeDeterministicUsers(
  allPlayers: Player[],
  calcPoints: (p: Player) => number,
  opts?: {
    seed?: string; // change to reshuffle globally
    includeCurrentUser?: { username: string; displayName?: string } | null;
    count?: number; // number of fake users (default 15)
  }
): FakeUser[] {
  const seed = hashSeed(opts?.seed ?? 'nhbt2025');
  const rand = mulberry32(seed);
  const count = opts?.count ?? 15;

  const pickRoster = () => {
    const rosterSize = 5 + Math.floor(rand() * 3); // 5–7
    const shuffled = shuffleStable(allPlayers, rand);
    return shuffled.slice(0, rosterSize).map(p => p.id);
  };

  const fabricate = (n: number): FakeUser => {
    const roster = pickRoster();
    const total = roster.reduce((sum, pid) => {
      const pl = allPlayers.find(p => p.id === pid);
      return sum + (pl ? calcPoints(pl) : 0);
    }, 0);
    return {
      id: `u${n}`,
      username: `user${n}`,
      displayName: `User ${n}`,
      roster,
      totalPoints: total,
    };
  };

  const list: FakeUser[] = Array.from({ length: count }, (_, i) => fabricate(i + 1));

  // Optionally add the signed-in user with a deterministic roster too
  if (opts?.includeCurrentUser?.username) {
    const meRoster = pickRoster();
    const meTotal = meRoster.reduce((sum, pid) => {
      const pl = allPlayers.find(p => p.id === pid);
      return sum + (pl ? calcPoints(pl) : 0);
    }, 0);
    list.push({
      id: 'me',
      username: opts.includeCurrentUser.username,
      displayName: opts.includeCurrentUser.displayName ?? opts.includeCurrentUser.username,
      roster: meRoster,
      totalPoints: meTotal,
    });
  }

  return list.sort((a, b) => b.totalPoints - a.totalPoints);
}
