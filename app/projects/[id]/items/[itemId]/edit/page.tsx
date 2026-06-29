import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import SubmitButton from "@/components/SubmitButton";
import { prisma } from "@/lib/prisma";

import { updateProjectItem } from "../../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EditProjectItemPageProps = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

export default async function EditProjectItemPage({
  params,
}: EditProjectItemPageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const { id, itemId } = await params;

  const [project, item, products] =
    await Promise.all([
      prisma.projects.findFirst({
        where: {
          id,
          organization_id: organizationId,
        },
        select: {
          id: true,
          project_code: true,
          project_name: true,
        },
      }),

      prisma.project_items.findFirst({
        where: {
          id: itemId,
          project_id: id,
        },
      }),

      prisma.products.findMany({
        where: {
          organization_id: organizationId,
          is_active: true,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          product_code: true,
          name: true,
        },
      }),
    ]);

  if (!project || !item) {
    notFound();
  }

  const updateWithIds = updateProjectItem.bind(
    null,
    project.id,
    item.id,
  );

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-5xl">
        <form
          action={updateWithIds}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="border-b border-slate-200 pb-5">
            <h1 className="text-xl font-bold text-slate-900">
              Sửa linh kiện dự án
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {project.project_code} —{" "}
              {project.project_name}
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <FormField
              label="Tên linh kiện"
              name="item_name"
              defaultValue={item.item_name}
              required
            />

            <SelectField
              label="Sản phẩm trong kho"
              name="product_id"
              defaultValue={item.product_id ?? ""}
              options={[
                {
                  value: "",
                  label: "Không liên kết sản phẩm",
                },
                ...products.map((product) => ({
                  value: product.id,
                  label: `${product.product_code} - ${product.name}`,
                })),
              ]}
            />

            <FormField
              label="Số lượng"
              name="quantity"
              type="number"
              defaultValue={String(item.quantity)}
              min="0.01"
              step="0.01"
              required
            />

            <FormField
              label="Đơn giá"
              name="unit_price"
              type="number"
              defaultValue={String(item.unit_price)}
              min="0"
              step="1"
              required
            />

            <FormField
              label="Giảm giá"
              name="discount"
              type="number"
              defaultValue={String(item.discount)}
              min="0"
              step="1"
              required
            />

            <SelectField
              label="Trạng thái mua"
              name="purchase_status"
              defaultValue={item.purchase_status}
              options={[
                {
                  value: "not_purchased",
                  label: "Chưa mua",
                },
                {
                  value: "purchased",
                  label: "Đã mua",
                },
                {
                  value: "cancelled",
                  label: "Đã hủy",
                },
              ]}
              required
            />

            <div className="md:col-span-2">
              <FormField
                label="Link sản phẩm"
                name="product_url"
                type="url"
                defaultValue={item.product_url ?? ""}
                placeholder="https://..."
              />
            </div>
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
              defaultValue={item.notes ?? ""}
              placeholder="Nhập ghi chú về linh kiện"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/projects/${project.id}/items`}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </Link>

            <SubmitButton
              idleText="Lưu thay đổi"
              pendingText="Đang lưu..."
            />
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
  placeholder?: string;
  defaultValue: string;
  min?: string;
  step?: string;
  required?: boolean;
};

function FormField({
  label,
  name,
  type = "text",
  placeholder,
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
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={min}
        step={step}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
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