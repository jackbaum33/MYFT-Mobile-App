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
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceBracketOnGameFinal = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const db = () => admin.firestore();
// --- Cloud Functions ---
/**
 * Fires when a bracket game (has a `round` field, not a bye) reaches Final.
 * Determines the winner by score, records it on the `brackets/{division}` slot,
 * and — unless this was the Final — writes the winner into the next round's
 * `games` doc, flipping its status from TBD to Scheduled once both teams are
 * known. A single Firestore transaction keeps the bracket doc and the
 * destination game doc consistent, and is idempotent (re-firing on the same
 * transition is a no-op once the winner is already recorded).
 *
 * Bracket GENERATION is manual now (admin panel's "Generate Bracket" button,
 * which writes brackets/{division} + the games docs directly) — there used to
 * be a generateBracketOnPoolComplete trigger here that did this automatically
 * once every pool game in a division went Final; it was removed in favor of
 * letting the admin decide when to generate. This function only handles
 * advancing an already-generated bracket round to round.
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