"use client";

import { useFormStatus } from "react-dom";
import Spinner from "./Spinner";
import { btnPrimary, btnSecondary, btnDanger, btnSmall } from "@/lib/ui";

const VARIANTS = { primary: btnPrimary, secondary: btnSecondary, danger: btnDanger };

// For forms with a single submit button, `name`/`value` can be omitted — the
// button is "busy" whenever the form is pending. For forms with multiple
// submit buttons (e.g. Save vs. Save & Add Another), pass the shared field
// `name` and this button's `value` so only the button that was actually
// clicked shows its spinner.
export default function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  small,
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: keyof typeof VARIANTS;
  small?: boolean;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending, data } = useFormStatus();
  const isThisButton = name ? data?.get(name) === value : true;
  const busy = pending && isThisButton;

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={[VARIANTS[variant], small ? btnSmall : "", "inline-flex items-center gap-2", className]
        .filter(Boolean)
        .join(" ")}
    >
      {busy && <Spinner />}
      {busy ? pendingText ?? "Working…" : children}
    </button>
  );
}
