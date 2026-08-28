"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { recordActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

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

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("Ngày tháng không hợp lệ.");
  }

  return new Date(Date.UTC(year, month - 1, day));
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

  const actualValue = parseMoney(
    getText(formData, "actual_value"),
    "Giá trị thực tế",
  );

  const paidAmount = parseMoney(
    getText(formData, "paid_amount"),
    "Số tiền đã thanh toán",
  );

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
    actualValue,
    paidAmount,
  };
}

export async function createProject(
  formData: FormData,
) {
  const { organizationId, userId } =
    await requireCurrentUser();

  const data =
    getProjectData(formData);

  let finalProjectCode = data.projectCode;

  if (!finalProjectCode) {
    const allProjects = await prisma.projects.findMany({
      where: {
        organization_id: organizationId,
      },
      select: {
        project_code: true,
      },
    });

    let maxNum = 0;
    for (const p of allProjects) {
      const match = p.project_code.match(/(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
    finalProjectCode = `DA-${String(Math.max(maxNum + 1, allProjects.length + 1)).padStart(3, "0")}`;
  }

  const duplicateProject =
    await prisma.projects.findFirst({
      where: {
        organization_id: organizationId,
        project_code: finalProjectCode,
      },
      select: {
        id: true,
      },
    });

  if (duplicateProject) {
    throw new Error(
      `Mã dự án ${finalProjectCode} đã tồn tại.`,
    );
  }

  if (data.customerId) {
    const customer =
      await prisma.customers.findFirst({
        where: {
          id: data.customerId,
          organization_id: organizationId,
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

  const newProject = await prisma.projects.create({
    data: {
      organization_id: organizationId,
      project_code: finalProjectCode,
      project_name: data.projectName,
      customer_id: data.customerId || null,
      project_type: data.projectType || null,
      status: data.status,
      description: data.description || null,
      start_date: data.startDate,
      due_date: data.dueDate ?? data.completedDate,
      completed_date:
        data.status === "completed"
          ? data.completedDate ?? data.dueDate ?? new Date()
          : data.completedDate,
      actual_value: data.actualValue,
      paid_amount: data.paidAmount,
      assigned_to: null,
      created_by: null,
    },
  });

  await recordActivity({
    organizationId,
    userId,
    action: "create",
    entityType: "project",
    entityId: newProject.id,
    newData: {
      project_name: data.projectName,
      project_code: data.projectCode,
    },
  });

  revalidatePath("/projects");
  revalidatePath("/reports");
  revalidatePath("/");

  redirect("/projects?success=created");
}

export async function updateProject(
  projectId: string,
  formData: FormData,
) {
  const { organizationId, userId } =
    await requireCurrentUser();

  const data =
    getProjectData(formData);

  const currentProject =
    await prisma.projects.findFirst({
      where: {
        id: projectId,
        organization_id: organizationId,
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
        organization_id: organizationId,
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
          organization_id: organizationId,
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
      due_date: data.dueDate ?? data.completedDate,
      completed_date:
        data.status === "completed"
          ? data.completedDate ?? data.dueDate ?? new Date()
          : data.completedDate,
      actual_value: data.actualValue,
      paid_amount: data.paidAmount,
      updated_at: new Date(),
    },
  });

  await recordActivity({
    organizationId,
    userId,
    action: "update",
    entityType: "project",
    entityId: projectId,
    newData: {
      project_name: data.projectName,
      project_code: data.projectCode,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}/edit`);
  revalidatePath("/reports");
  revalidatePath("/");

  redirect("/projects?success=updated");
}

export async function changeProjectStatus(
  projectId: string,
  nextStatus: ProjectStatus,
) {
  const { organizationId, userId } =
    await requireCurrentUser();

  if (!VALID_STATUSES.includes(nextStatus)) {
    throw new Error(
      "Trạng thái dự án không hợp lệ.",
    );
  }

  const project =
    await prisma.projects.findFirst({
      where: {
        id: projectId,
        organization_id:
          organizationId,
      },
      select: {
        id: true,
        project_name: true,
        project_code: true,
        status: true,
      },
    });

  if (!project) {
    throw new Error(
      "Không tìm thấy dự án.",
    );
  }

  await prisma.projects.update({
    where: {
      id: project.id,
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

  await recordActivity({
    organizationId,
    userId,
    action: "change_status",
    entityType: "project",
    entityId: projectId,
    newData: {
      project_name: project.project_name,
      project_code: project.project_code,
      status: nextStatus,
    },
    oldData: {
      status: project.status,
    },
  });

  revalidatePath("/projects");
  revalidatePath("/reports");
  revalidatePath("/");
}

export async function deleteProject(projectId: string) {
  const { organizationId, userId } =
    await requireCurrentUser();

  const project = await prisma.projects.findFirst({
    where: {
      id: projectId,
      organization_id: organizationId,
    },
    include: {
      _count: {
        select: {
          transactions: true,
          inventoryMovements: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error("Không tìm thấy dự án.");
  }

  if (
    project._count.transactions > 0 ||
    project._count.inventoryMovements > 0
  ) {
    throw new Error(
      "Không thể xóa dự án đã có giao dịch tài chính hoặc phiếu xuất kho. Hãy đổi trạng thái sang 'Đã hủy'.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.project_items.deleteMany({
      where: {
        project_id: projectId,
      },
    });

    await tx.projects.delete({
      where: {
        id: projectId,
      },
    });
  });

  await recordActivity({
    organizationId,
    userId,
    action: "delete",
    entityType: "project",
    entityId: projectId,
    newData: {
      project_name: project.project_name,
      project_code: project.project_code,
    },
  });

  revalidatePath("/projects");
  revalidatePath("/reports");
  revalidatePath("/");

  redirect("/projects?success=deleted");
}

export async function updateProjectPayment(
  projectId: string,
  newPaidAmountNumber: number,
  syncToFinance: boolean = true,
) {
  const { organizationId, userId } = await requireCurrentUser();

  const project = await prisma.projects.findFirst({
    where: {
      id: projectId,
      organization_id: organizationId,
    },
    select: {
      id: true,
      project_code: true,
      project_name: true,
      actual_value: true,
      paid_amount: true,
      customer_id: true,
    },
  });

  if (!project) {
    throw new Error("Không tìm thấy dự án.");
  }

  const oldPaid = Number(project.paid_amount ?? 0);
  const newPaid = Math.max(0, newPaidAmountNumber);
  const diff = newPaid - oldPaid;

  await prisma.projects.update({
    where: {
      id: projectId,
    },
    data: {
      paid_amount: newPaid,
      updated_at: new Date(),
    },
  });

  // Tự động tạo phiếu thu vào sổ quỹ tài chính nếu số tiền thanh toán tăng lên
  if (syncToFinance && diff > 0) {
    const transactionCode = `THU-${project.project_code}-${Date.now().toString().slice(-4)}`;
    await prisma.transactions.create({
      data: {
        organization_id: organizationId,
        transaction_code: transactionCode,
        transaction_type: "income",
        category: "Doanh thu dự án",
        amount: diff,
        payment_method: "transfer",
        customer_id: project.customer_id,
        project_id: projectId,
        description: `Thu tiền dự án ${project.project_code} - ${project.project_name}`,
        created_by: userId,
      },
    });
  }

  await recordActivity({
    organizationId,
    userId,
    action: "update",
    entityType: "project",
    entityId: projectId,
    newData: {
      project_name: project.project_name,
      project_code: project.project_code,
      paid_amount: newPaid,
      diff,
    },
    oldData: {
      paid_amount: oldPaid,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/finance");
  revalidatePath("/reports");
  revalidatePath("/");
}