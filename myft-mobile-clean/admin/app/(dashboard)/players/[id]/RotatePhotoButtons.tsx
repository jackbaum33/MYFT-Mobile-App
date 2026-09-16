"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { rotatePlayerPhotoAction } from "../actions";
import { btnSecondary, btnSmall } from "@/lib/ui";

export default function RotatePhotoButtons({ playerId }: { playerId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const rotate = (degrees: 90 | -90) => {
    startTransition(async () => {
      await rotatePlayerPhotoAction(playerId, degrees);
      router.refresh();
    });
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => rotate(-90)}
        className={`${btnSecondary} ${btnSmall}`}
      >
        ↺ Rotate Left
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => rotate(90)}
        className={`${btnSecondary} ${btnSmall}`}
      >
        ↻ Rotate Right
      </button>
    </div>
  );
}
