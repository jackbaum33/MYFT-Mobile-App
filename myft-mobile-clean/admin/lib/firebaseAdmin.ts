import { getApps, getApp, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET || "myft-2025.firebasestorage.app";

// Strips one layer of matching leading/trailing quotes some env var UIs (and
// naive .env parsing) leave attached to the raw value.
function unquote(v: string): string {
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function getAdminApp() {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_PROJECT_ID && unquote(process.env.FIREBASE_PROJECT_ID.trim());
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL && unquote(process.env.FIREBASE_CLIENT_EMAIL.trim());
  // Vercel env vars store literal "\n" for newlines; the SDK needs real ones.
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY && unquote(process.env.FIREBASE_PRIVATE_KEY.trim()).replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: STORAGE_BUCKET,
  });
}

/**
 * Lazily resolves the real Firestore/Storage instance on first property
 * access instead of at module load. Next.js loads every route module
 * (including its imports) during the build's "collect page data" step even
 * for force-dynamic routes, which would otherwise throw the missing-env-var
 * error above at build time, before any request (and any real env vars)
 * exist.
 */
function lazy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  const resolve = () => {
    if (!instance) instance = factory();
    return instance;
  };
  return new Proxy({} as T, {
    get(_target, prop, _receiver) {
      const real = resolve();
      const value = Reflect.get(real as object, prop, real);
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}

export const db: Firestore = lazy(() => getFirestore(getAdminApp()));
export const bucket = lazy(() => getStorage(getAdminApp()).bucket());
