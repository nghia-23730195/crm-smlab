import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TransactionType = "income" | "expense";

type FinancePageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    project?: string;
    date_from?: string;
    date_to?: string;
  }>;
};

const transactionTypeLabels: Record<TransactionType, string> = {
  income: "Khoản thu",
  expense: "Khoản chi",
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Tiền mặt",
  bank_transfer: "Chuyển khoản",
  card: "Thẻ",
  e_wallet: "Ví điện tử",
  other: "Khác",
};

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
  }).format(value);
}

function parseDateFilter(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

export default async function FinancePage({
  searchParams,
}: FinancePageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const params = await searchParams;

  const keyword = String(params.q ?? "").trim();
  const selectedType = String(params.type ?? "all").trim();
  const selectedProject = String(
    params.project ?? "all",
  ).trim();

  const dateFromText = String(params.date_from ?? "").trim();
  const dateToText = String(params.date_to ?? "").trim();

  const dateFrom = parseDateFilter(dateFromText);
  const dateTo = parseDateFilter(dateToText);

  if (dateTo) {
    dateTo.setUTCDate(dateTo.getUTCDate() + 1);
  }

  const transactionType =
    selectedType === "income" ||
    selectedType === "expense"
      ? selectedType
      : null;

  const [transactions, projects] = await Promise.all([
    prisma.transactions.findMany({
      where: {
        organization_id:
          organizationId,

        ...(keyword
          ? {
              OR: [
                {
                  transaction_code: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
                {
                  category: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
                {
                  description: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
                {
                  projects: {
                    is: {
                      OR: [
                        {
                          project_code: {
                            contains: keyword,
                            mode: "insensitive",
                          },
                        },
                        {
                          project_name: {
                            contains: keyword,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  customers: {
                    is: {
                      OR: [
                        {
                          customer_code: {
                            contains: keyword,
                            mode: "insensitive",
                          },
                        },
                        {
                          full_name: {
                            contains: keyword,
                            mode: "insensitive",
                          },
                        },
                        {
                          company_name: {
                            contains: keyword,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),

        ...(transactionType
          ? {
              transaction_type: transactionType,
            }
          : {}),

        ...(selectedProject !== "all"
          ? {
              project_id: selectedProject,
            }
          : {}),

        ...(dateFrom || dateTo
          ? {
              transaction_date: {
                ...(dateFrom
                  ? {
                      gte: dateFrom,
                    }
                  : {}),
                ...(dateTo
                  ? {
                      lt: dateTo,
                    }
                  : {}),
              },
            }
          : {}),
      },

      include: {
        projects: {
          select: {
            id: true,
            project_code: true,
            project_name: true,
          },
        },

        customers: {
          select: {
            id: true,
            customer_code: true,
            full_name: true,
            company_name: true,
          },
        },
      },

      orderBy: [
        {
          transaction_date: "desc",
        },
        {
          created_at: "desc",
        },
      ],
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
      },
      orderBy: {
        project_name: "asc",
      },
    }),
  ]);

  const totalIncome = transactions
    .filter(
      (transaction) =>
        transaction.transaction_type === "income",
    )
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0,
    );

  const totalExpense = transactions
    .filter(
      (transaction) =>
        transaction.transaction_type === "expense",
    )
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0,
    );

  const profit = totalIncome - totalExpense;

  const hasFilters =
    keyword.length > 0 ||
    selectedType !== "all" ||
    selectedProject !== "all" ||
    dateFromText.length > 0 ||
    dateToText.length > 0;

  return (
    <div className="p-5 md:p-8">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Tổng thu"
          value={formatCurrency(totalIncome)}
          className="text-emerald-700"
        />

        <SummaryCard
          label="Tổng chi"
          value={formatCurrency(totalExpense)}
          className="text-red-700"
        />

        <SummaryCard
          label="Lợi nhuận"
          value={formatCurrency(profit)}
          className={
            profit >= 0
              ? "text-blue-700"
              : "text-red-700"
          }
        />
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Danh sách giao dịch
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Hiển thị {transactions.length} giao dịch
            </p>
          </div>

          <form
            action="/finance"
            method="GET"
            className="mt-5 grid gap-3 xl:grid-cols-[minmax(240px,1fr)_160px_210px_150px_150px_auto_auto]"
          >
            <input
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="Tìm mã, danh mục, dự án..."
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              name="type"
              defaultValue={selectedType}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                Tất cả loại
              </option>
              <option value="income">
                Khoản thu
              </option>
              <option value="expense">
                Khoản chi
              </option>
            </select>

            <select
              name="project"
              defaultValue={selectedProject}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                Tất cả dự án
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

            <input
              type="date"
              name="date_from"
              defaultValue={dateFromText}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <input
              type="date"
              name="date_to"
              defaultValue={dateToText}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Tìm
            </button>

            {hasFilters && (
              <Link
                href="/finance"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              Không tìm thấy giao dịch
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Hãy thử bộ lọc khác hoặc tạo giao dịch mới.
            </p>

            <Link
              href="/finance/new"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Tạo giao dịch
            </Link>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-4">Mã</th>
                  <th className="px-4 py-4">Ngày</th>
                  <th className="px-4 py-4">Loại</th>
                  <th className="px-4 py-4">
                    Danh mục
                  </th>
                  <th className="px-4 py-4">
                    Dự án
                  </th>
                  <th className="px-4 py-4">
                    Khách hàng
                  </th>
                  <th className="px-4 py-4">
                    Thanh toán
                  </th>
                  <th className="px-4 py-4">
                    Số tiền
                  </th>
                  <th className="px-4 py-4">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {transactions.map((transaction) => {
                  const type =
                    transaction.transaction_type as TransactionType;

                  const customerName =
                    transaction.customers?.company_name ||
                    transaction.customers?.full_name ||
                    "Không gắn khách hàng";

                  return (
                    <tr
                      key={transaction.id}
                      className="bg-white transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-sm font-semibold text-blue-600">
                        {transaction.transaction_code}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {formatDate(
                          transaction.transaction_date,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                            type === "income"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {transactionTypeLabels[type]}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900">
                          {transaction.category}
                        </p>

                        {transaction.description && (
                          <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                            {transaction.description}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {transaction.projects ? (
                          <>
                            <p className="font-medium">
                              {
                                transaction.projects
                                  .project_name
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                transaction.projects
                                  .project_code
                              }
                            </p>
                          </>
                        ) : (
                          "Không gắn dự án"
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        <p>{customerName}</p>

                        {transaction.customers && (
                          <p className="mt-1 text-xs text-slate-500">
                            {
                              transaction.customers
                                .customer_code
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {paymentMethodLabels[
                          transaction.payment_method
                        ] ?? transaction.payment_method}
                      </td>

                      <td
                        className={`px-4 py-4 text-sm font-bold ${
                          type === "income"
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {type === "income" ? "+" : "-"}
                        {formatCurrency(
                          transaction.amount,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/finance/${transaction.id}/edit`}
                          className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          Sửa
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  className: string;
};

function SummaryCard({
  label,
  value,
  className,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 text-2xl font-bold ${className}`}
      >
        {value}
      </p>
    </div>
  );
}