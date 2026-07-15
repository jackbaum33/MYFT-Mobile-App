"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyDraftTurn = exports.notifyLeagueCreated = void 0;
exports.pickerForNumber = pickerForNumber;
const firestore_1 = require("firebase-functions/v2/firestore");
const push_1 = require("./push");
/**
 * Standard snake-fantasy-draft turn order: pick n's turn is n % numMembers,
 * reversed on odd rounds when draftStyle is 'snake'. Division/roster-slot
 * needs never affect whose turn it is — see the plan's "Draft mechanics"
 * section for why turn count and slot count always stay in sync.
 */
function pickerForNumber(league, pickNumber) {
    const order = league.draftOrder;
    if (!order || order.length === 0)
        return undefined;
    const n = order.length;
    const round = Math.floor(pickNumber / n);
    const idx = pickNumber % n;
    const reversed = league.draftStyle === 'snake' && round % 2 === 1;
    return reversed ? order[n - 1 - idx] : order[idx];
}
/**
 * Fires when a league is created. Notifies every member except the owner
 * (who already knows — they just created it) that they've been added.
 */
exports.notifyLeagueCreated = (0, firestore_1.onDocumentCreated)('leagues/{leagueId}', async (event) => {
    var _a;
    const league = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!league)
        return;
    const notifyUids = league.memberUids.filter((uid) => uid !== league.ownerUid);
    if (notifyUids.length === 0)
        return;
    const tokens = await (0, push_1.getPushTokensForUids)(notifyUids);
    await (0, push_1.sendPush)(tokens, 'Added to a League', `You've been added to "${league.name}"`, {
        leagueId: event.params.leagueId,
    });
});
/**
 * Fires on every league update. Notifies whoever is now on the clock when
 * the draft starts (pending -> drafting) or advances a pick, and notifies
 * every member once the draft completes.
 */
exports.notifyDraftTurn = (0, firestore_1.onDocumentUpdated)('leagues/{leagueId}', async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    const leagueId = event.params.leagueId;
    // Draft just started -> notify the first picker.
    if (before.status !== 'drafting' && after.status === 'drafting') {
        const picker = pickerForNumber(after, 0);
        if (picker) {
            const tokens = await (0, push_1.getPushTokensForUids)([picker]);
            await (0, push_1.sendPush)(tokens, 'Your Pick', `It's your pick in "${after.name}"!`, { leagueId });
        }
        return;
    }
    // Draft just completed -> notify everyone.
    if (before.status !== 'complete' && after.status === 'complete') {
        const tokens = await (0, push_1.getPushTokensForUids)(after.memberUids);
        await (0, push_1.sendPush)(tokens, 'Draft Complete', `The draft for "${after.name}" has finished!`, { leagueId });
        return;
    }
    // A pick advanced mid-draft -> notify the new picker.
    if (after.status === 'drafting' &&
        before.currentPickNumber !== after.currentPickNumber &&
        after.currentPickNumber !== undefined &&
        after.currentPickNumber !== after.totalPicks) {
        const picker = pickerForNumber(after, after.currentPickNumber);
        if (picker) {
            const tokens = await (0, push_1.getPushTokensForUids)([picker]);
            await (0, push_1.sendPush)(tokens, 'Your Pick', `It's your pick in "${after.name}"!`, { leagueId });
        }
    }
});
//# sourceMappingURL=leagues.js.map