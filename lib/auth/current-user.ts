import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type CurrentUserContext = {
  userId: string;
  email: string | null;
  profileId: string;
  fullName: string;
  organizationId: string;
};

export async function requireCurrentUser(): Promise<CurrentUserContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const profile = await prisma.profiles.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      full_name: true,
      organization_id: true,
    },
  });

  if (!profile) {
    throw new Error(
      "Tài khoản chưa có hồ sơ trong bảng profiles.",
    );
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profileId: profile.id,
    fullName: profile.full_name,
    organizationId: profile.organization_id,
  };
}
