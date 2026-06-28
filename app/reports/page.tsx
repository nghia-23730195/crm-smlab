import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

type ProjectStatus =
  | "draft"
  | "planning"
  | "in_progress"
  | "waiting"
  | "completed"
  | "cancelled";

type ReportsPageProps = {
  searchParams: Promise<{
    date_from?: string;
    date_to?: string;
  }>;
};

type MonthlyFinance = {
  key: string;
  label: string;
  income: number;
  expense: number;
  profit: number;
};

const projectStatusLabels: Record<ProjectStatus, string> = {
  draft: "Nháp",
  planning: "Đang chuẩn bị",
  in_progress: "Đang thực hiện",
  waiting: "Chờ khách hàng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const projectStatusClasses: Record<ProjectStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  planning: "bg-violet-100 text-violet-700",
  in_progress: "bg-blue-100 text-blue-700",
  waiting: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Chưa thiết lập";
  }

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

function getMonthKey(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getMonthLabel(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  const params = await searchParams;

  const dateFromText = String(params.date_from ?? "").trim();
  const dateToText = String(params.date_to ?? "").trim();

  const dateFrom = parseDateFilter(dateFromText);
  const dateTo = parseDateFilter(dateToText);

  const exclusiveDateTo = dateTo
    ? new Date(
        Date.UTC(
          dateTo.getUTCFullYear(),
          dateTo.getUTCMonth(),
          dateTo.getUTCDate() + 1,
        ),
      )
    : null;

  const transactionDateFilter =
    dateFrom || exclusiveDateTo
      ? {
          transaction_date: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(exclusiveDateTo
              ? { lt: exclusiveDateTo }
              : {}),
          },
        }
      : {};

  const [transactions, projects, customers] = await Promise.all([
    prisma.transactions.findMany({
      where: {
        organization_id: ORGANIZATION_ID,
        ...transactionDateFilter,
      },
      include: {
        customers: {
          select: {
            id: true,
            customer_code: true,
            full_name: true,
            company_name: true,
          },
        },
        projects: {
          select: {
            id: true,
            project_code: true,
            project_name: true,
          },
        },
      },
      orderBy: {
        transaction_date: "asc",
      },
    }),

    prisma.projects.findMany({
      where: {
        organization_id: ORGANIZATION_ID,
      },
      include: {
        customers: {
          select: {
            customer_code: true,
            full_name: true,
            company_name: true,
          },
        },
      },
      orderBy: {
        actual_value: "desc",
      },
    }),

    prisma.customers.findMany({
      where: {
        organization_id: ORGANIZATION_ID,
      },
      select: {
        id: true,
        customer_code: true,
        full_name: true,
        company_name: true,
        status: true,
      },
    }),
  ]);

  const totalIncome = transactions
    .filter(
      (transaction) =>
        transaction.transaction_type === "income",
    )
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0,
    );

  const totalExpense = transactions
    .filter(
      (transaction) =>
        transaction.transaction_type === "expense",
    )
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0,
    );

  const profit = totalIncome - totalExpense;

  const totalDebt = projects.reduce((total, project) => {
    const actualValue = Number(project.actual_value);
    const paidAmount = Number(project.paid_amount);

    return total + Math.max(0, actualValue - paidAmount);
  }, 0);

  const monthlyMap = new Map<string, MonthlyFinance>();

  for (const transaction of transactions) {
    const key = getMonthKey(transaction.transaction_date);

    const current = monthlyMap.get(key) ?? {
      key,
      label: getMonthLabel(transaction.transaction_date),
      income: 0,
      expense: 0,
      profit: 0,
    };

    if (transaction.transaction_type === "income") {
      current.income += Number(transaction.amount);
    } else {
      current.expense += Number(transaction.amount);
    }

    current.profit = current.income - current.expense;

    monthlyMap.set(key, current);
  }

  const monthlyFinance = Array.from(monthlyMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12);

  const maximumMonthlyValue = Math.max(
    1,
    ...monthlyFinance.flatMap((month) => [
      month.income,
      month.expense,
    ]),
  );

  const projectStatusCount: Record<ProjectStatus, number> = {
    draft: 0,
    planning: 0,
    in_progress: 0,
    waiting: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const project of projects) {
    projectStatusCount[project.status as ProjectStatus] += 1;
  }

  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    ),
  );

  const overdueProjects = projects.filter((project) => {
    if (!project.due_date) {
      return false;
    }

    if (
      project.status === "completed" ||
      project.status === "cancelled"
    ) {
      return false;
    }

    return project.due_date < todayUTC;
  });

  const topProjects = projects.slice(0, 5);

  const customerRevenueMap = new Map<string, number>();

  for (const transaction of transactions) {
    if (
      transaction.transaction_type !== "income" ||
      !transaction.customer_id
    ) {
      continue;
    }

    const previous =
      customerRevenueMap.get(transaction.customer_id) ?? 0;

    customerRevenueMap.set(
      transaction.customer_id,
      previous + Number(transaction.amount),
    );
  }

  const topCustomers = customers
    .map((customer) => ({
      ...customer,
      revenue: customerRevenueMap.get(customer.id) ?? 0,
    }))
    .filter((customer) => customer.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const hasDateFilter =
    dateFromText.length > 0 || dateToText.length > 0;

  return (
    <div className="p-5 md:p-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Bộ lọc báo cáo
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Bộ lọc thời gian áp dụng cho thu, chi, lợi nhuận và
              doanh thu khách hàng.
            </p>
          </div>

          <form
            action="/reports"
            method="GET"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[170px_170px_auto_auto]"
          >
            <div>
              <label
                htmlFor="date_from"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Từ ngày
              </label>

              <input
                id="date_from"
                name="date_from"
                type="date"
                defaultValue={dateFromText}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="date_to"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Đến ngày
              </label>

              <input
                id="date_to"
                name="date_to"
                type="date"
                defaultValue={dateToText}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              className="self-end rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Xem báo cáo
            </button>

            {hasDateFilter && (
              <Link
                href="/reports"
                className="self-end rounded-xl border border-slate-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Tổng thu"
          value={formatCurrency(totalIncome)}
          description={`${transactions.filter((item) => item.transaction_type === "income").length} khoản thu`}
          valueClassName="text-emerald-700"
        />

        <SummaryCard
          label="Tổng chi"
          value={formatCurrency(totalExpense)}
          description={`${transactions.filter((item) => item.transaction_type === "expense").length} khoản chi`}
          valueClassName="text-red-700"
        />

        <SummaryCard
          label="Lợi nhuận"
          value={formatCurrency(profit)}
          description="Tổng thu trừ tổng chi"
          valueClassName={
            profit >= 0 ? "text-blue-700" : "text-red-700"
          }
        />

        <SummaryCard
          label="Công nợ dự án"
          value={formatCurrency(totalDebt)}
          description="Giá trị thực tế chưa thanh toán"
          valueClassName="text-amber-700"
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Thu và chi theo tháng
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tối đa 12 tháng gần nhất trong phạm vi báo cáo.
            </p>
          </div>

          {monthlyFinance.length === 0 ? (
            <EmptyState message="Chưa có dữ liệu tài chính trong khoảng thời gian này." />
          ) : (
            <>
              <div className="mt-8 flex h-72 items-end gap-4 overflow-x-auto border-b border-slate-200 px-2">
                {monthlyFinance.map((month) => {
                  const incomeHeight = Math.max(
                    month.income > 0 ? 8 : 0,
                    (month.income / maximumMonthlyValue) * 220,
                  );

                  const expenseHeight = Math.max(
                    month.expense > 0 ? 8 : 0,
                    (month.expense / maximumMonthlyValue) * 220,
                  );

                  return (
                    <div
                      key={month.key}
                      className="flex min-w-20 flex-1 flex-col items-center"
                    >
                      <div className="flex h-56 items-end gap-2">
                        <div
                          title={`Thu: ${formatCurrency(month.income)}`}
                          className="w-7 rounded-t-md bg-emerald-500"
                          style={{
                            height: `${incomeHeight}px`,
                          }}
                        />

                        <div
                          title={`Chi: ${formatCurrency(month.expense)}`}
                          className="w-7 rounded-t-md bg-red-400"
                          style={{
                            height: `${expenseHeight}px`,
                          }}
                        />
                      </div>

                      <p className="py-3 text-xs font-medium text-slate-600">
                        {month.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-5 text-sm">
                <Legend
                  label="Tổng thu"
                  className="bg-emerald-500"
                />

                <Legend
                  label="Tổng chi"
                  className="bg-red-400"
                />
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[580px]">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tháng</th>
                      <th className="px-4 py-3">Thu</th>
                      <th className="px-4 py-3">Chi</th>
                      <th className="px-4 py-3">
                        Lợi nhuận
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {monthlyFinance.map((month) => (
                      <tr key={month.key}>
                        <td className="px-4 py-3 text-sm font-semibold">
                          {month.label}
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                          {formatCurrency(month.income)}
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold text-red-700">
                          {formatCurrency(month.expense)}
                        </td>

                        <td
                          className={`px-4 py-3 text-sm font-bold ${
                            month.profit >= 0
                              ? "text-blue-700"
                              : "text-red-700"
                          }`}
                        >
                          {formatCurrency(month.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Trạng thái dự án
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Tình trạng hiện tại của toàn bộ dự án.
          </p>

          <div className="mt-5 space-y-3">
            {(
              Object.keys(
                projectStatusLabels,
              ) as ProjectStatus[]
            ).map((status) => (
              <div
                key={status}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${projectStatusClasses[status]}`}
                >
                  {projectStatusLabels[status]}
                </span>

                <span className="text-lg font-bold text-slate-900">
                  {projectStatusCount[status]}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <span className="text-sm font-semibold text-red-700">
                Trễ hạn
              </span>

              <span className="text-lg font-bold text-red-700">
                {overdueProjects.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Dự án có giá trị cao
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Xếp hạng theo giá trị thực tế của dự án.
          </p>
        </div>

        {topProjects.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu dự án." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-4">Mã</th>
                  <th className="px-4 py-4">
                    Tên dự án
                  </th>
                  <th className="px-4 py-4">
                    Khách hàng
                  </th>
                  <th className="px-4 py-4">
                    Giá trị thực tế
                  </th>
                  <th className="px-4 py-4">
                    Đã thanh toán
                  </th>
                  <th className="px-4 py-4">
                    Công nợ
                  </th>
                  <th className="px-4 py-4">
                    Trạng thái
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {topProjects.map((project) => {
                  const actualValue = Number(project.actual_value);
                  const paidAmount = Number(project.paid_amount);
                  const debt = Math.max(
                    0,
                    actualValue - paidAmount,
                  );

                  const customerName =
                    project.customers?.company_name ||
                    project.customers?.full_name ||
                    "Chưa chọn khách hàng";

                  const status =
                    project.status as ProjectStatus;

                  return (
                    <tr key={project.id}>
                      <td className="px-4 py-4 text-sm font-semibold text-blue-600">
                        {project.project_code}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {project.project_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Hạn: {formatDate(project.due_date)}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {customerName}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold">
                        {formatCurrency(actualValue)}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-emerald-700">
                        {formatCurrency(paidAmount)}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-amber-700">
                        {formatCurrency(debt)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${projectStatusClasses[status]}`}
                        >
                          {projectStatusLabels[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Khách hàng có doanh thu cao
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Dựa trên các khoản thu có gắn khách hàng.
            </p>
          </div>

          {topCustomers.length === 0 ? (
            <EmptyState message="Chưa có khoản thu nào được gắn với khách hàng." />
          ) : (
            <div className="divide-y divide-slate-200">
              {topCustomers.map((customer, index) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {customer.company_name ||
                          customer.full_name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {customer.customer_code}
                      </p>
                    </div>
                  </div>

                  <p className="shrink-0 font-bold text-emerald-700">
                    {formatCurrency(customer.revenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Dự án trễ hạn
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Chưa hoàn thành và đã vượt quá hạn dự kiến.
            </p>
          </div>

          {overdueProjects.length === 0 ? (
            <EmptyState message="Hiện không có dự án trễ hạn." />
          ) : (
            <div className="divide-y divide-slate-200">
              {overdueProjects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {project.project_name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {project.project_code} · Hạn{" "}
                      {formatDate(project.due_date)}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    Trễ hạn
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  valueClassName: string;
};

function SummaryCard({
  label,
  value,
  description,
  valueClassName,
}: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 text-2xl font-bold ${valueClassName}`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </article>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="p-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function Legend({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-3 w-3 rounded-sm ${className}`}
      />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}