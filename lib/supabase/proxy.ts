import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function updateSession(
  request: NextRequest,
) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";

  /*
   * Cookie Supabase thường có tên chứa:
   * sb-<project-ref>-auth-token
   *
   * Nếu không có cookie Auth và người dùng đang mở /login,
   * không cần gọi Supabase Auth qua mạng.
   */
  const hasSupabaseAuthCookie =
    request.cookies
      .getAll()
      .some(
        (cookie) =>
          cookie.name.startsWith("sb-") &&
          cookie.name.includes(
            "-auth-token",
          ),
      );

  if (
    isLoginPage &&
    !hasSupabaseAuthCookie
  ) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Thiếu biến môi trường Supabase trong Proxy.",
    );
  }

  const supabase = createServerClient(
    supabaseUrl,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            request.cookies.set(
              cookie.name,
              cookie.value,
            );
          }

          response = NextResponse.next({
            request,
          });

          for (const cookie of cookiesToSet) {
            response.cookies.set(
              cookie.name,
              cookie.value,
              cookie.options,
            );
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLoginPage) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";

    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(
      loginUrl,
    );
  }

  if (user && isLoginPage) {
    const dashboardUrl =
      request.nextUrl.clone();

    dashboardUrl.pathname = "/";
    dashboardUrl.search = "";

    return NextResponse.redirect(
      dashboardUrl,
    );
  }

  return response;
}