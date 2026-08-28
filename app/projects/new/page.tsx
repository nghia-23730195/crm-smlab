import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { createProject } from "../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const { organizationId } =
    await requireCurrentUser();

  const [customers, allProjects] = await Promise.all([
    prisma.customers.findMany({
      where: {
        organization_id: organizationId,
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
        customer_code: "asc",
      },
    }),
    prisma.projects.findMany({
      where: {
        organization_id: organizationId,
      },
      select: {
        project_code: true,
      },
    }),
  ]);

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
  const nextCode = `DA-${String(Math.max(maxNum + 1, allProjects.length + 1)).padStart(3, "0")}`;

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-4xl">
        <form
          action={createProject}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs"
        >
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Thêm dự án mới
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Nhập thông tin hợp đồng, tiến độ và tài chính để khởi tạo dự án trong hệ thống.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Mã dự án (Tự động đánh mã)"
              name="project_code"
              defaultValue={nextCode}
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
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Khách hàng
              </label>

              <select
                id="customer_id"
                name="customer_id"
                defaultValue=""
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="">Chưa chọn khách hàng</option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.customer_code} - {customer.full_name}
                  </option>
                ))}
              </select>
            </div>

            <FormField
              label="Loại dự án"
              name="project_type"
              placeholder="Ví dụ: KHKT, STEM, Robot, IoT, AI..."
            />

            <FormField
              label="Tổng giá trị hợp đồng (VNĐ)"
              name="actual_value"
              type="number"
              min="0"
              step="1000"
              defaultValue="0"
              placeholder="0"
            />

            <FormField
              label="Số tiền đã thanh toán (VNĐ)"
              name="paid_amount"
              type="number"
              min="0"
              step="1000"
              defaultValue="0"
              placeholder="0"
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
              label="Hạn hoàn thành (Deadline)"
              name="due_date"
              type="date"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="description"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Mô tả dự án
            </label>

            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Nhập mô tả, yêu cầu và phạm vi dự án"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer"
            >
              Hủy
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 px-6 py-2.5 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              + Thêm dự án
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
        className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
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
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
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
        className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
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
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
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