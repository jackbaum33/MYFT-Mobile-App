"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/session";

export async function loginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");

  if (!process.env.ADMIN_PANEL_PASSWORD || password !== process.env.ADMIN_PANEL_PASSWORD) {
    redirect("/login?error=1");
  }

  await createSession();
  redirect("/");
}
