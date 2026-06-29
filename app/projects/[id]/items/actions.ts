"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

type PurchaseStatus =
  | "not_purchased"
  | "purchased"
  | "cancelled";

const VALID_PURCHASE_STATUSES: PurchaseStatus[] = [
  "not_purchased",
  "purchased",
  "cancelled",
];

function getText(
  formData: FormData,
  fieldName: string,
) {
  return String(
    formData.get(fieldName) ?? "",
  ).trim();
}

function getNonNegativeNumber(
  formData: FormData,
  fieldName: string,
  label: string,
) {
  const rawValue = getText(formData, fieldName);
  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `${label} phải là số lớn hơn hoặc bằng 0.`,
    );
  }

  return value;
}

function getPositiveNumber(
  formData: FormData,
  fieldName: string,
  label: string,
) {
  const value = getNonNegativeNumber(
    formData,
    fieldName,
    label,
  );

  if (value <= 0) {
    throw new Error(
      `${label} phải lớn hơn 0.`,
    );
  }

  return value;
}

function validateOptionalUrl(value: string) {
  if (!value) {
    return;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      throw new Error();
    }
  } catch {
    throw new Error(
      "Link sản phẩm không hợp lệ.",
    );
  }
}

async function verifyProject(
  projectId: string,
  organizationId: string,
) {
  const project =
    await prisma.projects.findFirst({
      where: {
        id: projectId,
        organization_id:
          organizationId,
      },
      select: {
        id: true,
      },
    });

  if (!project) {
    throw new Error(
      "Không tìm thấy dự án.",
    );
  }

  return project;
}

function getProjectItemData(formData: FormData) {
  const itemName = getText(
    formData,
    "item_name",
  );

  const productId = getText(
    formData,
    "product_id",
  );

  const quantity = getPositiveNumber(
    formData,
    "quantity",
    "Số lượng",
  );

  const unitPrice = getNonNegativeNumber(
    formData,
    "unit_price",
    "Đơn giá",
  );

  const discount = getNonNegativeNumber(
    formData,
    "discount",
    "Giảm giá",
  );

  const productUrl = getText(
    formData,
    "product_url",
  );

  const purchaseStatus = getText(
    formData,
    "purchase_status",
  ) as PurchaseStatus;

  const notes = getText(
    formData,
    "notes",
  );

  if (!itemName) {
    throw new Error(
      "Vui lòng nhập tên linh kiện.",
    );
  }

  if (
    !VALID_PURCHASE_STATUSES.includes(
      purchaseStatus,
    )
  ) {
    throw new Error(
      "Trạng thái mua không hợp lệ.",
    );
  }

  validateOptionalUrl(productUrl);

  return {
    itemName,
    productId,
    quantity,
    unitPrice,
    discount,
    productUrl,
    purchaseStatus,
    notes,
  };
}

export async function createProjectItem(
  projectId: string,
  formData: FormData,
) {
  const { organizationId } =
    await requireCurrentUser();

  await verifyProject(
    projectId,
    organizationId,
  );

  const data =
    getProjectItemData(formData);

  await prisma.project_items.create({
    data: {
      project_id: projectId,
      product_id: data.productId || null,
      item_name: data.itemName,
      quantity: data.quantity,
      unit_price: data.unitPrice,
      discount: data.discount,
      product_url: data.productUrl || null,
      purchase_status:
        data.purchaseStatus,
      notes: data.notes || null,
    },
  });

  revalidatePath(
    `/projects/${projectId}/items`,
  );
  revalidatePath("/projects");
  revalidatePath("/reports");

  redirect(
    `/projects/${projectId}/items?success=created`,
  );
}

export async function updateProjectItem(
  projectId: string,
  itemId: string,
  formData: FormData,
) {
  const { organizationId } =
    await requireCurrentUser();

  await verifyProject(
    projectId,
    organizationId,
  );

  const existingItem =
    await prisma.project_items.findFirst({
      where: {
        id: itemId,
        project_id: projectId,
      },
      select: {
        id: true,
      },
    });

  if (!existingItem) {
    throw new Error(
      "Không tìm thấy linh kiện.",
    );
  }

  const data = getProjectItemData(formData);

  await prisma.project_items.update({
    where: {
      id: itemId,
    },
    data: {
      product_id: data.productId || null,
      item_name: data.itemName,
      quantity: data.quantity,
      unit_price: data.unitPrice,
      discount: data.discount,
      product_url: data.productUrl || null,
      purchase_status:
        data.purchaseStatus,
      notes: data.notes || null,
      updated_at: new Date(),
    },
  });

  revalidatePath(
    `/projects/${projectId}/items`,
  );
  revalidatePath("/projects");
  revalidatePath("/reports");

  redirect(
    `/projects/${projectId}/items?success=updated`,
  );
}

export async function deleteProjectItem(
  projectId: string,
  itemId: string,
) {
  const { organizationId } =
    await requireCurrentUser();

  await verifyProject(
    projectId,
    organizationId,
  );

  const item =
    await prisma.project_items.findFirst({
      where: {
        id: itemId,
        project_id: projectId,
      },
      select: {
        id: true,
      },
    });

  if (!item) {
    throw new Error(
      "Không tìm thấy linh kiện.",
    );
  }

  await prisma.project_items.delete({
    where: {
      id: itemId,
    },
  });

  revalidatePath(
    `/projects/${projectId}/items`,
  );
  revalidatePath("/projects");
  revalidatePath("/reports");

  redirect(
    `/projects/${projectId}/items?success=deleted`,
  );
}