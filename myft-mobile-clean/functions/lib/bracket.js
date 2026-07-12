"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceBracketOnGameFinal = exports.generateBracketOnPoolComplete = void 0;
exports.nextPow2 = nextPow2;
exports.seedOrder = seedOrder;
exports.roundLabel = roundLabel;
exports.buildBracket = buildBracket;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const db = () => admin.firestore();
// --- Helpers duplicated from context/TournamentContext.tsx (functions/ has no shared package with app/) ---
function normDiv(v) {
    const s = String(v !== null && v !== void 0 ? v : '').toLowerCase();
    if (s.includes('girl') || s.includes('women') || s.includes('female'))
        return 'girls';
    return 'boys';
}
function parseRecord(record) {
    var _a, _b, _c, _d;
    if (Array.isArray(record))
        return { wins: (_a = record[0]) !== null && _a !== void 0 ? _a : 0, losses: (_b = record[1]) !== null && _b !== void 0 ? _b : 0 };
    if (record && typeof record === 'object')
        return { wins: (_c = record.wins) !== null && _c !== void 0 ? _c : 0, losses: (_d = record.losses) !== null && _d !== void 0 ? _d : 0 };
    return { wins: 0, losses: 0 };
}
function stripUndefined(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined)
            out[k] = v;
    }
    return out;
}
// --- Seeding math ---
function nextPow2(n) {
    let p = 1;
    while (p < n)
        p *= 2;
    return p;
}
/**
 * Standard recursive bracket seed order: guarantees seed1 vs seed2 can only
 * meet in the Final, and byes always land on the best-remaining seeds.
 * seedOrder(8) -> [1,8,4,5,2,7,3,6]
 */
function seedOrder(size) {
    let seeds = [1];
    while (seeds.length < size) {
        const n = seeds.length * 2;
        const next = [];
        for (const s of seeds)
            next.push(s, n + 1 - s);
        seeds = next;
    }
    return seeds;
}
function roundLabel(roundIndex, numRounds, size) {
    const distanceFromFinal = numRounds - 1 - roundIndex;
    const slotsInRound = size / Math.pow(2, roundIndex + 1);
    if (distanceFromFinal === 0)
        return 'Final';
    if (distanceFromFinal === 1)
        return 'Semifinals';
    if (distanceFromFinal === 2)
        return 'Quarterfinals';
    return `Round of ${slotsInRound * 2}`;
}
function rankStandings(teams) {
    return [...teams].sort((a, b) => {
        if (b.wins !== a.wins)
            return b.wins - a.wins;
        if (b.pointDifferential !== a.pointDifferential)
            return b.pointDifferential - a.pointDifferential;
        return a.name.localeCompare(b.name);
    });
}
/**
 * Builds the full bracket structure (all rounds) plus the flat list of `games`
 * docs to create. Byes are resolved immediately: a round-0 bye writes its
 * survivor directly into the round-1 slot it feeds, no game doc is created for
 * the bye slot's opponent, and the winner is recorded on the bye slot itself.
 */
