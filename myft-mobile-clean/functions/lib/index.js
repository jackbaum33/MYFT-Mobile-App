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
exports.sendEventReminders = exports.onGameUpdate = exports.aggregatePlayerStats = exports.advanceBracketOnGameFinal = exports.generateBracketOnPoolComplete = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const expo_server_sdk_1 = require("expo-server-sdk");
admin.initializeApp();
const db = admin.firestore();
const expo = new expo_server_sdk_1.Expo();
var bracket_1 = require("./bracket");
Object.defineProperty(exports, "generateBracketOnPoolComplete", { enumerable: true, get: function () { return bracket_1.generateBracketOnPoolComplete; } });
Object.defineProperty(exports, "advanceBracketOnGameFinal", { enumerable: true, get: function () { return bracket_1.advanceBracketOnGameFinal; } });
// --- helpers ---
async function getAllPushTokens() {
    const snap = await db.collection('users').get();
    const tokens = [];
    snap.forEach((docSnap) => {
        const token = docSnap.data().pushToken;
        if (typeof token === 'string' && expo_server_sdk_1.Expo.isExpoPushToken(token)) {
            tokens.push(token);
        }
    });
    return tokens;
}
async function sendPush(tokens, title, body, data) {
    if (tokens.length === 0)
        return;
    const messages = tokens.map((to) => ({
        to,
        title,
        body,
        data: data !== null && data !== void 0 ? data : {},
        sound: 'default',
    }));
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
        try {
            await expo.sendPushNotificationsAsync(chunk);
        }
        catch (e) {
            console.error('[push] Failed to send chunk:', e);
        }
    }
}
// Convert a team ID like "michigan-boys" → "Michigan", "ohio-state-boys" → "Ohio State"
function teamLabel(teamId) {
    const parts = teamId.split('-');
    const last = parts[parts.length - 1];
    const nameParts = last === 'boys' || last === 'girls' ? parts.slice(0, -1) : parts;
    return nameParts
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
        .join(' ');
}
// --- Cloud Functions ---
/**
 * Firestore trigger: whenever a game document is written, re-aggregate
 * seasonTotals for any player whose per-game stats changed.
 *
 * Stats array indices (matches client-side statsFromSeasonTotals):
 *   0  touchdowns        6  catches
 *   1  passingTDs        7  flagsPulled
 *   2  minimalReceptions 8  sacks
 *   3  shortReceptions   9  interceptions
 *   4  mediumReceptions  10 passingInterceptions
 *   5  longReceptions
 */
exports.aggregatePlayerStats = (0, firestore_1.onDocumentUpdated)('games/{gameId}', async (event) => {
    var _a, _b, _c, _d, _e, _f;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    const statsBefore = (_c = before.playerStats) !== null && _c !== void 0 ? _c : {};
    const statsAfter = (_d = after.playerStats) !== null && _d !== void 0 ? _d : {};
    // Collect only players whose stats actually changed to minimise Firestore writes
    const changedPlayerIds = new Set();
    const allKeys = new Set([...Object.keys(statsBefore), ...Object.keys(statsAfter)]);
    for (const pid of allKeys) {
        if (JSON.stringify((_e = statsBefore[pid]) !== null && _e !== void 0 ? _e : null) !== JSON.stringify((_f = statsAfter[pid]) !== null && _f !== void 0 ? _f : null)) {
            changedPlayerIds.add(pid);
        }
    }
    if (changedPlayerIds.size === 0)
        return;
    // Scan every game and accumulate totals for affected players
    const allGames = await db.collection('games').get();
    const totals = new Map();
    for (const pid of changedPlayerIds) {
        totals.set(pid, new Array(11).fill(0));
    }
    allGames.forEach((gameDoc) => {
        var _a, _b;
        const ps = (_a = gameDoc.data().playerStats) !== null && _a !== void 0 ? _a : {};
        for (const pid of changedPlayerIds) {
            const gs = ps[pid];
            if (!Array.isArray(gs))
                continue;
            const running = totals.get(pid);
            for (let i = 0; i < 11; i++) {
                running[i] += Number((_b = gs[i]) !== null && _b !== void 0 ? _b : 0);
            }
        }
    });
    // Write updated seasonTotals in a single batch
    const batch = db.batch();
    for (const [pid, total] of totals) {
        batch.update(db.doc(`players/${pid}`), { seasonTotals: total });
    }
    await batch.commit();
    console.log(`[aggregatePlayerStats] updated ${totals.size} player(s):`, [...changedPlayerIds]);
});
exports.onGameUpdate = (0, firestore_1.onDocumentUpdated)('games/{gameId}', async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (((_c = after.status) !== null && _c !== void 0 ? _c : '').toLowerCase() !== 'live')
        return;
    const s1Before = Number((_d = before.team1score) !== null && _d !== void 0 ? _d : 0);
    const s2Before = Number((_e = before.team2score) !== null && _e !== void 0 ? _e : 0);
    const s1After = Number((_f = after.team1score) !== null && _f !== void 0 ? _f : 0);
    const s2After = Number((_g = after.team2score) !== null && _g !== void 0 ? _g : 0);
    if (s1Before === s1After && s2Before === s2After)
        return;
    const wasTied = s1Before === s2Before;
    const isTied = s1After === s2After;
    const t1WasLeading = s1Before > s2Before;
    const t1IsLeading = s1After > s2After;
    const leadFlipped = !isTied && t1WasLeading !== t1IsLeading;
    if (!leadFlipped && !(isTied && !wasTied))
        return;
    const t1 = teamLabel(String((_h = after.team1ID) !== null && _h !== void 0 ? _h : 'Team 1'));
    const t2 = teamLabel(String((_j = after.team2ID) !== null && _j !== void 0 ? _j : 'Team 2'));
    const scoreStr = `${s1After}–${s2After}`;
    let title;
    let body;
    if (isTied && !wasTied) {
        title = 'Tied Game!';
        body = `${t1} ${scoreStr} ${t2}`;
    }
    else {
        const leader = t1IsLeading ? t1 : t2;
        title = 'Lead Change!';
        body = `${leader} takes the lead  •  ${t1} ${scoreStr} ${t2}`;
    }
    const tokens = await getAllPushTokens();
    await sendPush(tokens, title, body);
});
exports.sendEventReminders = (0, scheduler_1.onSchedule)({ schedule: 'every 5 minutes', timeZone: 'America/New_York' }, async () => {
    const now = admin.firestore.Timestamp.now();
    const windowStart = admin.firestore.Timestamp.fromMillis(now.toMillis() + 10 * 60 * 1000);
    const windowEnd = admin.firestore.Timestamp.fromMillis(now.toMillis() + 20 * 60 * 1000);
    const snap = await db
        .collection('schedule')
        .where('startAt', '>=', windowStart)
        .where('startAt', '<=', windowEnd)
        .get();
    if (snap.empty)
        return;
    const tokens = await getAllPushTokens();
    if (tokens.length === 0)
        return;
    const batch = db.batch();
    for (const eventDoc of snap.docs) {
        const eventData = eventDoc.data();
        if (eventData.reminderSentAt)
            continue;
        const title = 'Starting Soon';
        const body = `${eventData.title} begins in ~15 minutes at ${eventData.location}`;
        await sendPush(tokens, title, body, { eventId: eventDoc.id });
        batch.update(eventDoc.ref, {
            reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
});
//# sourceMappingURL=index.js.map