import Link from "next/link";
import { db } from "@/lib/firebaseAdmin";
import type { BoardMemberDoc } from "@/lib/types";
import { boardImageUrl } from "@/lib/utils";
import { pageTitle, btnPrimary, tableWrap, table, th, td } from "@/lib/ui";

export default async function BoardPage() {
  const snap = await db.collection("boardMembers").get();
  const members = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as BoardMemberDoc) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitle}>Board Members</h1>
        <Link href="/board/new" className={btnPrimary}>
          + New Member
        </Link>
      </div>
      <p className="mb-4 text-sm text-text/70">
        Drives the &ldquo;Meet the Board&rdquo; grid on the app&rsquo;s home tab.
      </p>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>Photo</th>
              <th className={th}>Name</th>
              <th className={th}>Title</th>
              <th className={th}>Email</th>
              <th className={th}>Order</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td className={td}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- external Firebase Storage URL */}
                  <img
                    src={boardImageUrl(m.id)}
                    alt={m.name ?? m.id}
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full bg-navy object-cover"
                  />
                </td>
                <td className={td}>
                  <Link href={`/board/${m.id}`} className="font-semibold hover:text-yellow">
                    {m.name ?? m.id}
                  </Link>
                </td>
                <td className={td}>{m.title ?? "—"}</td>
                <td className={td}>{m.email ?? "—"}</td>
                <td className={td}>{m.order ?? 0}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td className={td} colSpan={5}>
                  No board members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
