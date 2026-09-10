import sharp from "sharp";
import { FieldValue } from "firebase-admin/firestore";
import { db, bucket } from "@/lib/firebaseAdmin";
import { playerImagePath } from "@/lib/utils";

/**
 * Shared by the authenticated admin upload (players/actions.ts) and the public
 * self-serve form (upload-photo/actions.ts). Re-encodes whatever was uploaded to PNG —
 * the object path keeps its historical `.jpg` suffix (not worth a storage migration),
 * but the actual bytes and Content-Type are genuinely PNG.
 */
export async function uploadPlayerPhoto(playerId: string, file: File): Promise<void> {
  const input = Buffer.from(await file.arrayBuffer());
  const png = await sharp(input).png().toBuffer();

  const gcsFile = bucket.file(playerImagePath(playerId));
  await gcsFile.save(png, {
    contentType: "image/png",
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  // The app builds a tokenless `...?alt=media` URL directly, so the object must be
  // genuinely public (not just a signed getDownloadURL() token).
  await gcsFile.makePublic();

  // Object is cached for a year at a fixed URL; bump the version so cache-busted
  // URLs (playerImageUrl / getPlayerImageUrl) pick up the new image immediately.
  await db.doc(`players/${playerId}`).set({ photoVersion: FieldValue.increment(1) }, { merge: true });
}
