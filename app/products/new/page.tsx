import Link from "next/link";

import { createProduct } from "../actions";

export default function NewProductPage() {
  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Thêm sản phẩm
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Nhập thông tin sản phẩm mới cho SM-LAB.
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
          action={createProduct}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Mã sản phẩm"
              name="product_code"
              placeholder="Ví dụ: SP-002"
              required
            />

            <FormField
              label="Tên sản phẩm"
              name="name"
              placeholder="Ví dụ: ESP32 DevKit V1"
              required
            />

            <FormField
              label="Danh mục"
              name="category"
              placeholder="Ví dụ: Vi điều khiển"
            />

            <FormField
              label="Đơn vị"
              name="unit"
              placeholder="Ví dụ: Cái"
              required
            />

            <FormField
              label="Giá nhập"
              name="cost_price"
              type="number"
              placeholder="0"
              min="0"
              required
            />

            <FormField
              label="Giá bán"
              name="sale_price"
              type="number"
              placeholder="0"
              min="0"
              required
            />

            <FormField
              label="Số lượng tồn"
              name="stock_quantity"
              type="number"
              placeholder="0"
              min="0"
              required
            />

            <FormField
              label="Tồn kho tối thiểu"
              name="minimum_stock"
              type="number"
              placeholder="5"
              min="0"
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
              placeholder="Nhập mô tả sản phẩm..."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              defaultChecked
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
              Lưu sản phẩm
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
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
};

function FormField({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  min,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        min={min}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}