function buildBracket(division, seeds, startTime) {
    var _a, _b;
    const qualifyingTeamCount = seeds.length;
    const size = nextPow2(qualifyingTeamCount);
    const numRounds = Math.log2(size);
    const order = seedOrder(size);
    const seedToTeam = new Map(seeds.map((s) => [s.seed, s.teamID]));
    const games = [];
    const rounds = [];
    const round0Label = roundLabel(0, numRounds, size);
    const round0Slots = [];
    const numRound0Slots = size / 2;
    for (let slotIndex = 0; slotIndex < numRound0Slots; slotIndex++) {
        const seedA = order[slotIndex * 2];
        const seedB = order[slotIndex * 2 + 1];
        const teamA = seedA <= qualifyingTeamCount ? seedToTeam.get(seedA) : undefined;
        const teamB = seedB <= qualifyingTeamCount ? seedToTeam.get(seedB) : undefined;
        const gameId = `bracket-${division}-r0-s${slotIndex}`;
        if (teamA && teamB) {
            round0Slots.push({
                slotIndex,
                seed1: seedA,
                seed2: seedB,
                team1ID: teamA,
                team2ID: teamB,
                gameId,
                isBye: false,
                winnerTeamID: null,
            });
            games.push({
                docId: gameId,
                round: 0,
                roundLabel: round0Label,
                division,
                bracketSlot: slotIndex,
                seed1: seedA,
                seed2: seedB,
                team1ID: teamA,
                team2ID: teamB,
                status: 'Scheduled',
                startTime,
            });
        }
        else {
            // At most one side can be missing here: size = nextPow2(qualifyingTeamCount)
            // guarantees qualifyingTeamCount > size / 2 (except the trivial 1-team case).
            const presentTeam = teamA !== null && teamA !== void 0 ? teamA : teamB;
            const presentSeed = teamA ? seedA : seedB;
            round0Slots.push({
                slotIndex,
                seed1: teamA ? seedA : undefined,
                seed2: teamB ? seedB : undefined,
                team1ID: teamA !== null && teamA !== void 0 ? teamA : null,
                team2ID: teamB !== null && teamB !== void 0 ? teamB : null,
                gameId,
                isBye: true,
                winnerTeamID: presentTeam !== null && presentTeam !== void 0 ? presentTeam : null,
            });
            games.push({
                docId: gameId,
                round: 0,
                roundLabel: round0Label,
                division,
                bracketSlot: slotIndex,
                seed1: presentSeed,
                team1ID: presentTeam,
                status: 'Bye',
                isBye: true,
                startTime,
            });
        }
    }
    rounds.push({ roundIndex: 0, label: round0Label, slots: round0Slots });
    let prevRoundSlots = round0Slots;
    for (let r = 1; r < numRounds; r++) {
        const numSlots = size / Math.pow(2, r + 1);
        const label = roundLabel(r, numRounds, size);
        const slots = [];
        for (let slotIndex = 0; slotIndex < numSlots; slotIndex++) {
            const feedA = prevRoundSlots[slotIndex * 2];
            const feedB = prevRoundSlots[slotIndex * 2 + 1];
            const gameId = `bracket-${division}-r${r}-s${slotIndex}`;
            feedA.advancesToRound = r;
            feedA.advancesToSlot = slotIndex;
            feedA.advancesToSide = 'team1';
            feedB.advancesToRound = r;
            feedB.advancesToSlot = slotIndex;
            feedB.advancesToSide = 'team2';
            const team1ID = feedA.isBye ? (_a = feedA.winnerTeamID) !== null && _a !== void 0 ? _a : undefined : undefined;
            const team2ID = feedB.isBye ? (_b = feedB.winnerTeamID) !== null && _b !== void 0 ? _b : undefined : undefined;
            const bothKnown = !!team1ID && !!team2ID;
            slots.push({
                slotIndex,
                team1ID: team1ID !== null && team1ID !== void 0 ? team1ID : null,
                team2ID: team2ID !== null && team2ID !== void 0 ? team2ID : null,
                gameId,
                isBye: false,
                winnerTeamID: null,
            });
            games.push({
                docId: gameId,
                round: r,
                roundLabel: label,
                division,
                bracketSlot: slotIndex,
                team1ID,
                team2ID,
                status: bothKnown ? 'Scheduled' : 'TBD',
                startTime,
            });
        }
        rounds.push({ roundIndex: r, label, slots });
        prevRoundSlots = slots;
    }
    return {
        bracket: { division, size, qualifyingTeamCount, seeds, rounds, status: 'generated' },
        games,
    };
}
// --- Cloud Functions ---
/**
 * Fires on every pool-play game (no `round` field) reaching Final. Once ALL of
 * a division's pool games are Final, ranks standings from `teams.record` /
 * `teams.pointDifferential` (both admin-maintained — see plan), seeds the top
 * `config/tournament.{division}PlayoffTeams` teams into a bracket, and writes
 * `brackets/{division}` plus every round's `games` docs in one transaction.
 * No-ops (feature off) if that config value is unset for the division.
 */
