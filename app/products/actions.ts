"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

function readProductForm(formData: FormData) {
  const productCode = String(
    formData.get("product_code") ?? "",
  ).trim();

  const name = String(
    formData.get("name") ?? "",
  ).trim();

  const category = String(
    formData.get("category") ?? "",
  ).trim();

  const description = String(
    formData.get("description") ?? "",
  ).trim();

  const unit = String(
    formData.get("unit") ?? "",
  ).trim();

  const costPrice = Number(
    formData.get("cost_price") ?? 0,
  );

  const salePrice = Number(
    formData.get("sale_price") ?? 0,
  );

  const stockQuantity = Number(
    formData.get("stock_quantity") ?? 0,
  );

  const minimumStock = Number(
    formData.get("minimum_stock") ?? 0,
  );

  const isActive =
    formData.get("is_active") === "on";

  if (!productCode || !name || !unit) {
    throw new Error(
      "Vui lòng nhập mã sản phẩm, tên sản phẩm và đơn vị.",
    );
  }

  const numericValues = [
    costPrice,
    salePrice,
    stockQuantity,
    minimumStock,
  ];

  if (
    numericValues.some(
      (value) =>
        !Number.isFinite(value) || value < 0,
    )
  ) {
    throw new Error(
      "Giá và số lượng phải là số lớn hơn hoặc bằng 0.",
    );
  }

  return {
    productCode,
    name,
    category,
    description,
    unit,
    costPrice,
    salePrice,
    stockQuantity,
    minimumStock,
    isActive,
  };
}

export async function createProduct(
  formData: FormData,
) {
  const values = readProductForm(formData);

  const existingProduct =
    await prisma.products.findFirst({
      where: {
        organization_id: ORGANIZATION_ID,
        product_code: values.productCode,
      },
    });

  if (existingProduct) {
    throw new Error(
      `Mã sản phẩm ${values.productCode} đã tồn tại.`,
    );
  }

  await prisma.products.create({
    data: {
      organization_id: ORGANIZATION_ID,
      product_code: values.productCode,
      name: values.name,
      category: values.category || null,
      description: values.description || null,
      unit: values.unit,
      cost_price: values.costPrice,
      sale_price: values.salePrice,
      stock_quantity: values.stockQuantity,
      minimum_stock: values.minimumStock,
      image_url: null,
      is_active: values.isActive,
    },
  });

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(
  productId: string,
  formData: FormData,
) {
  const values = readProductForm(formData);

  const currentProduct =
    await prisma.products.findFirst({
      where: {
        id: productId,
        organization_id: ORGANIZATION_ID,
      },
    });

  if (!currentProduct) {
    throw new Error(
      "Không tìm thấy sản phẩm cần cập nhật.",
    );
  }

  const duplicatedProduct =
    await prisma.products.findFirst({
      where: {
        organization_id: ORGANIZATION_ID,
        product_code: values.productCode,
        NOT: {
          id: productId,
        },
      },
    });

  if (duplicatedProduct) {
    throw new Error(
      `Mã sản phẩm ${values.productCode} đã được sử dụng.`,
    );
  }

  await prisma.products.update({
    where: {
      id: productId,
    },
    data: {
      product_code: values.productCode,
      name: values.name,
      category: values.category || null,
      description: values.description || null,
      unit: values.unit,
      cost_price: values.costPrice,
      sale_price: values.salePrice,
      stock_quantity: values.stockQuantity,
      minimum_stock: values.minimumStock,
      is_active: values.isActive,
      updated_at: new Date(),
    },
  });

  revalidatePath("/products");
  revalidatePath(
    `/products/${productId}/edit`,
  );

  redirect("/products");
}

export async function toggleProductActive(
  productId: string,
) {
  const product =
    await prisma.products.findFirst({
      where: {
        id: productId,
        organization_id: ORGANIZATION_ID,
      },
    });

  if (!product) {
    throw new Error(
      "Không tìm thấy sản phẩm.",
    );
  }

  await prisma.products.update({
    where: {
      id: productId,
    },
    data: {
      is_active: !product.is_active,
      updated_at: new Date(),
    },
  });

  revalidatePath("/products");
}