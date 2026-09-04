"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export async function getNextOrderIndex(organizationId: string): Promise<number> {
  const maxTopic = await prisma.rd_topics.findFirst({
    where: {
      organization_id: organizationId,
    },
    orderBy: {
      order_index: "desc",
    },
    select: {
      order_index: true,
    },
  });

  return (maxTopic?.order_index ?? 0) + 1;
}

export async function createRdTopic(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  const topic_name = String(formData.get("topic_name") ?? "").trim();
  if (!topic_name) {
    redirect("/rd/new?error=" + encodeURIComponent("Vui lòng nhập tên đề tài."));
  }

  const description = String(formData.get("description") ?? "").trim();
  const target_audience = String(formData.get("target_audience") ?? "").trim();
  const field_category = String(formData.get("field_category") ?? "").trim();
  const document_links = String(formData.get("document_links") ?? "").trim();
  const status = String(formData.get("status") ?? "pending").trim();
  const keywords = String(formData.get("keywords") ?? "").trim();

  const customOrderIndex = Number(formData.get("order_index"));
  const order_index =
    Number.isFinite(customOrderIndex) && customOrderIndex > 0
      ? customOrderIndex
      : await getNextOrderIndex(organizationId);

  await prisma.rd_topics.create({
    data: {
      organization_id: organizationId,
      order_index,
      topic_name,
      description: description || null,
      target_audience: target_audience || null,
      field_category: field_category || null,
      document_links: document_links || null,
      status: status || "pending",
      keywords: keywords || null,
    },
  });

  revalidatePath("/rd");
  redirect("/rd?success=created");
}

export async function updateRdTopic(id: string, formData: FormData) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  const existing = await prisma.rd_topics.findFirst({
    where: {
      id,
      organization_id: organizationId,
    },
  });

  if (!existing) {
    redirect("/rd?error=" + encodeURIComponent("Không tìm thấy đề tài cần cập nhật."));
  }

  const topic_name = String(formData.get("topic_name") ?? "").trim();
  if (!topic_name) {
    redirect(`/rd/${id}/edit?error=` + encodeURIComponent("Vui lòng nhập tên đề tài."));
  }

  const description = String(formData.get("description") ?? "").trim();
  const target_audience = String(formData.get("target_audience") ?? "").trim();
  const field_category = String(formData.get("field_category") ?? "").trim();
  const document_links = String(formData.get("document_links") ?? "").trim();
  const status = String(formData.get("status") ?? "pending").trim();
  const keywords = String(formData.get("keywords") ?? "").trim();

  const customOrderIndex = Number(formData.get("order_index"));
  const order_index =
    Number.isFinite(customOrderIndex) && customOrderIndex > 0
      ? customOrderIndex
      : existing.order_index;

  await prisma.rd_topics.update({
    where: {
      id,
    },
    data: {
      order_index,
      topic_name,
      description: description || null,
      target_audience: target_audience || null,
      field_category: field_category || null,
      document_links: document_links || null,
      status: status || "pending",
      keywords: keywords || null,
      updated_at: new Date(),
    },
  });

  revalidatePath("/rd");
  redirect("/rd?success=updated");
}

export async function updateRdTopicStatus(id: string, newStatus: string) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  await prisma.rd_topics.updateMany({
    where: {
      id,
      organization_id: organizationId,
    },
    data: {
      status: newStatus,
      updated_at: new Date(),
    },
  });

  revalidatePath("/rd");
}

export async function deleteRdTopic(id: string) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  await prisma.rd_topics.deleteMany({
    where: {
      id,
      organization_id: organizationId,
    },
  });

  revalidatePath("/rd");
  redirect("/rd?success=deleted");
}