import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { formatProjectTitle } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  draft: "bg-slate-100 text-slate-700 border border-slate-200",
  planning: "bg-purple-50 text-purple-700 border border-purple-200",
  in_progress: "bg-blue-50 text-blue-700 border border-blue-200",
  waiting: "bg-amber-50 text-amber-800 border border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 border border-slate-200",
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
  const { organizationId } =
    await requireCurrentUser();

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

  const transactionDateCondition = {
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(exclusiveDateTo ? { lt: exclusiveDateTo } : {}),
  };

  const [
    transactions,
    allProjects,
    customers,
  ] = await Promise.all([
    prisma.transactions.findMany({
      where: {
        organization_id: organizationId,
        ...(dateFrom || exclusiveDateTo
          ? { transaction_date: transactionDateCondition }
          : {}),
      },
      orderBy: {
        transaction_date: "asc",
      },
    }),

    prisma.projects.findMany({
      where: {
        organization_id: organizationId,
      },
      include: {
        customers: {
          select: {
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
        organization_id: organizationId,
      },
      select: {
        id: true,
        customer_code: true,
        full_name: true,
        company_name: true,
      },
    }),
  ]);

  let totalIncome = 0;
  let totalExpense = 0;

  const monthlyFinanceMap = new Map<
    string,
    {
      label: string;
      income: number;
      expense: number;
      date: Date;
    }
  >();

  const customerRevenueMap = new Map<string, number>();

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    const key = getMonthKey(transaction.transaction_date);
    const label = getMonthLabel(transaction.transaction_date);

    if (transaction.transaction_type === "income") {
      totalIncome += amount;

      if (transaction.customer_id) {
        const currentRevenue =
          customerRevenueMap.get(transaction.customer_id) ?? 0;
        customerRevenueMap.set(
          transaction.customer_id,
          currentRevenue + amount,
        );
      }
    } else if (transaction.transaction_type === "expense") {
      totalExpense += amount;
    }

    const currentMonth = monthlyFinanceMap.get(key) ?? {
      label,
      income: 0,
      expense: 0,
      date: transaction.transaction_date,
    };

    if (transaction.transaction_type === "income") {
      currentMonth.income += amount;
    } else if (transaction.transaction_type === "expense") {
      currentMonth.expense += amount;
    }

    monthlyFinanceMap.set(key, currentMonth);
  }

  const profit = totalIncome - totalExpense;

  const monthlyFinance: MonthlyFinance[] = Array.from(
    monthlyFinanceMap.entries(),
  )
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .slice(-12)
    .map(([key, data]) => ({
      key,
      label: data.label,
      income: data.income,
      expense: data.expense,
      profit: data.income - data.expense,
    }));

  const maximumMonthlyValue = Math.max(
    ...monthlyFinance.flatMap((item) => [item.income, item.expense]),
    1,
  );

  const projectStatusCount: Record<ProjectStatus, number> = {
    draft: 0,
    planning: 0,
    in_progress: 0,
    waiting: 0,
    completed: 0,
    cancelled: 0,
  };

  let totalDebt = 0;
  const now = new Date();

  for (const project of allProjects) {
    const status = project.status as ProjectStatus;

    if (status in projectStatusCount) {
      projectStatusCount[status] += 1;
    }

    const actual = Number(project.actual_value);
    const paid = Number(project.paid_amount);

    if (actual > paid) {
      totalDebt += actual - paid;
    }
  }

  const overdueProjects = allProjects.filter((project) => {
    if (
      project.status === "completed" ||
      project.status === "cancelled"
    ) {
      return false;
    }

    if (!project.due_date) {
      return false;
    }

    return project.due_date < now;
  });

  const topProjects = allProjects.slice(0, 5);

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
    <div className="p-5 md:p-8 space-y-6">
      {/* 1. Filter Section */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Bộ lọc báo cáo tài chính
              </h2>
              {hasDateFilter && (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  Đang lọc theo ngày
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Lọc phạm vi thời gian áp dụng cho thu, chi, lợi nhuận và doanh thu khách hàng.
            </p>
          </div>

          <form
            action="/reports"
            method="GET"
            className="flex flex-wrap items-end gap-3"
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
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
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
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
            </div>

            {/* Natural pastel blue button */}
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 px-4.5 py-2 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              📊 Xem báo cáo
            </button>

            {hasDateFilter && (
              <Link
                href="/reports"
                className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-50 shadow-2xs"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>
      </section>

      {/* 2. Top Summary KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Tổng thu"
          value={formatCurrency(totalIncome)}
          description={`${transactions.filter((item) => item.transaction_type === "income").length} khoản thu`}
          valueClassName="text-emerald-600"
        />

        <SummaryCard
          label="Tổng chi"
          value={formatCurrency(totalExpense)}
          description={`${transactions.filter((item) => item.transaction_type === "expense").length} khoản chi`}
          valueClassName="text-rose-600"
        />

        <SummaryCard
          label="Lợi nhuận"
          value={formatCurrency(profit)}
          description="Tổng thu trừ tổng chi"
          valueClassName={
            profit >= 0 ? "text-blue-600" : "text-rose-600"
          }
        />

        <SummaryCard
          label="Công nợ dự án"
          value={formatCurrency(totalDebt)}
          description="Giá trị hợp đồng chưa thanh toán"
          valueClassName="text-amber-600"
        />
      </section>

      {/* 3. Monthly Chart & Project Status */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Thu và chi theo tháng
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
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
                          className="w-6 rounded-t-md bg-emerald-500 transition-all hover:bg-emerald-600"
                          style={{
                            height: `${incomeHeight}px`,
                          }}
                        />

                        <div
                          title={`Chi: ${formatCurrency(month.expense)}`}
                          className="w-6 rounded-t-md bg-rose-400 transition-all hover:bg-rose-500"
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

              <div className="mt-4 flex flex-wrap gap-5 text-xs">
                <Legend
                  label="Tổng thu"
                  className="bg-emerald-500"
                />

                <Legend
                  label="Tổng chi"
                  className="bg-rose-400"
                />
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 border-y border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Tháng</th>
                      <th className="px-4 py-2.5 text-right">Thu</th>
                      <th className="px-4 py-2.5 text-right">Chi</th>
                      <th className="px-4 py-2.5 text-right">Lợi nhuận</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {monthlyFinance.map((month) => (
                      <tr key={month.key} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 text-xs font-semibold text-slate-800">
                          {month.label}
                        </td>

                        <td className="px-4 py-2.5 text-xs font-semibold text-emerald-600 text-right tabular-nums">
                          {formatCurrency(month.income)}
                        </td>

                        <td className="px-4 py-2.5 text-xs font-semibold text-rose-600 text-right tabular-nums">
                          {formatCurrency(month.expense)}
                        </td>

                        <td
                          className={`px-4 py-2.5 text-xs font-bold text-right tabular-nums ${
                            month.profit >= 0
                              ? "text-blue-600"
                              : "text-rose-600"
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

        {/* Project Status Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
            Trạng thái dự án
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Tình trạng hiện tại của toàn bộ dự án.
          </p>

          <div className="mt-4 space-y-2.5">
            {(
              Object.keys(
                projectStatusLabels,
              ) as ProjectStatus[]
            ).map((status) => (
              <div
                key={status}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5"
              >
                <span
                  className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${projectStatusClasses[status]}`}
                >
                  {projectStatusLabels[status]}
                </span>

                <span className="text-sm font-bold text-slate-800">
                  {projectStatusCount[status]}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/60 px-3.5 py-2.5">
              <span className="text-xs font-semibold text-rose-700">
                🚨 Quá hạn tiến độ
              </span>

              <span className="text-sm font-bold text-rose-700">
                {overdueProjects.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. High Value Projects */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-base font-bold text-slate-900">
            Dự án có giá trị cao
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Xếp hạng theo giá trị thực tế của dự án.
          </p>
        </div>

        {topProjects.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu dự án." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Tên dự án</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3 text-right">Giá trị HĐ</th>
                  <th className="px-4 py-3 text-right">Đã thanh toán</th>
                  <th className="px-4 py-3 text-right">Công nợ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
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
                    <tr key={project.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-xs font-semibold text-blue-600">
                        {project.project_code}
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-semibold text-xs text-slate-900 hover:text-blue-600 transition"
                        >
                          {formatProjectTitle(project.project_name)}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Hạn: {formatDate(project.due_date)}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600">
                        {customerName}
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold text-right tabular-nums">
                        {formatCurrency(actualValue)}
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold text-emerald-600 text-right tabular-nums">
                        {formatCurrency(paidAmount)}
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold text-amber-600 text-right tabular-nums">
                        {formatCurrency(debt)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${projectStatusClasses[status]}`}
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

      {/* 5. Top Revenue Customers & Overdue Projects */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-base font-bold text-slate-900">
              Khách hàng có doanh thu cao
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Dựa trên các khoản thu thực tế trong hệ thống.
            </p>
          </div>

          {topCustomers.length === 0 ? (
            <EmptyState message="Chưa có khoản thu nào được gắn với khách hàng." />
          ) : (
            <div className="divide-y divide-slate-100">
              {topCustomers.map((customer, index) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50/70"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700 border border-blue-200">
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-xs text-slate-900">
                        {customer.company_name || customer.full_name}
                      </p>

                      <p className="text-[11px] text-slate-400">
                        {customer.customer_code}
                      </p>
                    </div>
                  </div>

                  <p className="shrink-0 font-bold text-xs text-emerald-600 tabular-nums">
                    {formatCurrency(customer.revenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-base font-bold text-slate-900">
              Dự án quá hạn tiến độ
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Chưa hoàn thành và đã vượt quá hạn dự kiến.
            </p>
          </div>

          {overdueProjects.length === 0 ? (
            <EmptyState message="Hiện không có dự án quá hạn." />
          ) : (
            <div className="divide-y divide-slate-100">
              {overdueProjects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${project.id}`}
                      className="truncate font-semibold text-xs text-slate-900 hover:text-blue-600 transition"
                    >
                      {formatProjectTitle(project.project_name)}
                    </Link>

                    <p className="text-[11px] text-slate-400">
                      {project.project_code} · Hạn: {formatDate(project.due_date)}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                    Quá hạn
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
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClassName} tabular-nums`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </article>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="p-10 text-center text-xs text-slate-400">
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
        className={`h-2.5 w-2.5 rounded-sm ${className}`}
      />
      <span className="text-slate-600 font-medium">{label}</span>
    </div>
  );
}