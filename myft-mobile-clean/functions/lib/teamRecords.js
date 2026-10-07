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
exports.updateTeamRecordsOnGameWrite = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const db = () => admin.firestore();
/**
 * Recomputes wins/losses/ties/pointDifferential for one team from its Final pool
 * games — the same full-rescan logic as the admin site's manual "Recompute from
 * Games" button (admin/app/(dashboard)/teams/actions.ts), just run automatically.
 * Rescanning from scratch (rather than incrementally patching) means there's no
 * way for this to drift out of sync, however a game got edited.
 */
async function recomputeTeamRecord(teamId) {
    const gamesSnap = await db().collection('games').get();
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let pointDifferential = 0;
    gamesSnap.forEach((doc) => {
        var _a, _b, _c;
        const g = doc.data();
        if (g.round !== undefined)
            return; // pool games only — bracket results don't count here
        if (((_a = g.status) !== null && _a !== void 0 ? _a : '').toLowerCase() !== 'final')
            return;
        const isTeam1 = g.team1ID === teamId;
        const isTeam2 = g.team2ID === teamId;
        if (!isTeam1 && !isTeam2)
            return;
        const own = (_b = (isTeam1 ? g.team1score : g.team2score)) !== null && _b !== void 0 ? _b : 0;
        const opp = (_c = (isTeam1 ? g.team2score : g.team1score)) !== null && _c !== void 0 ? _c : 0;
        pointDifferential += own - opp;
        if (own > opp)
            wins++;
        else if (own < opp)
            losses++;
        else
            ties++;
    });
    await db().doc(`teams/${teamId}`).set({ record: { wins, losses, ties }, pointDifferential }, { merge: true });
}
/**
 * Fires on every pool-game write (create/update/delete). Whenever the status,
 * score, or either team on a pool game changes, recomputes both the before- and
 * after-state teams so marking a game Final (or correcting a score, or deleting
 * a bad game) automatically keeps every affected team's record and point
 * differential current — no manual "Recompute from Games" click required.
 */
exports.updateTeamRecordsOnGameWrite = (0, firestore_1.onDocumentWritten)('games/{gameId}', async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    // A deleted game can still be affecting a team's record; recompute whoever it involved.
    const relevant = after !== null && after !== void 0 ? after : before;
    if (!relevant || relevant.round !== undefined)
        return; // pool games only
    const changed = !before ||
        !after ||
        before.status !== after.status ||
        before.team1score !== after.team1score ||
        before.team2score !== after.team2score ||
        before.team1ID !== after.team1ID ||
        before.team2ID !== after.team2ID;
    if (!changed)
        return;
    const teamIds = new Set();
    if (before === null || before === void 0 ? void 0 : before.team1ID)
        teamIds.add(before.team1ID);
    if (before === null || before === void 0 ? void 0 : before.team2ID)
        teamIds.add(before.team2ID);
    if (after === null || after === void 0 ? void 0 : after.team1ID)
        teamIds.add(after.team1ID);
    if (after === null || after === void 0 ? void 0 : after.team2ID)
        teamIds.add(after.team2ID);
    if (teamIds.size === 0)
        return;
    await Promise.all([...teamIds].map(recomputeTeamRecord));
    console.log(`[updateTeamRecordsOnGameWrite] recomputed ${teamIds.size} team(s):`, [...teamIds]);
});
//# sourceMappingURL=teamRecords.js.map