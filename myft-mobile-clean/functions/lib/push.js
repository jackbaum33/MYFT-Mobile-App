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
exports.getAllPushTokens = getAllPushTokens;
exports.getPushTokensForUids = getPushTokensForUids;
exports.sendPush = sendPush;
const admin = __importStar(require("firebase-admin"));
const expo_server_sdk_1 = require("expo-server-sdk");
const db = () => admin.firestore();
const expo = new expo_server_sdk_1.Expo();
async function getAllPushTokens() {
    const snap = await db().collection('users').get();
    const tokens = [];
    snap.forEach((docSnap) => {
        const token = docSnap.data().pushToken;
        if (typeof token === 'string' && expo_server_sdk_1.Expo.isExpoPushToken(token)) {
            tokens.push(token);
        }
    });
    return tokens;
}
/** Targeted variant of getAllPushTokens: only the given uids' tokens. */
async function getPushTokensForUids(uids) {
    var _a;
    if (uids.length === 0)
        return [];
    const refs = uids.map((uid) => db().doc(`users/${uid}`));
    const snaps = await db().getAll(...refs);
    const tokens = [];
    for (const s of snaps) {
        const token = (_a = s.data()) === null || _a === void 0 ? void 0 : _a.pushToken;
        if (typeof token === 'string' && expo_server_sdk_1.Expo.isExpoPushToken(token)) {
            tokens.push(token);
        }
    }
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
//# sourceMappingURL=push.js.map