"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

type ProjectStatus =
  | "draft"
  | "planning"
  | "in_progress"
  | "waiting"
  | "completed"
  | "cancelled";

const VALID_STATUSES: ProjectStatus[] = [
  "draft",
  "planning",
  "in_progress",
  "waiting",
  "completed",
  "cancelled",
];

function getText(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function parseOptionalDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Ngày tháng không hợp lệ.");
  }

  return date;
}

function parseMoney(value: string, fieldLabel: string) {
  const normalizedValue = value.replace(/[,. ]/g, "");

  if (!normalizedValue) {
    return "0";
  }

  const amount = Number(normalizedValue);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${fieldLabel} phải là số lớn hơn hoặc bằng 0.`);
  }

  return amount.toString();
}

function getProjectData(formData: FormData) {
  const projectCode = getText(formData, "project_code");
  const projectName = getText(formData, "project_name");
  const customerId = getText(formData, "customer_id");
  const projectType = getText(formData, "project_type");
  const description = getText(formData, "description");

  const status = getText(
    formData,
    "status",
  ) as ProjectStatus;

  const startDate = parseOptionalDate(
    getText(formData, "start_date"),
  );

  const dueDate = parseOptionalDate(
    getText(formData, "due_date"),
  );

  const completedDate = parseOptionalDate(
    getText(formData, "completed_date"),
  );

  const estimatedValue = parseMoney(
    getText(formData, "estimated_value"),
    "Giá trị dự kiến",
  );

  const actualValue = parseMoney(
    getText(formData, "actual_value"),
    "Giá trị thực tế",
  );

  const paidAmount = parseMoney(
    getText(formData, "paid_amount"),
    "Số tiền đã thanh toán",
  );

  if (!projectCode) {
    throw new Error("Vui lòng nhập mã dự án.");
  }

  if (!projectName) {
    throw new Error("Vui lòng nhập tên dự án.");
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Trạng thái dự án không hợp lệ.");
  }

  if (startDate && dueDate && dueDate < startDate) {
    throw new Error(
      "Hạn hoàn thành không được nhỏ hơn ngày bắt đầu.",
    );
  }

  if (
    completedDate &&
    startDate &&
    completedDate < startDate
  ) {
    throw new Error(
      "Ngày hoàn thành không được nhỏ hơn ngày bắt đầu.",
    );
  }

  return {
    projectCode,
    projectName,
    customerId,
    projectType,
    description,
    status,
    startDate,
    dueDate,
    completedDate,
    estimatedValue,
    actualValue,
    paidAmount,
  };
}

export async function createProject(formData: FormData) {
  const data = getProjectData(formData);

  const duplicateProject =
    await prisma.projects.findFirst({
      where: {
        organization_id: ORGANIZATION_ID,
        project_code: data.projectCode,
      },
      select: {
        id: true,
      },
    });

  if (duplicateProject) {
    throw new Error(
      `Mã dự án ${data.projectCode} đã tồn tại.`,
    );
  }

  if (data.customerId) {
    const customer =
      await prisma.customers.findFirst({
        where: {
          id: data.customerId,
          organization_id: ORGANIZATION_ID,
        },
        select: {
          id: true,
        },
      });

    if (!customer) {
      throw new Error(
        "Khách hàng được chọn không tồn tại.",
      );
    }
  }

  await prisma.projects.create({
    data: {
      organization_id: ORGANIZATION_ID,
      project_code: data.projectCode,
      project_name: data.projectName,
      customer_id: data.customerId || null,
      project_type: data.projectType || null,
      status: data.status,
      description: data.description || null,
      start_date: data.startDate,
      due_date: data.dueDate,
      completed_date:
        data.status === "completed"
          ? data.completedDate ?? new Date()
          : data.completedDate,
      estimated_value: data.estimatedValue,
      actual_value: data.actualValue,
      paid_amount: data.paidAmount,
      assigned_to: null,
      created_by: null,
    },
  });

  revalidatePath("/projects");
  revalidatePath("/");

  redirect("/projects");
}

export async function updateProject(
  projectId: string,
  formData: FormData,
) {
  const data = getProjectData(formData);

  const currentProject =
    await prisma.projects.findFirst({
      where: {
        id: projectId,
        organization_id: ORGANIZATION_ID,
      },
      select: {
        id: true,
      },
    });

  if (!currentProject) {
    throw new Error(
      "Không tìm thấy dự án cần cập nhật.",
    );
  }

  const duplicateProject =
    await prisma.projects.findFirst({
      where: {
        organization_id: ORGANIZATION_ID,
        project_code: data.projectCode,
        NOT: {
          id: projectId,
        },
      },
      select: {
        id: true,
      },
    });

  if (duplicateProject) {
    throw new Error(
      `Mã dự án ${data.projectCode} đã được sử dụng.`,
    );
  }

  if (data.customerId) {
    const customer =
      await prisma.customers.findFirst({
        where: {
          id: data.customerId,
          organization_id: ORGANIZATION_ID,
        },
        select: {
          id: true,
        },
      });

    if (!customer) {
      throw new Error(
        "Khách hàng được chọn không tồn tại.",
      );
    }
  }

  await prisma.projects.update({
    where: {
      id: projectId,
    },
    data: {
      project_code: data.projectCode,
      project_name: data.projectName,
      customer_id: data.customerId || null,
      project_type: data.projectType || null,
      status: data.status,
      description: data.description || null,
      start_date: data.startDate,
      due_date: data.dueDate,
      completed_date:
        data.status === "completed"
          ? data.completedDate ?? new Date()
          : data.completedDate,
      estimated_value: data.estimatedValue,
      actual_value: data.actualValue,
      paid_amount: data.paidAmount,
      updated_at: new Date(),
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}/edit`);
  revalidatePath("/");

  redirect("/projects");
}

export async function changeProjectStatus(
  projectId: string,
  nextStatus: ProjectStatus,
) {
  if (!VALID_STATUSES.includes(nextStatus)) {
    throw new Error("Trạng thái dự án không hợp lệ.");
  }

  const project =
    await prisma.projects.findFirst({
      where: {
        id: projectId,
        organization_id: ORGANIZATION_ID,
      },
      select: {
        id: true,
      },
    });

  if (!project) {
    throw new Error("Không tìm thấy dự án.");
  }

  await prisma.projects.update({
    where: {
      id: projectId,
    },
    data: {
      status: nextStatus,
      completed_date:
        nextStatus === "completed"
          ? new Date()
          : null,
      updated_at: new Date(),
    },
  });

  revalidatePath("/projects");
  revalidatePath("/");
}