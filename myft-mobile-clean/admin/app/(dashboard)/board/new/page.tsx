import { createBoardMember } from "../actions";
import { card, input, label, btnPrimary, pageTitle } from "@/lib/ui";

export default function NewBoardMemberPage() {
  return (
    <div className="max-w-lg">
      <h1 className={pageTitle}>New Board Member</h1>
      <form action={createBoardMember} encType="multipart/form-data" className={`${card} space-y-4`}>
        <div>
          <label className={label}>Name</label>
          <input type="text" name="name" required placeholder="e.g. Jack Baum" className={input} />
        </div>
        <div>
          <label className={label}>Title</label>
          <input type="text" name="title" placeholder="e.g. Technology" className={input} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input type="email" name="email" className={input} />
        </div>
        <div>
          <label className={label}>Order</label>
          <input type="number" name="order" defaultValue={0} className={input} />
          <p className="mt-1 text-xs text-text/60">Lower numbers appear first in the grid.</p>
        </div>
        <div>
          <label className={label}>Photo</label>
          <input type="file" name="photo" accept="image/*" className={input} />
        </div>
        <button className={btnPrimary}>Create Member</button>
      </form>
    </div>
  );
}
