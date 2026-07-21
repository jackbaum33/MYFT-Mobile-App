import { notFound } from "next/navigation";
import { db } from "@/lib/firebaseAdmin";
import type { ScheduleDoc } from "@/lib/types";
import { toDateTimeLocalValue } from "@/lib/utils";
import { updateEvent, deleteEvent } from "../actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SubmitButton from "@/components/SubmitButton";
import { card, input, label, btnDanger, pageTitle } from "@/lib/ui";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snap = await db.doc(`schedule/${id}`).get();
  if (!snap.exists) notFound();
  const event = snap.data() as ScheduleDoc;

  const boundUpdate = updateEvent.bind(null, id);
  const boundDelete = deleteEvent.bind(null, id);
  const startAtValue = event.startAt ? toDateTimeLocalValue(event.startAt.toDate()) : "";

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageTitle}>Edit Event</h1>
      <form action={boundUpdate} className={`${card} space-y-4`}>
        <div>
          <label className={label}>Title</label>
          <input type="text" name="title" defaultValue={event.title ?? ""} required className={input} />
        </div>
        <div>
          <label className={label}>Location</label>
          <input type="text" name="location" defaultValue={event.location ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Address</label>
          <input type="text" name="address" defaultValue={event.address ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Start At</label>
          <input type="datetime-local" name="startAt" defaultValue={startAtValue} required className={input} />
        </div>
        <SubmitButton pendingText="Saving…">Save</SubmitButton>
      </form>

      <form action={boundDelete}>
        <ConfirmSubmitButton confirmText="Delete this event?" pendingText="Deleting…" className={btnDanger}>
          Delete Event
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
