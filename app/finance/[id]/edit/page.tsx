import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

import { updateTransaction } from "../../actions";

export const runtime = "nodejs";

type EditTransactionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateInput(value: Date) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export default async function EditTransactionPage({
  params,
}: EditTransactionPageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const { id } = await params;

  const [transaction, projects, customers] =
    await Promise.all([
      prisma.transactions.findFirst({
        where: {
          id,
          organization_id:
            organizationId,
        },
      }),

      prisma.projects.findMany({
        where: {
          organization_id:
            organizationId,
        },
        select: {
          id: true,
          project_code: true,
          project_name: true,
          status: true,
        },
        orderBy: {
          project_name: "asc",
        },
      }),

      prisma.customers.findMany({
        where: {
          organization_id:
            organizationId,
        },
        select: {
          id: true,
          customer_code: true,
          full_name: true,
          company_name: true,
          status: true,
        },
        orderBy: {
          full_name: "asc",
        },
      }),
    ]);

  if (!transaction) {
    notFound();
  }

  const updateTransactionWithId =
    updateTransaction.bind(null, transaction.id);

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-4xl">
        <form
          action={updateTransactionWithId}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs"
        >
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Cập nhật thông tin giao dịch
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Chỉnh sửa chi tiết phiếu thu / chi trong sổ quỹ tài chính.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Mã giao dịch"
              name="transaction_code"
              defaultValue={transaction.transaction_code}
              required
            />

            <SelectField
              label="Loại giao dịch"
              name="transaction_type"
              defaultValue={transaction.transaction_type}
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
              defaultValue={transaction.category}
              required
            />

            <FormField
              label="Số tiền (VNĐ)"
              name="amount"
              type="number"
              min="1000"
              step="1000"
              defaultValue={transaction.amount.toString()}
              required
            />

            <SelectField
              label="Phương thức thanh toán"
              name="payment_method"
              defaultValue={transaction.payment_method}
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
              defaultValue={formatDateInput(
                transaction.transaction_date,
              )}
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
                defaultValue={transaction.project_id ?? ""}
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
                    {project.status === "cancelled"
                      ? " (Đã hủy)"
                      : ""}
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
                defaultValue={transaction.customer_id ?? ""}
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
                    {customer.status === "inactive"
                      ? " (Ngừng hoạt động)"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <FormField
              label="Đường dẫn chứng từ (Không bắt buộc)"
              name="attachment_url"
              type="url"
              defaultValue={transaction.attachment_url ?? ""}
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
              defaultValue={transaction.description ?? ""}
              placeholder="Nhập nội dung hoặc ghi chú giao dịch..."
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
              💾 Lưu thay đổi
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
  defaultValue: string;
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