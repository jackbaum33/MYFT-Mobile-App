import Link from "next/link";
import { db } from "@/lib/firebaseAdmin";
import type { ScheduleDoc } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";
import { pageTitle, btnPrimary, tableWrap, table, th, td } from "@/lib/ui";

export default async function SchedulePage() {
  const snap = await db.collection("schedule").get();
  const events = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as ScheduleDoc) }))
    .sort((a, b) => (a.startAt?.toMillis() ?? 0) - (b.startAt?.toMillis() ?? 0));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitle}>Schedule / Reminders</h1>
        <Link href="/schedule/new" className={btnPrimary}>
          + New Event
        </Link>
      </div>
      <p className="mb-4 text-sm text-text/70">
        Drives the 15-minute-before push reminder (<code>sendEventReminders</code>).
      </p>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>Title</th>
              <th className={th}>Location</th>
              <th className={th}>Start</th>
              <th className={th}>Reminder Sent</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className={td}>
                  <Link href={`/schedule/${e.id}`} className="font-semibold hover:text-yellow">
                    {e.title}
                  </Link>
                </td>
                <td className={td}>{e.location ?? "—"}</td>
                <td className={td}>{fmtDateTime(e.startAt)}</td>
                <td className={td}>{e.reminderSentAt ? "Yes" : "—"}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td className={td} colSpan={4}>
                  No events scheduled.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
