"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getText(
  formData: FormData,
  fieldName: string,
) {
  return String(formData.get(fieldName) ?? "").trim();
}

function safeRedirectPath(value: string) {
  if (
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/";
}

export async function login(formData: FormData) {
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  const nextPath = safeRedirectPath(
    getText(formData, "next"),
  );

  if (!email || !password) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Vui lòng nhập email và mật khẩu.",
      )}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Email hoặc mật khẩu không chính xác.",
      )}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  redirect(nextPath);
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}
