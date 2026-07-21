"use client";

import { useFormStatus } from "react-dom";
import Spinner from "./Spinner";

export default function ConfirmSubmitButton({
  children,
  confirmText,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  confirmText: string;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={["inline-flex items-center gap-2", className].filter(Boolean).join(" ")}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending && <Spinner />}
      {pending ? pendingText ?? "Working…" : children}
    </button>
  );
}
