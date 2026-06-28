"use client";

import { useFormStatus } from "react-dom";

import { logout } from "@/app/login/actions";

function LogoutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Đang đăng xuất..." : "Đăng xuất"}
    </button>
  );
}

export default function LogoutButton() {
  return (
    <form action={logout}>
      <LogoutSubmitButton />
    </form>
  );
}