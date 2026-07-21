"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

// Drop inside a <form> that revalidates in place (doesn't redirect away) to
// show a brief confirmation once a pending submission finishes.
export default function SavedToast({ message = "Saved" }: { message?: string }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (wasPending.current) {
      wasPending.current = false;
      setShow(true);
      const t = setTimeout(() => setShow(false), 2500);
      return () => clearTimeout(t);
    }
  }, [pending]);

  if (!show) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-green-400/30 bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </div>
  );
}
