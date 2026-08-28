import Link from "next/link";

import DeadlineBadge from "@/components/DeadlineBadge";
import ProjectStatusSelect from "@/components/ProjectStatusSelect";
import QuickPaymentAdjuster from "@/components/QuickPaymentAdjuster";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { formatProjectTitle } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChartMonth = {
  key: string;
  label: string;
  income: number;
  expense: number;
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
    dateStyle: "medium",
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
    projectsDueSoonList,
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
        id: true,
        product_code: true,
        name: true,
        stock_quantity: true,
        minimum_stock: true,
        cost_price: true,
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

    prisma.projects.findMany({
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
      select: {
        id: true,
        project_code: true,
        project_name: true,
        due_date: true,
      },
      take: 3,
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
        status: {
          not: "cancelled",
        },
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
            id: true,
            customer_code: true,
            full_name: true,
            company_name: true,
          },
        },
        _count: {
          select: {
            project_items: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 6,
    }),
  ]);

  const lowStockItems = productsForStock.filter((product) => {
    const stock = Number(product.stock_quantity);
    const minimum = Number(product.minimum_stock);
    return stock > 0 && stock <= minimum;
  });

  const outOfStockItems = productsForStock.filter((product) => {
    const stock = Number(product.stock_quantity);
    return stock === 0;
  });

  const totalInventoryValue = productsForStock.reduce(
    (sum, p) => sum + Number(p.stock_quantity) * Number(p.cost_price),
    0,
  );

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

  return (
    <div className="p-5 md:p-8 space-y-6">
      {/* 1. Smart Operational Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0 || projectsDueSoonList.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
            <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold">Cảnh báo tồn kho</p>
                  <p className="text-xs text-amber-700">
                    {outOfStockItems.length > 0 && `${outOfStockItems.length} mặt hàng hết `}
                    {lowStockItems.length > 0 && `${lowStockItems.length} mặt hàng sắp hết`}
                  </p>
                </div>
              </div>
              <Link
                href="/inventory"
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700 shadow-2xs"
              >
                Kiểm tra kho →
              </Link>
            </div>
          )}

          {projectsDueSoonList.length > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-blue-900 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold">Dự án sắp đến hạn</p>
                  <p className="text-xs text-blue-700">
                    {projectsDueSoonList.length} dự án cần bàn giao trong 7 ngày tới
                  </p>
                </div>
              </div>
              <Link
                href="/projects"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 shadow-2xs"
              >
                Xem tiến độ →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 2. Modern KPI Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Khách hàng hoạt động"
          value={totalCustomers.toString()}
          subtext={`+${newCustomersThisMonth} khách mới tháng này`}
          href="/customers"
          iconColor="bg-blue-50 text-blue-600 border-blue-100"
          icon={(
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )}
        />

        <KpiCard
          title="Sản phẩm & Vốn tồn"
          value={activeProducts.toString()}
          subtext={`Vốn tồn: ${formatCurrency(totalInventoryValue)}`}
          href="/inventory"
          iconColor="bg-purple-50 text-purple-600 border-purple-100"
          icon={(
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )}
        />

        <KpiCard
          title="Dự án đang thực hiện"
          value={activeProjects.toString()}
          subtext={`Công nợ: ${formatCurrency(totalDebt)}`}
          href="/projects"
          iconColor="bg-amber-50 text-amber-600 border-amber-100"
          icon={(
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          )}
        />

        <KpiCard
          title="Doanh thu tháng này"
          value={formatCurrency(currentIncome)}
          subtext={
            revenueChange !== null
              ? `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}% so với tháng trước`
              : "Lợi nhuận: " + formatCurrency(currentProfit)
          }
          href="/finance"
          iconColor="bg-emerald-50 text-emerald-600 border-emerald-100"
          icon={(
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        />
      </div>

      {/* 3. Chart & Financial Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Biểu đồ Doanh thu & Chi phí
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Diễn biến thu chi trong 6 tháng gần nhất
              </p>
            </div>

            <Link
              href="/reports"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1.5 rounded-xl transition hover:bg-blue-100 shadow-2xs"
            >
              Báo cáo chi tiết →
            </Link>
          </div>

          <div className="mt-8 flex h-64 items-end gap-3 sm:gap-4 overflow-x-auto border-b border-l border-slate-200 px-4 pb-4">
            {chartData.map((item) => {
              const incomeHeight = Math.max(
                item.income > 0 ? 8 : 0,
                (item.income / maximumChartValue) * 185,
              );

              const expenseHeight = Math.max(
                item.expense > 0 ? 8 : 0,
                (item.expense / maximumChartValue) * 185,
              );

              return (
                <div
                  key={item.key}
                  className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex h-48 w-full items-end justify-center gap-1.5 sm:gap-2">
                    <div
                      title={`Thu: ${formatCurrency(item.income)}`}
                      className="w-4 sm:w-6 rounded-t-md bg-blue-500 transition hover:brightness-110"
                      style={{
                        height: `${incomeHeight}px`,
                      }}
                    />

                    <div
                      title={`Chi: ${formatCurrency(item.expense)}`}
                      className="w-4 sm:w-6 rounded-t-md bg-slate-300 transition hover:brightness-110"
                      style={{
                        height: `${expenseHeight}px`,
                      }}
                    />
                  </div>

                  <span className="text-xs font-semibold text-slate-600">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex gap-6">
              <Legend label="Doanh thu" className="bg-blue-500" />
              <Legend label="Chi phí" className="bg-slate-300" />
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Đơn vị: VNĐ
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Sổ quỹ tháng này
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Cân đối thu chi và lợi nhuận ròng
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <FinancialRow
              label="Tổng khoản thu"
              value={formatCurrency(currentIncome)}
              valueClassName="text-emerald-700"
            />

            <FinancialRow
              label="Tổng khoản chi"
              value={formatCurrency(currentExpense)}
              valueClassName="text-red-700"
            />

            <FinancialRow
              label="Lợi nhuận ròng"
              value={formatCurrency(currentProfit)}
              valueClassName={
                currentProfit >= 0
                  ? "text-blue-700 text-lg font-extrabold"
                  : "text-red-700 text-lg font-extrabold"
              }
            />

            <FinancialRow
              label="Công nợ chưa thu"
              value={formatCurrency(totalDebt)}
              valueClassName="text-amber-700"
            />
          </div>

          <Link
            href="/finance"
            className="mt-6 block w-full rounded-xl bg-blue-50 border border-blue-200/80 py-2.5 text-center text-xs font-bold text-blue-700 transition hover:bg-blue-100 shadow-2xs"
          >
            Mở sổ quỹ tài chính →
          </Link>
        </section>
      </div>

      {/* 4. Recent Projects Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Dự án gần đây
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Theo dõi tình trạng thực hiện và thanh toán dự án
            </p>
          </div>

          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1.5 rounded-xl transition hover:bg-blue-100 shadow-2xs"
          >
            Xem tất cả dự án →
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-xs text-slate-500">Chưa có dự án nào.</p>
            <Link
              href="/projects/new"
              className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
            >
              + Tạo dự án đầu tiên
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Mã & Tên dự án</th>
                  <th className="px-5 py-3.5">Khách hàng</th>
                  <th className="px-5 py-3.5">Hạn hoàn thành & Deadline</th>
                  <th className="px-5 py-3.5">Tiến độ thanh toán</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {recentProjects.map((project) => {
                  const customerName =
                    project.customers?.company_name ||
                    project.customers?.full_name ||
                    "Chưa chọn";

                  const actualVal = Number(project.actual_value ?? 0);
                  const paidVal = Number(project.paid_amount ?? 0);

                  return (
                    <tr
                      key={project.id}
                      className="bg-white transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition text-[13.5px] leading-snug block"
                        >
                          {formatProjectTitle(project.project_name)}
                        </Link>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold">
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 border border-blue-200">
                            {project.project_code}
                          </span>
                          <span className="text-slate-500 font-medium">
                            📦 {project._count.project_items} linh kiện
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {project.customers ? (
                          <Link
                            href={`/customers/${project.customers.id}`}
                            className="text-sm font-semibold text-slate-800 hover:text-blue-600 hover:underline block"
                          >
                            {customerName}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">Không gắn khách</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-slate-800 tabular-nums">
                            📅 {formatDate(project.due_date)}
                          </span>
                          <DeadlineBadge
                            dueDate={project.due_date}
                            status={project.status}
                          />
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <QuickPaymentAdjuster
                          projectId={project.id}
                          projectCode={project.project_code}
                          projectName={project.project_name}
                          actualValue={actualVal}
                          currentPaid={paidVal}
                          customerName={customerName}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <ProjectStatusSelect
                          projectId={project.id}
                          currentStatus={project.status}
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/projects/${project.id}`}
                          className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:border-slate-300 shadow-2xs"
                        >
                          Chi tiết →
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

function KpiCard({
  title,
  value,
  subtext,
  href,
  icon,
  iconColor,
}: {
  title: string;
  value: string;
  subtext: string;
  href: string;
  icon: React.ReactNode;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition">
            {value}
          </p>
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${iconColor}`}>
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500">
        {subtext}
      </p>
    </Link>
  );
}

function FinancialRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-slate-600">
        {label}
      </span>

      <span className={`text-sm font-bold ${valueClassName}`}>
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
      <span className={`h-3 w-3 rounded-sm ${className}`} />
      <span className="text-slate-700 font-medium">{label}</span>
    </div>
  );
}