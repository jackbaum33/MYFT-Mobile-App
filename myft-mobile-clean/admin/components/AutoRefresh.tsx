"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the server component tree on this page via router.refresh() so data pulled
 * straight from Firestore (team records, point differentials, etc.) stays current
 * without a manual browser refresh — mirrors the mobile app's 10s auto-refresh.
 * Skips a tick while an input/select/textarea is focused so it never clobbers an
 * in-progress edit on a form (e.g. the team record override fields).
 */
export default function AutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      const active = document.activeElement;
      const isEditing = active instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
      if (!isEditing) router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