exports.generateBracketOnPoolComplete = (0, firestore_1.onDocumentUpdated)('games/{gameId}', async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (after.round !== undefined)
        return; // only pool games trigger generation
    const beforeFinal = String((_c = before.status) !== null && _c !== void 0 ? _c : '').toLowerCase() === 'final';
    const afterFinal = String((_d = after.status) !== null && _d !== void 0 ? _d : '').toLowerCase() === 'final';
    if (beforeFinal || !afterFinal)
        return; // only the -> Final transition
    const team1ID = String((_e = after.team1ID) !== null && _e !== void 0 ? _e : '');
    if (!team1ID)
        return;
    const teamSnap = await db().doc(`teams/${team1ID}`).get();
    if (!teamSnap.exists)
        return;
    const division = normDiv((_g = (_f = teamSnap.data()) === null || _f === void 0 ? void 0 : _f.division) !== null && _g !== void 0 ? _g : team1ID);
    const bracketRef = db().doc(`brackets/${division}`);
    if ((await bracketRef.get()).exists)
        return; // already generated
    const configSnap = await db().doc('config/tournament').get();
    const config = ((_h = configSnap.data()) !== null && _h !== void 0 ? _h : {});
    const qualifyingCount = division === 'boys' ? config.boysPlayoffTeams : config.girlsPlayoffTeams;
    if (!qualifyingCount || qualifyingCount < 2)
        return; // feature off for this division
    const [teamsSnap, gamesSnap] = await Promise.all([db().collection('teams').get(), db().collection('games').get()]);
    const divisionTeams = [];
    const teamIdsInDivision = new Set();
    teamsSnap.forEach((d) => {
        var _a, _b, _c;
        const data = d.data();
        if (normDiv((_a = data === null || data === void 0 ? void 0 : data.division) !== null && _a !== void 0 ? _a : d.id) !== division)
            return;
        teamIdsInDivision.add(d.id);
        const { wins, losses } = parseRecord(data.record);
        divisionTeams.push({
            teamID: d.id,
            name: (_b = data.name) !== null && _b !== void 0 ? _b : d.id,
            wins,
            losses,
            pointDifferential: (_c = data.pointDifferential) !== null && _c !== void 0 ? _c : 0,
        });
    });
    if (divisionTeams.length === 0)
        return;
    let allPoolFinal = true;
    gamesSnap.forEach((d) => {
        var _a, _b, _c;
        const g = d.data();
        if (g.round !== undefined)
            return; // skip bracket games
        const t1 = String((_a = g.team1ID) !== null && _a !== void 0 ? _a : '');
        const t2 = String((_b = g.team2ID) !== null && _b !== void 0 ? _b : '');
        if (!teamIdsInDivision.has(t1) && !teamIdsInDivision.has(t2))
            return; // other division
        if (String((_c = g.status) !== null && _c !== void 0 ? _c : '').toLowerCase() !== 'final')
            allPoolFinal = false;
    });
    if (!allPoolFinal)
        return;
    const ranked = rankStandings(divisionTeams);
    const qualifiers = ranked.slice(0, qualifyingCount);
    if (qualifiers.length < 2)
        return;
    const seeds = qualifiers.map((t, i) => ({ seed: i + 1, teamID: t.teamID }));
    let startTime;
    if (config.saturdayDate) {
        const d = new Date(`${config.saturdayDate}T00:00:00`);
        if (!isNaN(d.getTime()))
            startTime = admin.firestore.Timestamp.fromDate(d);
    }
    const { bracket, games } = buildBracket(division, seeds, startTime);
    await db().runTransaction(async (tx) => {
        const recheck = await tx.get(bracketRef);
        if (recheck.exists)
            return; // race guard
        tx.set(bracketRef, stripUndefined(Object.assign(Object.assign({}, bracket), { generatedAt: admin.firestore.FieldValue.serverTimestamp(), sourceStandings: ranked.map((t, i) => ({
                teamID: t.teamID,
                wins: t.wins,
                losses: t.losses,
                pointDifferential: t.pointDifferential,
                seed: i + 1,
            })) })));
        for (const g of games) {
            const { docId } = g, rest = __rest(g, ["docId"]);
            tx.set(db().doc(`games/${docId}`), stripUndefined(rest));
        }
    });
    console.log(`[generateBracketOnPoolComplete] generated ${division} bracket: ${qualifiers.length} teams, ${games.length} games`);
});
/**
 * Fires when a bracket game (has a `round` field, not a bye) reaches Final.
 * Determines the winner by score, records it on the `brackets/{division}` slot,
 * and — unless this was the Final — writes the winner into the next round's
 * `games` doc, flipping its status from TBD to Scheduled once both teams are
 * known. A single Firestore transaction keeps the bracket doc and the
 * destination game doc consistent, and is idempotent (re-firing on the same
 * transition is a no-op once the winner is already recorded).
 */
