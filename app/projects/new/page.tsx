import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { createProject } from "../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

export default async function NewProjectPage() {
  const customers = await prisma.customers.findMany({
    where: {
      organization_id: ORGANIZATION_ID,
      status: {
        not: "inactive",
      },
    },
    select: {
      id: true,
      customer_code: true,
      full_name: true,
      company_name: true,
    },
    orderBy: {
      full_name: "asc",
    },
  });

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-5xl">
        <form
          action={createProject}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Mã dự án"
              name="project_code"
              placeholder="Ví dụ: DA-001"
              required
            />

            <FormField
              label="Tên dự án"
              name="project_name"
              placeholder="Nhập tên dự án"
              required
            />

            <div>
              <label
                htmlFor="customer_id"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Khách hàng
              </label>

              <select
                id="customer_id"
                name="customer_id"
                defaultValue=""
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Chưa chọn khách hàng</option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.customer_code} -{" "}
                    {customer.company_name ||
                      customer.full_name}
                  </option>
                ))}
              </select>
            </div>

            <FormField
              label="Loại dự án"
              name="project_type"
              placeholder="Ví dụ: Robot, IoT, AI, Website..."
            />

            <SelectField
              label="Trạng thái"
              name="status"
              defaultValue="draft"
              required
              options={[
                {
                  value: "draft",
                  label: "Nháp",
                },
                {
                  value: "planning",
                  label: "Đang chuẩn bị",
                },
                {
                  value: "in_progress",
                  label: "Đang thực hiện",
                },
                {
                  value: "waiting",
                  label: "Chờ khách hàng",
                },
                {
                  value: "completed",
                  label: "Hoàn thành",
                },
                {
                  value: "cancelled",
                  label: "Đã hủy",
                },
              ]}
            />

            <FormField
              label="Ngày bắt đầu"
              name="start_date"
              type="date"
            />

            <FormField
              label="Hạn hoàn thành"
              name="due_date"
              type="date"
            />

            <FormField
              label="Ngày hoàn thành"
              name="completed_date"
              type="date"
            />

            <FormField
              label="Giá trị dự kiến"
              name="estimated_value"
              type="number"
              min="0"
              step="1000"
              defaultValue="0"
            />

            <FormField
              label="Giá trị thực tế"
              name="actual_value"
              type="number"
              min="0"
              step="1000"
              defaultValue="0"
            />

            <FormField
              label="Đã thanh toán"
              name="paid_amount"
              type="number"
              min="0"
              step="1000"
              defaultValue="0"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Mô tả dự án
            </label>

            <textarea
              id="description"
              name="description"
              rows={5}
              placeholder="Nhập mô tả, yêu cầu và phạm vi dự án"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/projects"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Thêm dự án
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
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  min?: string;
  step?: string;
};

function FormField({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required = false,
  min,
  step,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        min={min}
        step={step}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  label: string;
  name: string;
  defaultValue: string;
  options: SelectOption[];
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
          <span className="ml-1 text-red-500">*</span>
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
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}