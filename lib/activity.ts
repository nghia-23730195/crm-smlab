import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "change_status"
  | "create_transaction"
  | "stock_movement";

export type ActivityEntityType =
  | "project"
  | "customer"
  | "transaction"
  | "product"
  | "inventory_movement";

export async function recordActivity({
  organizationId,
  userId,
  action,
  entityType,
  entityId,
  oldData,
  newData,
}: {
  organizationId: string;
  userId?: string | null;
  action: ActivityAction | string;
  entityType: ActivityEntityType | string;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}) {
  try {
    await prisma.activity_logs.create({
      data: {
        organization_id: organizationId,
        user_id: userId ?? null,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        old_data: (oldData as Prisma.InputJsonValue) ?? undefined,
        new_data: (newData as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (error) {
    // Non-blocking: log error to console without breaking main user workflow
    console.error("Lỗi khi ghi nhật ký hoạt động:", error);
  }
}

export function formatActivityText(log: {
  action: string;
  entity_type: string;
  new_data?: unknown;
  old_data?: unknown;
}) {
  const data = (log.new_data as Record<string, string | number | undefined>) || {};

  switch (log.entity_type) {
    case "project":
      if (log.action === "change_status") {
        return `Đổi trạng thái dự án "${data.project_name || data.project_code || ""}" sang "${data.new_status_label || data.status || ""}"`;
      }
      if (log.action === "create") {
        return `Tạo mới dự án "${data.project_name || data.project_code || ""}"`;
      }
      if (log.action === "update") {
        return `Cập nhật thông tin dự án "${data.project_name || ""}"`;
      }
      if (log.action === "delete") {
        return `Đã xóa dự án "${data.project_name || ""}"`;
      }
      return `Thao tác dự án "${data.project_name || ""}"`;

    case "customer":
      if (log.action === "change_status") {
        if (data.status === "in_progress") {
          return `Khách hàng "${data.full_name || ""}" đã chốt cọc và chuyển sang Đang thực hiện`;
        }
        return `Đổi trạng thái khách hàng "${data.full_name || ""}" sang "${data.status || ""}"`;
      }
      if (log.action === "create") {
        return `Thêm mới khách hàng "${data.full_name || ""}" (${data.customer_code || ""})`;
      }
      if (log.action === "update") {
        return `Cập nhật thông tin khách hàng "${data.full_name || ""}"`;
      }
      return `Thao tác khách hàng "${data.full_name || ""}"`;

    case "transaction":
      if (log.action === "create") {
        const type = data.transaction_type === "income" ? "Thu tiền" : "Chi tiền";
        return `Lập phiếu ${type} ${new Intl.NumberFormat("vi-VN").format(Number(data.amount || 0))} đ - ${data.category || ""}`;
      }
      return `Thao tác sổ quỹ giao dịch`;

    default:
      return `${log.action} trên ${log.entity_type}`;
  }
}