exports.advanceBracketOnGameFinal = (0, firestore_1.onDocumentUpdated)('games/{gameId}', async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (after.round === undefined || after.isBye === true)
        return; // only real bracket games
    const beforeFinal = String((_c = before.status) !== null && _c !== void 0 ? _c : '').toLowerCase() === 'final';
    const afterFinal = String((_d = after.status) !== null && _d !== void 0 ? _d : '').toLowerCase() === 'final';
    if (beforeFinal || !afterFinal)
        return;
    const division = after.division;
    const round = after.round;
    const bracketSlot = after.bracketSlot;
    if (!division || round === undefined || bracketSlot === undefined)
        return;
    const score1 = Number((_e = after.team1score) !== null && _e !== void 0 ? _e : 0);
    const score2 = Number((_f = after.team2score) !== null && _f !== void 0 ? _f : 0);
    if (score1 === score2) {
        console.error(`[advanceBracketOnGameFinal] tie score on ${division} round ${round} slot ${bracketSlot} (${event.params.gameId}) — refusing to advance, fix the score manually`);
        return;
    }
    const winnerTeamID = score1 > score2 ? String((_g = after.team1ID) !== null && _g !== void 0 ? _g : '') : String((_h = after.team2ID) !== null && _h !== void 0 ? _h : '');
    if (!winnerTeamID)
        return;
    const bracketRef = db().doc(`brackets/${division}`);
    await db().runTransaction(async (tx) => {
        const bracketSnap = await tx.get(bracketRef);
        if (!bracketSnap.exists)
            return;
        const bracket = bracketSnap.data();
        const roundData = bracket.rounds.find((r) => r.roundIndex === round);
        const slot = roundData === null || roundData === void 0 ? void 0 : roundData.slots.find((s) => s.slotIndex === bracketSlot);
        if (!roundData || !slot)
            return;
        if (slot.winnerTeamID === winnerTeamID)
            return; // idempotent no-op
        const hasNextRound = slot.advancesToRound !== undefined;
        const destRef = hasNextRound
            ? db().doc(`games/bracket-${division}-r${slot.advancesToRound}-s${slot.advancesToSlot}`)
            : undefined;
        const destSnap = destRef ? await tx.get(destRef) : undefined;
        const newRounds = bracket.rounds.map((r) => {
            if (r.roundIndex === round) {
                return Object.assign(Object.assign({}, r), { slots: r.slots.map((s) => (s.slotIndex === bracketSlot ? Object.assign(Object.assign({}, s), { winnerTeamID }) : s)) });
            }
            if (hasNextRound && r.roundIndex === slot.advancesToRound) {
                return Object.assign(Object.assign({}, r), { slots: r.slots.map((s) => s.slotIndex === slot.advancesToSlot
                        ? Object.assign(Object.assign({}, s), { [slot.advancesToSide === 'team1' ? 'team1ID' : 'team2ID']: winnerTeamID }) : s) });
            }
            return r;
        });
        if (!destRef) {
            tx.update(bracketRef, { rounds: newRounds, status: 'complete' });
            console.log(`[advanceBracketOnGameFinal] ${division} bracket complete — champion ${winnerTeamID}`);
            return;
        }
        tx.update(bracketRef, { rounds: newRounds });
        if (destSnap && destSnap.exists) {
            const destData = destSnap.data();
            const sideField = slot.advancesToSide === 'team1' ? 'team1ID' : 'team2ID';
            const otherField = slot.advancesToSide === 'team1' ? 'team2ID' : 'team1ID';
            const bothKnown = !!destData[otherField];
            tx.update(destRef, { [sideField]: winnerTeamID, status: bothKnown ? 'Scheduled' : 'TBD' });
        }
    });
});
//# sourceMappingURL=bracket.js.map