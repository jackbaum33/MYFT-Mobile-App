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
exports.deleteAccount = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = () => admin.firestore();
/**
 * Deletes the caller's account: removes them from any leagues they belong
 * to, deletes their user doc and Storage files, then deletes the Auth user
 * itself. Runs with Admin SDK privileges so it isn't subject to Firestore
 * security rules (needed to edit other members' league docs) or the client
 * SDK's requires-recent-login check on deleteUser.
 */
exports.deleteAccount = (0, https_1.onCall)(async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in to delete your account.');
    }
    const leaguesSnap = await db().collection('leagues').where('memberUids', 'array-contains', uid).get();
    const batch = db().batch();
    for (const leagueDoc of leaguesSnap.docs) {
        batch.update(leagueDoc.ref, {
            memberUids: admin.firestore.FieldValue.arrayRemove(uid),
        });
        batch.delete(leagueDoc.ref.collection('rosters').doc(uid));
    }
    batch.delete(db().doc(`users/${uid}`));
    await batch.commit();
    try {
        await admin.storage().bucket().deleteFiles({ prefix: `users/${uid}/` });
    }
    catch (e) {
        console.warn(`[deleteAccount] failed to delete Storage files for ${uid}:`, e);
    }
    await admin.auth().deleteUser(uid);
    return { success: true };
});
//# sourceMappingURL=account.js.map