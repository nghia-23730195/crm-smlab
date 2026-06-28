"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  idleText: string;
  pendingText?: string;
  className?: string;
};

export default function SubmitButton({
  idleText,
  pendingText = "Đang xử lý...",
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? pendingText : idleText}
    </button>
  );
}