"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export async function getNextTaskCode(organizationId: string): Promise<string> {
  const existingTasks = await prisma.tasks.findMany({
    where: {
      organization_id: organizationId,
    },
    select: {
      task_code: true,
    },
  });

  let maxNum = 0;
  for (const t of existingTasks) {
    const match = t.task_code.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `CV-${String(nextNum).padStart(3, "0")}`;
}

export async function createTask(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    redirect("/tasks/new?error=" + encodeURIComponent("Vui lòng nhập tên công việc."));
  }

  let task_code = String(formData.get("task_code") ?? "").trim();
  if (!task_code) {
    task_code = await getNextTaskCode(organizationId);
  }

  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "todo").trim();
  const priority = String(formData.get("priority") ?? "medium").trim();
  const progress = Math.min(100, Math.max(0, Number(formData.get("progress") ?? 0)));

  const start_date_str = String(formData.get("start_date") ?? "").trim();
  const start_date = start_date_str ? new Date(start_date_str) : null;

  const due_date_str = String(formData.get("due_date") ?? "").trim();
  const due_date = due_date_str ? new Date(due_date_str) : null;

  const project_id_raw = String(formData.get("project_id") ?? "").trim();
  const project_id = project_id_raw || null;

  const assigned_to_raw = String(formData.get("assigned_to") ?? "").trim();
  const assigned_to = assigned_to_raw || null;

  let assignee_name = String(formData.get("assignee_name") ?? "").trim();
  if (assigned_to && !assignee_name) {
    const profile = await prisma.profiles.findUnique({
      where: { id: assigned_to },
      select: { full_name: true },
    });
    if (profile) {
      assignee_name = profile.full_name;
    }
  }

  await prisma.tasks.create({
    data: {
      organization_id: organizationId,
      task_code,
      title,
      description: description || null,
      status,
      priority,
      progress,
      start_date,
      due_date,
      project_id,
      assigned_to,
      assignee_name: assignee_name || null,
      created_by: currentUser.profileId,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  redirect("/tasks?success=created");
}

export async function updateTask(id: string, formData: FormData) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  const existing = await prisma.tasks.findFirst({
    where: {
      id,
      organization_id: organizationId,
    },
  });

  if (!existing) {
    redirect("/tasks?error=" + encodeURIComponent("Không tìm thấy công việc cần cập nhật."));
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    redirect(`/tasks/${id}/edit?error=` + encodeURIComponent("Vui lòng nhập tên công việc."));
  }

  const task_code = String(formData.get("task_code") ?? existing.task_code).trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? existing.status).trim();
  const priority = String(formData.get("priority") ?? existing.priority).trim();
  const progress = Math.min(100, Math.max(0, Number(formData.get("progress") ?? existing.progress)));

  const start_date_str = String(formData.get("start_date") ?? "").trim();
  const start_date = start_date_str ? new Date(start_date_str) : null;

  const due_date_str = String(formData.get("due_date") ?? "").trim();
  const due_date = due_date_str ? new Date(due_date_str) : null;

  const project_id_raw = String(formData.get("project_id") ?? "").trim();
  const project_id = project_id_raw || null;

  const assigned_to_raw = String(formData.get("assigned_to") ?? "").trim();
  const assigned_to = assigned_to_raw || null;

  let assignee_name = String(formData.get("assignee_name") ?? "").trim();
  if (assigned_to && !assignee_name) {
    const profile = await prisma.profiles.findUnique({
      where: { id: assigned_to },
      select: { full_name: true },
    });
    if (profile) {
      assignee_name = profile.full_name;
    }
  }

  await prisma.tasks.update({
    where: {
      id,
    },
    data: {
      task_code,
      title,
      description: description || null,
      status,
      priority,
      progress,
      start_date,
      due_date,
      project_id,
      assigned_to,
      assignee_name: assignee_name || null,
      updated_at: new Date(),
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  redirect("/tasks?success=updated");
}

export async function changeTaskStatus(id: string, newStatus: string) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  const updateData: {
    status: string;
    progress?: number;
    updated_at: Date;
  } = {
    status: newStatus,
    updated_at: new Date(),
  };

  // If completed, set progress to 100%
  if (newStatus === "completed") {
    updateData.progress = 100;
  }

  await prisma.tasks.updateMany({
    where: {
      id,
      organization_id: organizationId,
    },
    data: updateData,
  });

  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function changeTaskProgress(id: string, newProgress: number) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  const progress = Math.min(100, Math.max(0, newProgress));
  const updateData: {
    progress: number;
    status?: string;
    updated_at: Date;
  } = {
    progress,
    updated_at: new Date(),
  };

  if (progress === 100) {
    updateData.status = "completed";
  }

  await prisma.tasks.updateMany({
    where: {
      id,
      organization_id: organizationId,
    },
    data: updateData,
  });

  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;

  await prisma.tasks.deleteMany({
    where: {
      id,
      organization_id: organizationId,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  redirect("/tasks?success=deleted");
}