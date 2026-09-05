"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export async function getNextStemCode(organizationId: string): Promise<string> {
  const existing = await prisma.stem_models.findMany({
    where: {
      organization_id: organizationId,
    },
    select: {
      model_code: true,
    },
  });

  let maxNum = 0;
  for (const m of existing) {
    const match = m.model_code.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `STEM-${String(nextNum).padStart(3, "0")}`;
}

export async function createStemModel(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  const model_name = String(formData.get("model_name") ?? "").trim();
  if (!model_name) {
    redirect("/stem/new?error=" + encodeURIComponent("Vui lòng nhập tên mô hình STEM."));
  }

  let model_code = String(formData.get("model_code") ?? "").trim();
  if (!model_code) {
    model_code = await getNextStemCode(organizationId);
  }

  const target_grade = String(formData.get("target_grade") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const difficulty_level = String(formData.get("difficulty_level") ?? "Trung bình").trim();
  const estimated_cost = Number(formData.get("estimated_cost") ?? 0);
  const materials_summary = String(formData.get("materials_summary") ?? "").trim();
  const document_links = String(formData.get("document_links") ?? "").trim();
  const status = String(formData.get("status") ?? "idea").trim();
  const description = String(formData.get("description") ?? "").trim();

  await prisma.stem_models.create({
    data: {
      organization_id: organizationId,
      model_code,
      model_name,
      target_grade: target_grade || null,
      subject: subject || null,
      difficulty_level: difficulty_level || "Trung bình",
      estimated_cost: Number.isFinite(estimated_cost) ? estimated_cost : 0,
      materials_summary: materials_summary || null,
      document_links: document_links || null,
      status: status || "idea",
      description: description || null,
    },
  });

  revalidatePath("/stem");
  redirect("/stem?success=created");
}

export async function updateStemModel(id: string, formData: FormData) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  const existing = await prisma.stem_models.findFirst({
    where: {
      id,
      organization_id: organizationId,
    },
  });

  if (!existing) {
    redirect("/stem?error=" + encodeURIComponent("Không tìm thấy mô hình STEM cần cập nhật."));
  }

  const model_name = String(formData.get("model_name") ?? "").trim();
  if (!model_name) {
    redirect(`/stem/${id}/edit?error=` + encodeURIComponent("Vui lòng nhập tên mô hình STEM."));
  }

  const model_code = String(formData.get("model_code") ?? existing.model_code).trim();
  const target_grade = String(formData.get("target_grade") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const difficulty_level = String(formData.get("difficulty_level") ?? existing.difficulty_level).trim();
  const estimated_cost = Number(formData.get("estimated_cost") ?? existing.estimated_cost);
  const materials_summary = String(formData.get("materials_summary") ?? "").trim();
  const document_links = String(formData.get("document_links") ?? "").trim();
  const status = String(formData.get("status") ?? existing.status).trim();
  const description = String(formData.get("description") ?? "").trim();

  await prisma.stem_models.update({
    where: {
      id,
    },
    data: {
      model_code,
      model_name,
      target_grade: target_grade || null,
      subject: subject || null,
      difficulty_level: difficulty_level || "Trung bình",
      estimated_cost: Number.isFinite(estimated_cost) ? estimated_cost : 0,
      materials_summary: materials_summary || null,
      document_links: document_links || null,
      status: status || "idea",
      description: description || null,
      updated_at: new Date(),
    },
  });

  revalidatePath("/stem");
  redirect("/stem?success=updated");
}

export async function updateStemModelStatus(id: string, newStatus: string) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  await prisma.stem_models.updateMany({
    where: {
      id,
      organization_id: organizationId,
    },
    data: {
      status: newStatus,
      updated_at: new Date(),
    },
  });

  revalidatePath("/stem");
}

export async function deleteStemModel(id: string) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  await prisma.stem_models.deleteMany({
    where: {
      id,
      organization_id: organizationId,
    },
  });

  revalidatePath("/stem");
  redirect("/stem?success=deleted");
}
