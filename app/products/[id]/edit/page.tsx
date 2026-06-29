import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";

import { prisma } from "@/lib/prisma";
import { updateProduct } from "../../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const { id } = await params;

  const product = await prisma.products.findFirst({
    where: {
      id,
      organization_id: organizationId,
    },
  });

  if (!product) {
    notFound();
  }

  const updateProductWithId = updateProduct.bind(
    null,
    product.id,
  );

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Sửa sản phẩm
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Cập nhật thông tin sản phẩm {product.name}.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Quay lại
          </Link>
        </div>

        <form
          action={updateProductWithId}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Mã sản phẩm"
              name="product_code"
              defaultValue={product.product_code}
              required
            />

            <FormField
              label="Tên sản phẩm"
              name="name"
              defaultValue={product.name}
              required
            />

            <FormField
              label="Danh mục"
              name="category"
              defaultValue={product.category ?? ""}
            />

            <FormField
              label="Đơn vị"
              name="unit"
              defaultValue={product.unit}
              required
            />

            <FormField
              label="Giá nhập"
              name="cost_price"
              type="number"
              min="0"
              defaultValue={product.cost_price.toString()}
              required
            />

            <FormField
              label="Giá bán"
              name="sale_price"
              type="number"
              min="0"
              defaultValue={product.sale_price.toString()}
              required
            />

            <FormField
              label="Số lượng tồn"
              name="stock_quantity"
              type="number"
              min="0"
              defaultValue={product.stock_quantity.toString()}
              required
            />

            <FormField
              label="Tồn kho tối thiểu"
              name="minimum_stock"
              type="number"
              min="0"
              defaultValue={product.minimum_stock.toString()}
              required
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Mô tả
            </label>

            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={product.description ?? ""}
              placeholder="Nhập mô tả sản phẩm..."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              defaultChecked={product.is_active}
              className="h-4 w-4 rounded border-slate-300"
            />

            <label
              htmlFor="is_active"
              className="text-sm font-medium text-slate-700"
            >
              Đang kinh doanh
            </label>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/products"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  min?: string;
  defaultValue: string;
  required?: boolean;
};

function FormField({
  label,
  name,
  type = "text",
  min,
  defaultValue,
  required = false,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        min={min}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}