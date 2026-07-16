import { notFound } from "next/navigation";
import { db } from "@/lib/firebaseAdmin";
import type { BoardMemberDoc } from "@/lib/types";
import { boardImageUrl } from "@/lib/utils";
import { updateBoardMember, deleteBoardMember } from "../actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { card, input, label, btnPrimary, btnDanger, pageTitle } from "@/lib/ui";

export default async function BoardMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const snap = await db.doc(`boardMembers/${id}`).get();
  if (!snap.exists) notFound();
  const member = snap.data() as BoardMemberDoc;

  const boundUpdate = updateBoardMember.bind(null, id);
  const boundDelete = deleteBoardMember.bind(null, id);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageTitle}>{member.name ?? id}</h1>

      <div className={`${card} flex items-center gap-4`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- external Firebase Storage URL */}
        <img
          src={boardImageUrl(id)}
          alt={member.name ?? id}
          width={64}
          height={64}
          className="h-16 w-16 rounded-full bg-navy object-cover"
        />
        <p className="text-xs text-text/60">Upload a new photo below to replace this.</p>
      </div>

      <form action={boundUpdate} encType="multipart/form-data" className={`${card} space-y-4`}>
        <div>
          <label className={label}>Name</label>
          <input type="text" name="name" defaultValue={member.name ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Title</label>
          <input type="text" name="title" defaultValue={member.title ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input type="email" name="email" defaultValue={member.email ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Order</label>
          <input type="number" name="order" defaultValue={member.order ?? 0} className={input} />
        </div>
        <div>
          <label className={label}>Photo</label>
          <input type="file" name="photo" accept="image/*" className={input} />
        </div>
        <button className={btnPrimary}>Save</button>
      </form>

      <form action={boundDelete}>
        <ConfirmSubmitButton confirmText="Remove this board member?" className={btnDanger}>
          Delete Member
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
