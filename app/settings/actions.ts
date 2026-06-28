"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

function getText(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function redirectWithError(message: string): never {
  redirect(
    `/settings?error=${encodeURIComponent(message)}`,
  );
}

export async function updateOrganization(
  formData: FormData,
) {
  const name = getText(formData, "name");
  const phone = getText(formData, "phone");
  const email = getText(formData, "email");
  const address = getText(formData, "address");
  const taxCode = getText(formData, "tax_code");
  const logoUrl = getText(formData, "logo_url");

  if (!name) {
    redirectWithError(
      "Vui lòng nhập tên doanh nghiệp.",
    );
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    redirectWithError(
      "Địa chỉ email không hợp lệ.",
    );
  }

  if (logoUrl) {
    try {
      new URL(logoUrl);
    } catch {
      redirectWithError(
        "Đường dẫn logo không hợp lệ.",
      );
    }
  }

  const result =
    await prisma.organizations.updateMany({
      where: {
        id: ORGANIZATION_ID,
      },
      data: {
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        tax_code: taxCode || null,
        logo_url: logoUrl || null,
        updated_at: new Date(),
      },
    });

  if (result.count === 0) {
    redirectWithError(
      "Không tìm thấy thông tin doanh nghiệp.",
    );
  }

  revalidatePath("/settings");
  revalidatePath("/");

  redirect("/settings?success=updated");
}