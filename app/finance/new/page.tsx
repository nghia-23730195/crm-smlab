import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getNextTransactionCode } from "@/lib/finance";

import { createTransaction } from "../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewTransactionPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getTodayInputValue() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export default async function NewTransactionPage({
  searchParams,
}: NewTransactionPageProps) {
  const { organizationId } = await requireCurrentUser();
  const params = await searchParams;

  let projects: { id: string; project_code: string; project_name: string }[] = [];
  let customers: { id: string; customer_code: string; full_name: string; company_name: string | null }[] = [];
  let nextTransactionCode = "GD-001";

  try {
    const [pList, cList, code] = await Promise.all([
      prisma.projects.findMany({
        where: {
          organization_id: organizationId,
        },
        select: {
          id: true,
          project_code: true,
          project_name: true,
        },
        orderBy: {
          project_code: "asc",
        },
      }),

      prisma.customers.findMany({
        where: {
          organization_id: organizationId,
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

      getNextTransactionCode(organizationId),
    ]);

    projects = pList;
    customers = cList;
    nextTransactionCode = code;
  } catch (err) {
    console.error("Error loading data for NewTransactionPage:", err);
  }

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/finance" className="hover:text-blue-600 transition">
                Quản lý tài chính
              </Link>
              <span>/</span>
              <span className="text-slate-900">Thêm giao dịch</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Thêm giao dịch thu / chi mới
            </h1>
          </div>

          <Link
            href="/finance"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs"
          >
            Quay lại sổ quỹ
          </Link>
        </div>

        {params.error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 animate-in fade-in">
            {params.error}
          </div>
        )}

        <form
          action={createTransaction}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs"
        >
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Ghi nhận phiếu thu / chi vào sổ quỹ
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Hệ thống sẽ tự động cập nhật số dư quỹ, dòng tiền và doanh thu tương ứng.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Mã giao dịch (Tự động đánh mã)"
              name="transaction_code"
              defaultValue={nextTransactionCode}
              placeholder="Ví dụ: GD-001"
              required
            />

            <SelectField
              label="Loại giao dịch"
              name="transaction_type"
              defaultValue="income"
              required
              options={[
                {
                  value: "income",
                  label: "🟢 Khoản thu",
                },
                {
                  value: "expense",
                  label: "🔴 Khoản chi",
                },
              ]}
            />

            <FormField
              label="Danh mục"
              name="category"
              placeholder="Ví dụ: Cọc dự án, Mua linh kiện..."
              required
            />

            <FormField
              label="Số tiền (VNĐ)"
              name="amount"
              type="number"
              min="1000"
              step="1000"
              placeholder="Ví dụ: 5000000"
              required
            />

            <SelectField
              label="Phương thức thanh toán"
              name="payment_method"
              defaultValue="cash"
              required
              options={[
                {
                  value: "cash",
                  label: "Tiền mặt",
                },
                {
                  value: "bank_transfer",
                  label: "Chuyển khoản",
                },
                {
                  value: "card",
                  label: "Thẻ",
                },
                {
                  value: "e_wallet",
                  label: "Ví điện tử",
                },
                {
                  value: "other",
                  label: "Khác",
                },
              ]}
            />

            <FormField
              label="Ngày giao dịch"
              name="transaction_date"
              type="date"
              defaultValue={getTodayInputValue()}
              required
            />

            <div>
              <label
                htmlFor="project_id"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Dự án liên kết
              </label>

              <select
                id="project_id"
                name="project_id"
                defaultValue=""
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="">
                  -- Không gắn với dự án --
                </option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.project_code} - {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="customer_id"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Khách hàng liên kết
              </label>

              <select
                id="customer_id"
                name="customer_id"
                defaultValue=""
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="">
                  -- Không gắn với khách hàng --
                </option>

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
              label="Đường dẫn chứng từ (Không bắt buộc)"
              name="attachment_url"
              type="url"
              placeholder="https://..."
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="description"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Nội dung & Diễn giải giao dịch
            </label>

            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Nhập nội dung hoặc diễn giải chi tiết cho giao dịch..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/finance"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer"
            >
              Hủy
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 px-6 py-2.5 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              + Thêm giao dịch
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