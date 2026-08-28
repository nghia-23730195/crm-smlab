import Link from "next/link";

import DeleteTransactionButton from "@/components/DeleteTransactionButton";
import ExportCsvButton from "@/components/ExportCsvButton";
import FinanceCharts from "@/components/FinanceCharts";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { deleteTransaction } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TransactionType = "income" | "expense";

type FinancePageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    project?: string;
    year?: string;
    month?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    view?: string;
    success?: string;
    error?: string;
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
    dateStyle: "medium",
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

  const now = new Date();
  const currentSystemYear = now.getUTCFullYear();

  const keyword = String(params.q ?? "").trim();
  const selectedType = String(params.type ?? "all").trim();
  const selectedProject = String(params.project ?? "all").trim();
  const selectedCategory = String(params.category ?? "all").trim();
  const selectedYear = params.year ? String(params.year).trim() : String(currentSystemYear);
  const selectedMonth = params.month ? String(params.month).trim() : "all";
  const currentView = params.view === "monthly" ? "monthly" : params.view === "categories" ? "categories" : "ledger";

  const dateFromText = String(params.date_from ?? "").trim();
  const dateToText = String(params.date_to ?? "").trim();

  let dateFrom = parseDateFilter(dateFromText);
  let dateTo = parseDateFilter(dateToText);

  // If specific year / month filter is selected without custom date range
  if (!dateFrom && !dateTo && selectedYear !== "all") {
    const y = Number(selectedYear);
    if (selectedMonth !== "all") {
      const m = Number(selectedMonth);
      dateFrom = new Date(Date.UTC(y, m - 1, 1));
      // End of that month
      dateTo = new Date(Date.UTC(y, m, 1));
    } else {
      dateFrom = new Date(Date.UTC(y, 0, 1));
      dateTo = new Date(Date.UTC(y + 1, 0, 1));
    }
  } else if (dateTo) {
    dateTo.setUTCDate(dateTo.getUTCDate() + 1);
  }

  const transactionType =
    selectedType === "income" || selectedType === "expense"
      ? selectedType
      : null;

  // Query all transactions for current organization to support both filtered list & year breakdown
  const [transactions, projects, allCategoriesList] = await Promise.all([
    prisma.transactions.findMany({
      where: {
        organization_id: organizationId,

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

        ...(selectedCategory !== "all"
          ? {
              category: selectedCategory,
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
          transaction_code: "desc",
        },
        {
          created_at: "desc",
        },
      ],
    }),

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
        project_name: "asc",
      },
    }),

    prisma.transactions.findMany({
      where: {
        organization_id: organizationId,
      },
      select: {
        category: true,
      },
      distinct: ["category"],
      orderBy: {
        category: "asc",
      },
    }),
  ]);

  // Overall financial totals for current filter
  const totalIncome = transactions
    .filter((t) => t.transaction_type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.transaction_type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const profit = totalIncome - totalExpense;

  // Monthly Breakdown Matrix (12 months of selectedYear or currentYear)
  const targetYear = selectedYear === "all" ? currentSystemYear : Number(selectedYear);
  const monthlyData: {
    month: number;
    monthLabel: string;
    income: number;
    expense: number;
    profit: number;
    count: number;
  }[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const mTransactions = transactions.filter((t) => {
      const d = new Date(t.transaction_date);
      return d.getUTCFullYear() === targetYear && d.getUTCMonth() + 1 === m;
    });

    const mIncome = mTransactions
      .filter((t) => t.transaction_type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const mExpense = mTransactions
      .filter((t) => t.transaction_type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      month: m,
      monthLabel: `Tháng ${m}/${targetYear}`,
      income: mIncome,
      expense: mExpense,
      profit: mIncome - mExpense,
      count: mTransactions.length,
    };
  });

  // Category Breakdown Grouping (Income vs Expense categories)
  const incomeCategoryMap: Record<string, number> = {};
  const expenseCategoryMap: Record<string, number> = {};

  transactions.forEach((t) => {
    const amt = Number(t.amount);
    if (t.transaction_type === "income") {
      incomeCategoryMap[t.category] = (incomeCategoryMap[t.category] || 0) + amt;
    } else {
      expenseCategoryMap[t.category] = (expenseCategoryMap[t.category] || 0) + amt;
    }
  });

  const incomeCategories = Object.entries(incomeCategoryMap)
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percent: totalIncome > 0 ? Math.round((amt / totalIncome) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const expenseCategories = Object.entries(expenseCategoryMap)
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percent: totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const hasFilters =
    keyword.length > 0 ||
    selectedType !== "all" ||
    selectedProject !== "all" ||
    selectedCategory !== "all" ||
    selectedMonth !== "all" ||
    selectedYear !== String(currentSystemYear) ||
    dateFromText.length > 0 ||
    dateToText.length > 0;

  // CSV Export Data
  const csvHeaders = [
    "Mã giao dịch",
    "Ngày giao dịch",
    "Loại giao dịch",
    "Danh mục",
    "Số tiền (VNĐ)",
    "Phương thức thanh toán",
    "Dự án",
    "Khách hàng",
    "Mô tả / Ghi chú",
  ];

  const csvRows = transactions.map((t) => [
    t.transaction_code,
    formatDate(t.transaction_date),
    transactionTypeLabels[t.transaction_type as TransactionType] || t.transaction_type,
    t.category,
    Number(t.amount),
    paymentMethodLabels[t.payment_method] || t.payment_method,
    t.projects?.project_name || "",
    t.customers?.full_name || "",
    t.description || "",
  ]);

  const yearOptions = [
    currentSystemYear + 1,
    currentSystemYear,
    currentSystemYear - 1,
    currentSystemYear - 2,
    currentSystemYear - 3,
  ];

  return (
    <div className="p-5 md:p-8 space-y-6">
      {params.success === "created" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Tạo giao dịch mới thành công.
        </div>
      )}

      {params.success === "updated" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Cập nhật giao dịch thành công.
        </div>
      )}

      {params.success === "deleted" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Xóa giao dịch thành công.
        </div>
      )}

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {params.error}
        </div>
      )}

      {/* 1. Cashflow Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Tổng thu"
          value={formatCurrency(totalIncome)}
          subtext={`Doanh thu ${selectedMonth !== "all" ? `tháng ${selectedMonth}/` : ""}${selectedYear !== "all" ? selectedYear : "toàn thời gian"}`}
          className="text-emerald-700"
        />

        <SummaryCard
          label="Tổng chi"
          value={formatCurrency(totalExpense)}
          subtext={`Chi phí vật tư & vận hành ${selectedMonth !== "all" ? `T${selectedMonth}/` : ""}${selectedYear !== "all" ? selectedYear : ""}`}
          className="text-red-700"
        />

        <SummaryCard
          label="Lợi nhuận ròng"
          value={formatCurrency(profit)}
          subtext={profit >= 0 ? "Dòng tiền dương" : "Dòng tiền âm"}
          className={profit >= 0 ? "text-blue-700" : "text-red-700"}
        />
      </div>

      {/* 2. Visual Interactive Charts */}
      <FinanceCharts
        monthlyData={monthlyData}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        profit={profit}
        targetYear={targetYear}
      />

      {/* 3. Main Section: Ledger, Monthly Matrix & Categories */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* View Switcher Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <Link
                href={`/finance?q=${encodeURIComponent(keyword)}&type=${encodeURIComponent(selectedType)}&year=${encodeURIComponent(selectedYear)}&month=${encodeURIComponent(selectedMonth)}&project=${encodeURIComponent(selectedProject)}&category=${encodeURIComponent(selectedCategory)}&view=ledger`}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  currentView === "ledger"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Sổ quỹ giao dịch
              </Link>

              <Link
                href={`/finance?q=${encodeURIComponent(keyword)}&type=${encodeURIComponent(selectedType)}&year=${encodeURIComponent(selectedYear)}&month=${encodeURIComponent(selectedMonth)}&project=${encodeURIComponent(selectedProject)}&category=${encodeURIComponent(selectedCategory)}&view=monthly`}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  currentView === "monthly"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Theo 12 Tháng
              </Link>

              <Link
                href={`/finance?q=${encodeURIComponent(keyword)}&type=${encodeURIComponent(selectedType)}&year=${encodeURIComponent(selectedYear)}&month=${encodeURIComponent(selectedMonth)}&project=${encodeURIComponent(selectedProject)}&category=${encodeURIComponent(selectedCategory)}&view=categories`}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  currentView === "categories"
                ? "bg-white text-blue-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Báo cáo danh mục
              </Link>
            </div>

            <ExportCsvButton
              filename={`so-quy-tai-chinh-${selectedYear}-${selectedMonth}`}
              headers={csvHeaders}
              rows={csvRows}
            />
          </div>

          {/* Unified Compact Filter Toolbar */}
          <form
            action="/finance"
            method="GET"
            className="mt-4 flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100"
          >
            <input type="hidden" name="view" value={currentView} />

            <input
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="Tìm mã, nội dung, ghi chú..."
              className="w-48 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {/* Type Selector */}
            <select
              name="type"
              defaultValue={selectedType}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500"
            >
              <option value="all">Tất cả loại giao dịch</option>
              <option value="income">🟢 Khoản thu</option>
              <option value="expense">🔴 Khoản chi</option>
            </select>

            {/* Year Selector */}
            <select
              name="year"
              defaultValue={selectedYear}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500"
            >
              <option value="all">Tất cả các năm</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            {/* Month Selector */}
            <select
              name="month"
              defaultValue={selectedMonth}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500"
            >
              <option value="all">Tất cả các tháng</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Tháng {i + 1}
                </option>
              ))}
            </select>

            {/* Category Selector */}
            <select
              name="category"
              defaultValue={selectedCategory}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 max-w-[160px]"
            >
              <option value="all">Tất cả danh mục</option>
              {allCategoriesList.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category}
                </option>
              ))}
            </select>

            {/* Project Selector */}
            <select
              name="project"
              defaultValue={selectedProject}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 max-w-[180px]"
            >
              <option value="all">Tất cả dự án</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_code} - {project.project_name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 px-4 py-2 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              🔍 Lọc
            </button>

            {hasFilters && (
              <Link
                href={`/finance?view=${currentView}`}
                className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-50 shadow-2xs"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {/* 3. Render Mode View */}
        {currentView === "monthly" ? (
          /* View 2: Monthly 12-Month Matrix Breakdown */
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bảng tổng hợp dòng tiền 12 Tháng - Năm {targetYear}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                So sánh doanh thu, chi phí và lợi nhuận ròng qua từng tháng trong năm {targetYear}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Tháng</th>
                    <th className="px-5 py-3.5 text-right text-emerald-700">Tổng thu</th>
                    <th className="px-5 py-3.5 text-right text-red-700">Tổng chi</th>
                    <th className="px-5 py-3.5 text-right">Lợi nhuận ròng</th>
                    <th className="px-5 py-3.5 text-center">Giao dịch</th>
                    <th className="px-5 py-3.5">Trực quan Thu/Chi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {monthlyData.map((m) => {
                    const totalMonthFlow = m.income + m.expense;
                    const incomeRatio = totalMonthFlow > 0 ? Math.round((m.income / totalMonthFlow) * 100) : 50;

                    return (
                      <tr key={m.month} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          <Link
                            href={`/finance?year=${targetYear}&month=${m.month}&view=ledger`}
                            className="text-blue-600 hover:underline"
                          >
                            {m.monthLabel}
                          </Link>
                        </td>

                        <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                          {formatCurrency(m.income)}
                        </td>

                        <td className="px-5 py-3.5 text-right font-bold text-red-700">
                          {formatCurrency(m.expense)}
                        </td>

                        <td className={`px-5 py-3.5 text-right font-bold ${m.profit >= 0 ? "text-blue-700" : "text-red-600"}`}>
                          {formatCurrency(m.profit)}
                        </td>

                        <td className="px-5 py-3.5 text-center font-semibold text-slate-600">
                          {m.count} GD
                        </td>

                        <td className="px-5 py-3.5">
                          {totalMonthFlow === 0 ? (
                            <span className="text-slate-300 italic text-[11px]">Không có phát sinh</span>
                          ) : (
                            <div className="w-36">
                              <div className="h-2 w-full rounded-full bg-red-400 overflow-hidden flex">
                                <div
                                  className="h-full bg-emerald-500 transition-all"
                                  style={{ width: `${incomeRatio}%` }}
                                  title={`Thu: ${incomeRatio}% | Chi: ${100 - incomeRatio}%`}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                <span className="text-emerald-600 font-semibold">{incomeRatio}% Thu</span>
                                <span className="text-red-500 font-semibold">{100 - incomeRatio}% Chi</span>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-sm">
                    <td className="px-5 py-4 uppercase text-slate-900">Tổng cả năm {targetYear}:</td>
                    <td className="px-5 py-4 text-right text-emerald-700 font-black">
                      {formatCurrency(monthlyData.reduce((s, m) => s + m.income, 0))}
                    </td>
                    <td className="px-5 py-4 text-right text-red-700 font-black">
                      {formatCurrency(monthlyData.reduce((s, m) => s + m.expense, 0))}
                    </td>
                    <td className="px-5 py-4 text-right text-blue-700 font-black">
                      {formatCurrency(monthlyData.reduce((s, m) => s + m.profit, 0))}
                    </td>
                    <td className="px-5 py-4 text-center text-slate-800">
                      {monthlyData.reduce((s, m) => s + m.count, 0)} GD
                    </td>
                    <td className="px-5 py-4" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : currentView === "categories" ? (
          /* View 3: Category Structure Breakdown */
          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Phân loại & Cơ cấu Danh mục Thu - Chi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bảng phân tích tỷ trọng các khoản thu và nhóm chi phí theo danh mục
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Income Categories */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-3 mb-4">
                  <h4 className="text-sm font-bold uppercase text-emerald-800 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Cơ cấu nguồn thu ({formatCurrency(totalIncome)})
                  </h4>
                  <span className="text-xs font-bold text-emerald-700">{incomeCategories.length} danh mục</span>
                </div>

                {incomeCategories.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Chưa có khoản thu nào.</p>
                ) : (
                  <div className="space-y-3.5">
                    {incomeCategories.map((item) => (
                      <div key={item.category} className="rounded-xl bg-white p-3.5 border border-emerald-100 shadow-xs">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{item.category}</span>
                          <span className="font-black text-emerald-700">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-10 text-right">{item.percent}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expense Categories */}
              <div className="rounded-2xl border border-red-200 bg-red-50/30 p-5">
                <div className="flex items-center justify-between border-b border-red-200 pb-3 mb-4">
                  <h4 className="text-sm font-bold uppercase text-red-800 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    Cơ cấu chi phí ({formatCurrency(totalExpense)})
                  </h4>
                  <span className="text-xs font-bold text-red-700">{expenseCategories.length} danh mục</span>
                </div>

                {expenseCategories.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Chưa có khoản chi nào.</p>
                ) : (
                  <div className="space-y-3.5">
                    {expenseCategories.map((item) => (
                      <div key={item.category} className="rounded-xl bg-white p-3.5 border border-red-100 shadow-xs">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{item.category}</span>
                          <span className="font-black text-red-700">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-10 text-right">{item.percent}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* View 1: Default Transaction Ledger Table */
          <>
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
                  className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  + Tạo giao dịch mới
                </Link>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[1200px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Mã GD</th>
                      <th className="px-5 py-4">Ngày GD</th>
                      <th className="px-5 py-4">Loại</th>
                      <th className="px-5 py-4">Danh mục & Nội dung</th>
                      <th className="px-5 py-4">Dự án</th>
                      <th className="px-5 py-4">Khách hàng</th>
                      <th className="px-5 py-4">Phương thức</th>
                      <th className="px-5 py-4 text-right">Số tiền</th>
                      <th className="px-5 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {transactions.map((transaction) => {
                      const type = transaction.transaction_type as TransactionType;

                      return (
                        <tr
                          key={transaction.id}
                          className="bg-white transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4 text-sm font-bold text-blue-600">
                            {transaction.transaction_code}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {formatDate(transaction.transaction_date)}
                          </td>

                          <td className="px-5 py-4">
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

                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-900">
                              {transaction.category}
                            </p>

                            {transaction.description && (
                              <p className="mt-0.5 max-w-[240px] truncate text-xs text-slate-500">
                                {transaction.description}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {transaction.projects ? (
                              <Link
                                href={`/projects/${transaction.projects.id}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                              >
                                {transaction.projects.project_name}
                                <span className="block text-xs font-normal text-slate-500">
                                  {transaction.projects.project_code}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Không gắn dự án
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {transaction.customers ? (
                              <Link
                                href={`/customers/${transaction.customers.id}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                              >
                                {transaction.customers.full_name}
                                <span className="block text-xs font-normal text-slate-500">
                                  {transaction.customers.customer_code}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Không gắn khách
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs font-medium text-slate-700">
                            {paymentMethodLabels[transaction.payment_method] ??
                              transaction.payment_method}
                          </td>

                          <td
                            className={`px-5 py-4 text-sm font-bold text-right ${
                              type === "income"
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {type === "income" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/finance/${transaction.id}/edit`}
                                className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                              >
                                Sửa
                              </Link>

                              <form
                                action={deleteTransaction.bind(
                                  null,
                                  transaction.id,
                                )}
                              >
                                <DeleteTransactionButton />
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  subtext: string;
  className: string;
};

function SummaryCard({
  label,
  value,
  subtext,
  className,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </p>

      <p className={`mt-2 text-2xl font-bold ${className}`}>
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {subtext}
      </p>
    </div>
  );
}