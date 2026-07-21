import { createEvent } from "../actions";
import SubmitButton from "@/components/SubmitButton";
import { card, input, label, pageTitle } from "@/lib/ui";

export default function NewEventPage() {
  return (
    <div className="max-w-lg">
      <h1 className={pageTitle}>New Event</h1>
      <form action={createEvent} className={`${card} space-y-4`}>
        <div>
          <label className={label}>Title</label>
          <input type="text" name="title" required className={input} />
        </div>
        <div>
          <label className={label}>Location</label>
          <input type="text" name="location" className={input} />
        </div>
        <div>
          <label className={label}>Address</label>
          <input type="text" name="address" className={input} />
        </div>
        <div>
          <label className={label}>Start At</label>
          <input type="datetime-local" name="startAt" required className={input} />
        </div>
        <SubmitButton pendingText="Creating…">Create Event</SubmitButton>
      </form>
    </div>
  );
}
