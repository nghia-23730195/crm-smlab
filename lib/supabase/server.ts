import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Thiếu biến môi trường Supabase phía máy chủ.",
    );
  }

  return createServerClient(
    supabaseUrl,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            for (const {
              name,
              value,
              options,
            } of cookiesToSet) {
              cookieStore.set(
                name,
                value,
                options,
              );
            }
          } catch {
            /*
             * Có thể xảy ra khi Server Component
             * không được phép ghi cookie.
             * Proxy sẽ đảm nhiệm việc làm mới phiên.
             */
          }
        },
      },
    },
  );
}