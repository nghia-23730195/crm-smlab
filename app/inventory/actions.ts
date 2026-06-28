"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

type MovementType =
  | "import"
  | "project_use"
  | "return"
  | "adjustment_in"
  | "adjustment_out";

const VALID_MOVEMENT_TYPES: MovementType[] = [
  "import",
  "project_use",
  "return",
  "adjustment_in",
  "adjustment_out",
];

function getText(
  formData: FormData,
  fieldName: string,
) {
  return String(
    formData.get(fieldName) ?? "",
  ).trim();
}

function getPositiveNumber(
  formData: FormData,
  fieldName: string,
  label: string,
) {
  const rawValue = getText(
    formData,
    fieldName,
  );

  const value = Number(rawValue);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      `${label} phải là số lớn hơn 0.`,
    );
  }

  return value;
}

function getNonNegativeNumber(
  formData: FormData,
  fieldName: string,
  label: string,
) {
  const rawValue = getText(
    formData,
    fieldName,
  );

  const value = Number(rawValue);

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${label} phải lớn hơn hoặc bằng 0.`,
    );
  }

  return value;
}

function isIncreaseMovement(
  movementType: MovementType,
) {
  return [
    "import",
    "return",
    "adjustment_in",
  ].includes(movementType);
}

function isDecreaseMovement(
  movementType: MovementType,
) {
  return [
    "project_use",
    "adjustment_out",
  ].includes(movementType);
}

export async function createInventoryMovement(
  formData: FormData,
) {
  const productId = getText(
    formData,
    "product_id",
  );

  const projectId = getText(
    formData,
    "project_id",
  );

  const movementType = getText(
    formData,
    "movement_type",
  ) as MovementType;

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

  const notes = getText(
    formData,
    "notes",
  );

  if (!productId) {
    throw new Error(
      "Vui lòng chọn linh kiện.",
    );
  }

  if (
    !VALID_MOVEMENT_TYPES.includes(
      movementType,
    )
  ) {
    throw new Error(
      "Loại giao dịch kho không hợp lệ.",
    );
  }

  if (
    movementType === "project_use" &&
    !projectId
  ) {
    throw new Error(
      "Vui lòng chọn dự án khi xuất kho.",
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      const product =
        await transaction.products.findFirst({
          where: {
            id: productId,
            organization_id:
              ORGANIZATION_ID,
            is_active: true,
          },

          select: {
            id: true,
            name: true,
            stock_quantity: true,
            cost_price: true,
          },
        });

      if (!product) {
        throw new Error(
          "Không tìm thấy linh kiện trong kho.",
        );
      }

      if (projectId) {
        const project =
          await transaction.projects.findFirst({
            where: {
              id: projectId,
              organization_id:
                ORGANIZATION_ID,
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
      }

      const stockBefore = Number(
        product.stock_quantity,
      );

      let stockAfter = stockBefore;

      if (
        isIncreaseMovement(movementType)
      ) {
        stockAfter =
          stockBefore + quantity;
      }

      if (
        isDecreaseMovement(movementType)
      ) {
        if (stockBefore < quantity) {
          throw new Error(
            `Kho chỉ còn ${stockBefore}, không đủ để xuất ${quantity}.`,
          );
        }

        stockAfter =
          stockBefore - quantity;
      }

      await transaction.products.update({
        where: {
          id: product.id,
        },

        data: {
          stock_quantity: stockAfter,

          ...(movementType === "import" &&
          unitPrice > 0
            ? {
                cost_price: unitPrice,
              }
            : {}),

          updated_at: new Date(),
        },
      });

      await transaction.inventory_movements.create({
        data: {
          organization_id:
            ORGANIZATION_ID,

          product_id: product.id,

          project_id:
            projectId || null,

          movement_type:
            movementType,

          quantity,

          unit_price:
            unitPrice > 0
              ? unitPrice
              : Number(
                  product.cost_price,
                ),

          stock_before:
            stockBefore,

          stock_after:
            stockAfter,

          notes:
            notes || null,
        },
      });

      if (
        movementType === "project_use" &&
        projectId
      ) {
        await transaction.project_items.create({
          data: {
            project_id: projectId,
            product_id: product.id,
            item_name: product.name,
            quantity,
            unit_price:
              unitPrice > 0
                ? unitPrice
                : Number(
                    product.cost_price,
                  ),
            discount: 0,
            purchase_status:
              "purchased",
            notes: notes
              ? `Xuất từ kho: ${notes}`
              : "Xuất từ kho",
          },
        });
      }
    },
  );

  revalidatePath("/inventory");
  revalidatePath(
    "/inventory/movements",
  );
  revalidatePath("/products");
  revalidatePath("/projects");
  revalidatePath("/reports");
  revalidatePath("/");

  if (projectId) {
    revalidatePath(
      `/projects/${projectId}/items`,
    );
  }

  redirect(
    "/inventory/movements?success=created",
  );
}