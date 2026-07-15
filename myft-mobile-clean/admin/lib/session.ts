import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./constants";

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const val = store.get(SESSION_COOKIE_NAME)?.value;
  return !!val && !!process.env.SESSION_SECRET && val === process.env.SESSION_SECRET;
}

export async function createSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, process.env.SESSION_SECRET!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/** Defense-in-depth check to call at the top of every Server Action. */
export async function requireSession(): Promise<void> {
  if (!(await isAuthed())) {
    throw new Error("Not authenticated");
  }
}
