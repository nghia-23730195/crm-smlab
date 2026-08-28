import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { createCustomer } from "../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const customerTypeOptions = [
  {
    value: "individual",
    label: "Cá nhân",
  },
  {
    value: "school",
    label: "Trường học",
  },
  {
    value: "business",
    label: "Doanh nghiệp",
  },
  {
    value: "dealer",
    label: "Đại lý",
  },
  {
    value: "other",
    label: "Khác",
  },
];

const customerSourceOptions = [
  {
    value: "",
    label: "Chưa xác định",
  },
  {
    value: "Facebook",
    label: "Facebook",
  },
  {
    value: "Website",
    label: "Website",
  },
  {
    value: "Zalo",
    label: "Zalo",
  },
  {
    value: "Giới thiệu",
    label: "Giới thiệu",
  },
  {
    value: "Khách cũ",
    label: "Khách cũ",
  },
  {
    value: "Trực tiếp",
    label: "Trực tiếp",
  },
  {
    value: "Khác",
    label: "Khác",
  },
];

const customerStatusOptions = [
  {
    value: "waiting_quote",
    label: "Đang chờ báo giá",
  },
  {
    value: "waiting_topic",
    label: "Đang chờ đề tài",
  },
  {
    value: "waiting_close",
    label: "Đang chờ chốt",
  },
  {
    value: "in_progress",
    label: "Đang thực hiện",
  },
  {
    value: "done",
    label: "Done",
  },
  {
    value: "cancelled",
    label: "Cancel",
  },
];

export default async function NewCustomerPage() {
  const { organizationId } = await requireCurrentUser();

  const allCustomers = await prisma.customers.findMany({
    where: {
      organization_id: organizationId,
    },
    select: {
      customer_code: true,
    },
  });

  let maxNum = 0;
  for (const c of allCustomers) {
    const match = c.customer_code.match(/(\d+)/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextCustomerCode = `KH-${String(Math.max(maxNum + 1, allCustomers.length + 1)).padStart(3, "0")}`;

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-4xl">
        <form
          action={createCustomer}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs"
        >
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Thông tin khách hàng
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Nhập thông tin để thêm khách hàng mới vào hệ thống.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Mã khách hàng (Tự động đánh mã)"
              name="customer_code"
              defaultValue={nextCustomerCode}
              placeholder="Ví dụ: KH-001"
              required
            />

            <FormField
              label="Họ tên/Người liên hệ"
              name="full_name"
              placeholder="Nhập họ tên"
              required
            />

            <SelectField
              label="Loại khách hàng"
              name="customer_type"
              defaultValue="individual"
              required
              options={customerTypeOptions}
            />

            <FormField
              label="Tên công ty/Đơn vị"
              name="company_name"
              placeholder="Không bắt buộc"
            />

            <FormField
              label="Số điện thoại"
              name="phone"
              type="tel"
              placeholder="Nhập số điện thoại"
            />

            <FormField
              label="Email"
              name="email"
              type="email"
              placeholder="example@email.com"
            />

            <SelectField
              label="Nguồn khách hàng"
              name="source"
              defaultValue=""
              options={customerSourceOptions}
            />

            <SelectField
              label="Trạng thái"
              name="status"
              defaultValue="waiting_quote"
              required
              options={customerStatusOptions}
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="address"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Địa chỉ
            </label>

            <textarea
              id="address"
              name="address"
              rows={2}
              placeholder="Nhập địa chỉ khách hàng"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="notes"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Ghi chú
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Nhập ghi chú về khách hàng"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/customers"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer"
            >
              Hủy
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 px-6 py-2.5 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              + Thêm khách hàng
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
};

function FormField({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required = false,
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