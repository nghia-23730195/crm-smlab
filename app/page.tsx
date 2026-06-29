import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/current-user";
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

type ChartMonth = {
  key: string;
  label: string;
  income: number;
  expense: number;
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

function getMonthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(
    value.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

function startOfUTCMonth(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      1,
    ),
  );
}

function startOfNextUTCMonth(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      1,
    ),
  );
}

function getRecentMonths(count: number, now: Date) {
  const months: ChartMonth[] = [];

  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - offset,
        1,
      ),
    );

    months.push({
      key: getMonthKey(date),
      label: `T${date.getUTCMonth() + 1}`,
      income: 0,
      expense: 0,
    });
  }

  return months;
}

export default async function DashboardPage() {
  const { organizationId } =
    await requireCurrentUser();

  const now = new Date();

  const currentMonthStart = startOfUTCMonth(now);
  const nextMonthStart = startOfNextUTCMonth(now);

  const previousMonthStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - 1,
      1,
    ),
  );

  const recentMonths = getRecentMonths(6, now);

  const firstChartMonth = new Date(
    Date.UTC(
      Number(recentMonths[0].key.slice(0, 4)),
      Number(recentMonths[0].key.slice(5, 7)) - 1,
      1,
    ),
  );

  const sevenDaysLater = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 7,
    ),
  );

  const [
    totalCustomers,
    newCustomersThisMonth,
    activeProducts,
    productsForStock,
    activeProjects,
    projectsDueSoon,
    currentMonthTransactions,
    previousMonthIncomeTransactions,
    sixMonthTransactions,
    projectsForDebt,
    recentProjects,
  ] = await Promise.all([
    prisma.customers.count({
      where: {
        organization_id: organizationId,
        status: {
          not: "inactive",
        },
      },
    }),

    prisma.customers.count({
      where: {
        organization_id: organizationId,
        created_at: {
          gte: currentMonthStart,
          lt: nextMonthStart,
        },
      },
    }),

    prisma.products.count({
      where: {
        organization_id: organizationId,
        is_active: true,
      },
    }),

    prisma.products.findMany({
      where: {
        organization_id: organizationId,
        is_active: true,
      },
      select: {
        stock_quantity: true,
        minimum_stock: true,
      },
    }),

    prisma.projects.count({
      where: {
        organization_id: organizationId,
        status: {
          in: [
            "planning",
            "in_progress",
            "waiting",
          ],
        },
      },
    }),

    prisma.projects.count({
      where: {
        organization_id: organizationId,
        due_date: {
          gte: now,
          lte: sevenDaysLater,
        },
        status: {
          notIn: ["completed", "cancelled"],
        },
      },
    }),

    prisma.transactions.findMany({
      where: {
        organization_id: organizationId,
        transaction_date: {
          gte: currentMonthStart,
          lt: nextMonthStart,
        },
      },
      select: {
        transaction_type: true,
        amount: true,
      },
    }),

    prisma.transactions.findMany({
      where: {
        organization_id: organizationId,
        transaction_type: "income",
        transaction_date: {
          gte: previousMonthStart,
          lt: currentMonthStart,
        },
      },
      select: {
        amount: true,
      },
    }),

    prisma.transactions.findMany({
      where: {
        organization_id: organizationId,
        transaction_date: {
          gte: firstChartMonth,
          lt: nextMonthStart,
        },
      },
      select: {
        transaction_type: true,
        amount: true,
        transaction_date: true,
      },
      orderBy: {
        transaction_date: "asc",
      },
    }),

    prisma.projects.findMany({
      where: {
        organization_id: organizationId,
      },
      select: {
        actual_value: true,
        paid_amount: true,
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
        created_at: "desc",
      },
      take: 5,
    }),
  ]);

  const lowStockProducts = productsForStock.filter(
    (product) => {
      const stock = Number(product.stock_quantity);
      const minimum = Number(product.minimum_stock);

      return stock > 0 && stock <= minimum;
    },
  ).length;

  const currentIncome = currentMonthTransactions
    .filter(
      (transaction) =>
        transaction.transaction_type === "income",
    )
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0,
    );

  const currentExpense = currentMonthTransactions
    .filter(
      (transaction) =>
        transaction.transaction_type === "expense",
    )
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0,
    );

  const currentProfit = currentIncome - currentExpense;

  const previousIncome =
    previousMonthIncomeTransactions.reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0,
    );

  const revenueChange =
    previousIncome > 0
      ? ((currentIncome - previousIncome) /
          previousIncome) *
        100
      : null;

  const revenueChangeLabel =
    revenueChange === null
      ? "Chưa có dữ liệu tháng trước"
      : `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(
          1,
        )}% so với tháng trước`;

  const chartMap = new Map(
    recentMonths.map((month) => [month.key, month]),
  );

  for (const transaction of sixMonthTransactions) {
    const key = getMonthKey(transaction.transaction_date);
    const month = chartMap.get(key);

    if (!month) {
      continue;
    }

    if (transaction.transaction_type === "income") {
      month.income += Number(transaction.amount);
    } else {
      month.expense += Number(transaction.amount);
    }
  }

  const chartData = Array.from(chartMap.values());

  const maximumChartValue = Math.max(
    1,
    ...chartData.flatMap((month) => [
      month.income,
      month.expense,
    ]),
  );

  const totalDebt = projectsForDebt.reduce(
    (sum, project) =>
      sum +
      Math.max(
        0,
        Number(project.actual_value) -
          Number(project.paid_amount),
      ),
    0,
  );

  const statistics = [
    {
      title: "Tổng khách hàng",
      value: totalCustomers.toString(),
      description: `+${newCustomersThisMonth} khách hàng trong tháng`,
    },
    {
      title: "Tổng sản phẩm",
      value: activeProducts.toString(),
      description: `${lowStockProducts} sản phẩm sắp hết`,
    },
    {
      title: "Dự án đang thực hiện",
      value: activeProjects.toString(),
      description: `${projectsDueSoon} dự án sắp đến hạn`,
    },
    {
      title: "Doanh thu tháng",
      value: formatCurrency(currentIncome),
      description: revenueChangeLabel,
    },
  ];

  return (
    <div className="p-5 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statistics.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">
              {item.title}
            </p>

            <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              {item.value}
            </p>

            <p className="mt-3 text-xs text-slate-500">
              {item.description}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Doanh thu và chi phí
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Thống kê 6 tháng gần nhất
            </p>
          </div>

          <div className="mt-8 flex h-64 items-end gap-4 overflow-x-auto border-b border-l border-slate-200 px-4 pb-4">
            {chartData.map((item) => {
              const incomeHeight = Math.max(
                item.income > 0 ? 8 : 0,
                (item.income / maximumChartValue) * 190,
              );

              const expenseHeight = Math.max(
                item.expense > 0 ? 8 : 0,
                (item.expense / maximumChartValue) * 190,
              );

              return (
                <div
                  key={item.key}
                  className="flex min-w-16 flex-1 flex-col items-center justify-end gap-3"
                >
                  <div className="flex h-48 w-full items-end justify-center gap-2">
                    <div
                      title={`Doanh thu: ${formatCurrency(
                        item.income,
                      )}`}
                      className="w-5 rounded-t-md bg-blue-600"
                      style={{
                        height: `${incomeHeight}px`,
                      }}
                    />

                    <div
                      title={`Chi phí: ${formatCurrency(
                        item.expense,
                      )}`}
                      className="w-5 rounded-t-md bg-slate-300"
                      style={{
                        height: `${expenseHeight}px`,
                      }}
                    />
                  </div>

                  <span className="text-xs text-slate-500">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex gap-6 text-sm">
            <Legend
              label="Doanh thu"
              className="bg-blue-600"
            />

            <Legend
              label="Chi phí"
              className="bg-slate-300"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">
            Tổng quan tài chính
          </h3>

          <div className="mt-6 space-y-5">
            <FinancialRow
              label="Doanh thu"
              value={formatCurrency(currentIncome)}
              valueClassName="text-emerald-700"
            />

            <FinancialRow
              label="Chi phí"
              value={formatCurrency(currentExpense)}
              valueClassName="text-red-700"
            />

            <FinancialRow
              label="Lợi nhuận"
              value={formatCurrency(currentProfit)}
              valueClassName={
                currentProfit >= 0
                  ? "text-blue-700"
                  : "text-red-700"
              }
            />

            <FinancialRow
              label="Công nợ"
              value={formatCurrency(totalDebt)}
              valueClassName="text-amber-700"
            />
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Dự án gần đây
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Theo dõi các dự án mới nhất trong hệ thống
            </p>
          </div>

          <Link
            href="/projects"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Xem tất cả
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Chưa có dự án nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">
                    Tên dự án
                  </th>

                  <th className="px-6 py-4">
                    Khách hàng
                  </th>

                  <th className="px-6 py-4">
                    Hạn hoàn thành
                  </th>

                  <th className="px-6 py-4">
                    Trạng thái
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {recentProjects.map((project) => {
                  const status =
                    project.status as ProjectStatus;

                  const customerName =
                    project.customers?.company_name ||
                    project.customers?.full_name ||
                    "Chưa chọn khách hàng";

                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {project.project_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {project.project_code}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {customerName}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(project.due_date)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                            projectStatusClasses[status]
                          }`}
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
    </div>
  );
}

type FinancialRowProps = {
  label: string;
  value: string;
  valueClassName: string;
};

function FinancialRow({
  label,
  value,
  valueClassName,
}: FinancialRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className={`font-bold ${valueClassName}`}>
        {value}
      </span>
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
        className={`h-3 w-3 rounded ${className}`}
      />
      <span>{label}</span>
    </div>
  );
}