import Link from "next/link";

import SubmitButton from "@/components/SubmitButton";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

import { createTransaction } from "../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTodayInputValue() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export default async function NewTransactionPage() {
  const { organizationId } =
    await requireCurrentUser();

  const [projects, customers] =
    await Promise.all([
      prisma.projects.findMany({
        where: {
          organization_id:
            organizationId,

          status: {
            not: "cancelled",
          },
        },

        // Giữ nguyên orderBy, select và các phần khác.
      }),

      prisma.customers.findMany({
        where: {
          organization_id:
            organizationId,

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
    }),
  ]);

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-5xl">
        <form
          action={createTransaction}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Mã giao dịch"
              name="transaction_code"
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
                  label: "Khoản thu",
                },
                {
                  value: "expense",
                  label: "Khoản chi",
                },
              ]}
            />

            <FormField
              label="Danh mục"
              name="category"
              placeholder="Ví dụ: Thanh toán dự án"
              required
            />

            <FormField
              label="Số tiền"
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
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Dự án
              </label>

              <select
                id="project_id"
                name="project_id"
                defaultValue=""
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Không gắn với dự án
                </option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.project_code} -{" "}
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>

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
                <option value="">
                  Không gắn với khách hàng
                </option>

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
              label="Đường dẫn chứng từ"
              name="attachment_url"
              type="url"
              placeholder="https://..."
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Nội dung giao dịch
            </label>

            <textarea
              id="description"
              name="description"
              rows={5}
              placeholder="Nhập nội dung hoặc ghi chú giao dịch"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/finance"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Thêm giao dịch
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