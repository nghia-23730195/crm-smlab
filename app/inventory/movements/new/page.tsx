import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/current-user";

import SubmitButton from "@/components/SubmitButton";
import { prisma } from "@/lib/prisma";

import { createInventoryMovement } from "../../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewInventoryMovementPage() {
  const { organizationId } =
    await requireCurrentUser();

  const [products, projects] =
    await Promise.all([
    prisma.products.findMany({
      where: {
        organization_id:
          organizationId,
        is_active: true,
      },
      select: {
        id: true,
        product_code: true,
        name: true,
        unit: true,
        stock_quantity: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.projects.findMany({
      where: {
        organization_id:
          organizationId,
        status: {
          notIn: ["completed", "cancelled"],
        },
      },
      select: {
        id: true,
        project_code: true,
        project_name: true,
      },
      orderBy: {
        project_name: "asc",
      },
    }),
  ]);

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-4xl">
        <form
          action={createInventoryMovement}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="border-b border-slate-200 pb-5">
            <h1 className="text-xl font-bold text-slate-900">
              Tạo phiếu nhập xuất kho
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Phiếu kho sẽ tự động cập nhật số lượng tồn.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <SelectField
              label="Loại giao dịch"
              name="movement_type"
              defaultValue="import"
              required
              options={[
                {
                  value: "import",
                  label: "Nhập kho",
                },
                {
                  value: "project_use",
                  label: "Xuất cho dự án",
                },
                {
                  value: "return",
                  label: "Hoàn kho",
                },
                {
                  value: "adjustment_in",
                  label: "Điều chỉnh tăng",
                },
                {
                  value: "adjustment_out",
                  label: "Điều chỉnh giảm",
                },
              ]}
            />

            <SelectField
              label="Linh kiện"
              name="product_id"
              defaultValue=""
              required
              options={[
                {
                  value: "",
                  label: "Chọn linh kiện",
                },
                ...products.map((product) => ({
                  value: product.id,
                  label:
                    `${product.product_code} - ${product.name} ` +
                    `(Tồn: ${Number(product.stock_quantity)} ${product.unit})`,
                })),
              ]}
            />

            <SelectField
              label="Dự án"
              name="project_id"
              defaultValue=""
              options={[
                {
                  value: "",
                  label: "Không liên kết dự án",
                },
                ...projects.map((project) => ({
                  value: project.id,
                  label:
                    `${project.project_code} - ${project.project_name}`,
                })),
              ]}
            />

            <FormField
              label="Số lượng"
              name="quantity"
              type="number"
              defaultValue="1"
              min="0.01"
              step="0.01"
              required
            />

            <FormField
              label="Đơn giá"
              name="unit_price"
              type="number"
              defaultValue="0"
              min="0"
              step="1"
              required
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Ghi chú
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Nhà cung cấp, lý do điều chỉnh, nội dung xuất kho..."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/inventory/movements"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </Link>

            <SubmitButton
              idleText="Lưu phiếu kho"
              pendingText="Đang lưu..."
            />
          </div>
        </form>
      </div>
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  required?: boolean;
};

function SelectField({
  label,
  name,
  defaultValue,
  options,
  required = false,
}: SelectFieldProps) {
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

      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option
            key={option.value || "empty"}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  min?: string;
  step?: string;
  required?: boolean;
};

function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  min,
  step,
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
        defaultValue={defaultValue}
        min={min}
        step={step}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}