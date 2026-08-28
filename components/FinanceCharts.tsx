"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/formatters";

type MonthlyItem = {
  month: number;
  monthLabel: string;
  income: number;
  expense: number;
  profit: number;
  count: number;
};

type CategoryItem = {
  category: string;
  amount: number;
  percent: number;
};

type FinanceChartsProps = {
  monthlyData: MonthlyItem[];
  incomeCategories: CategoryItem[];
  expenseCategories: CategoryItem[];
  totalIncome: number;
  totalExpense: number;
  profit: number;
  targetYear: number | string;
};

const PALETTE = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#f97316", // orange
  "#64748b", // slate
];

export default function FinanceCharts({
  monthlyData,
  incomeCategories,
  expenseCategories,
  totalIncome,
  totalExpense,
  profit,
  targetYear,
}: FinanceChartsProps) {
  const [activeTab, setActiveTab] = useState<"cashflow" | "categories">("cashflow");
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyItem | null>(null);
  const [activeCategoryType, setActiveCategoryType] = useState<"income" | "expense">("income");

  // Calculate max value for chart scaling
  const maxMonthly = Math.max(
    ...monthlyData.map((m) => Math.max(m.income, m.expense)),
    10000000 // min fallback 10tr
  );

  const profitMargin =
    totalIncome > 0 ? Math.round((profit / totalIncome) * 100) : 0;
  const activeCategories =
    activeCategoryType === "income" ? incomeCategories : expenseCategories;
  const activeTotal = activeCategoryType === "income" ? totalIncome : totalExpense;

  // Active months with activity
  const activeMonthsCount = monthlyData.filter((m) => m.income > 0 || m.expense > 0).length;
  const avgMonthlyIncome =
    activeMonthsCount > 0 ? Math.round(totalIncome / activeMonthsCount) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      {/* Chart Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-sm">
              📊
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Trực quan hóa Dòng tiền & Cơ cấu Tài chính
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
              {targetYear === "all" ? "Toàn bộ các năm" : `Năm ${targetYear}`}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Biểu đồ trực quan thu chi 12 tháng, xu hướng lợi nhuận và phân bổ danh mục
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100/90 p-1 border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab("cashflow")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              activeTab === "cashflow"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📈 Dòng tiền 12 tháng
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              activeTab === "categories"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🍩 Cơ cấu danh mục
          </button>
        </div>
      </div>

      {/* VIEW 1: 12-Month Dual Bar & Cash Flow Chart */}
      {activeTab === "cashflow" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Tổng doanh thu
              </span>
              <p className="text-base font-black text-emerald-700 mt-0.5">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                Tổng chi phí
              </span>
              <p className="text-base font-black text-rose-700 mt-0.5">
                {formatCurrency(totalExpense)}
              </p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                Lợi nhuận ròng
              </span>
              <p
                className={`text-base font-black mt-0.5 ${
                  profit >= 0 ? "text-blue-700" : "text-rose-700"
                }`}
              >
                {formatCurrency(profit)}
              </p>
            </div>
            <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
                Tỷ suất lợi nhuận
              </span>
              <p className="text-base font-black text-purple-700 mt-0.5">
                {profitMargin}%
              </p>
            </div>
          </div>

          {/* Dual Bar Chart Area */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:p-6">
            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-emerald-500 shadow-2xs" />
                  <span className="text-slate-700">Khoản thu (Doanh thu)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-rose-400 shadow-2xs" />
                  <span className="text-slate-700">Khoản chi (Chi phí)</span>
                </div>
              </div>

              {/* Hover details badge */}
              {hoveredMonth ? (
                <div className="rounded-lg bg-white border border-slate-200 px-3 py-1 text-xs shadow-2xs flex items-center gap-3">
                  <span className="font-bold text-slate-800">
                    Tháng {hoveredMonth.month}:
                  </span>
                  <span className="font-semibold text-emerald-600">
                    Thu: {formatCurrency(hoveredMonth.income)}
                  </span>
                  <span className="font-semibold text-rose-600">
                    Chi: {formatCurrency(hoveredMonth.expense)}
                  </span>
                  <span
                    className={`font-bold ${
                      hoveredMonth.profit >= 0 ? "text-blue-600" : "text-rose-600"
                    }`}
                  >
                    LN: {formatCurrency(hoveredMonth.profit)}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  Rê chuột vào cột để xem chi tiết tháng
                </span>
              )}
            </div>

            {/* Bars Canvas */}
            <div className="relative h-64 w-full flex items-end justify-between gap-1 sm:gap-2 pt-6 pb-2 border-b border-slate-200">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
              </div>

              {monthlyData.map((m) => {
                const incomePercent =
                  maxMonthly > 0 ? (m.income / maxMonthly) * 100 : 0;
                const expensePercent =
                  maxMonthly > 0 ? (m.expense / maxMonthly) * 100 : 0;
                const hasData = m.income > 0 || m.expense > 0;

                return (
                  <div
                    key={m.month}
                    onMouseEnter={() => setHoveredMonth(m)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    {/* Profit Tag on Top */}
                    {hasData && (
                      <div className="absolute -top-5 opacity-0 group-hover:opacity-100 transition whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-white z-10 shadow-sm pointer-events-none">
                        {m.profit >= 0 ? "+" : ""}
                        {Math.round(m.profit / 1000000)}tr
                      </div>
                    )}

                    {/* Dual Column Bars */}
                    <div className="w-full flex items-end justify-center gap-1 h-full px-0.5">
                      {/* Income Bar */}
                      <div
                        className="w-1/2 max-w-[24px] rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-300 group-hover:brightness-110 shadow-2xs relative"
                        style={{ height: `${Math.max(incomePercent, m.income > 0 ? 6 : 0)}%` }}
                      >
                        {m.income > 0 && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition text-[9px] font-bold text-emerald-700 whitespace-nowrap">
                            {Math.round(m.income / 1000000)}M
                          </div>
                        )}
                      </div>

                      {/* Expense Bar */}
                      <div
                        className="w-1/2 max-w-[24px] rounded-t-md bg-gradient-to-t from-rose-400 to-rose-300 transition-all duration-300 group-hover:brightness-110 shadow-2xs relative"
                        style={{ height: `${Math.max(expensePercent, m.expense > 0 ? 6 : 0)}%` }}
                      >
                        {m.expense > 0 && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition text-[9px] font-bold text-rose-700 whitespace-nowrap">
                            {Math.round(m.expense / 1000000)}M
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Month Label */}
                    <span
                      className={`text-[11px] mt-2 font-medium transition ${
                        hasData
                          ? "text-slate-800 font-bold group-hover:text-blue-600"
                          : "text-slate-400"
                      }`}
                    >
                      T{m.month}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom summary footnote */}
            <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-500">
              <span>
                Doanh thu trung bình các tháng hoạt động:{" "}
                <strong className="text-slate-800">
                  {formatCurrency(avgMonthlyIncome)} / tháng
                </strong>
              </span>
              <span>
                Tháng cao nhất:{" "}
                <strong className="text-emerald-700">
                  {formatCurrency(maxMonthly)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Category Structure Breakdown & Donut Distribution */}
      {activeTab === "categories" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Category Type Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCategoryType("income")}
                className={`rounded-xl px-4 py-2 text-xs font-bold border transition cursor-pointer ${
                  activeCategoryType === "income"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                🟢 Cơ cấu Nguồn thu ({incomeCategories.length} danh mục)
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryType("expense")}
                className={`rounded-xl px-4 py-2 text-xs font-bold border transition cursor-pointer ${
                  activeCategoryType === "expense"
                    ? "bg-rose-50 text-rose-800 border-rose-300 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                🔴 Cơ cấu Chi phí ({expenseCategories.length} danh mục)
              </button>
            </div>

            <span className="text-xs font-bold text-slate-700">
              Tổng {activeCategoryType === "income" ? "thu" : "chi"}:{" "}
              <span className={activeCategoryType === "income" ? "text-emerald-700" : "text-rose-700"}>
                {formatCurrency(activeTotal)}
              </span>
            </span>
          </div>

          {activeCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-xs text-slate-400">
              Chưa có dữ liệu danh mục cho mục này.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              {/* SVG Donut Chart Visualizer */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
                <div className="relative h-56 w-56">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    {/* Base circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="18"
                    />
                    {/* SVG slices */}
                    {(() => {
                      let accumulatedPercent = 0;
                      return activeCategories.map((item, idx) => {
                        const strokeDasharray = `${item.percent * 2.387} 238.7`;
                        const strokeDashoffset = `-${accumulatedPercent * 2.387}`;
                        accumulatedPercent += item.percent;
                        const color = PALETTE[idx % PALETTE.length];

                        return (
                          <circle
                            key={item.category}
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke={color}
                            strokeWidth="18"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                          />
                        );
                      });
                    })()}
                  </svg>

                  {/* Donut Center Info */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {activeCategoryType === "income" ? "Doanh thu" : "Chi phí"}
                    </span>
                    <span className="text-sm font-black text-slate-900 mt-0.5">
                      {activeCategories.length} nhóm
                    </span>
                    <span className="text-[10px] font-bold text-blue-600">
                      100% tỷ trọng
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Breakdown Progress Bars & Legends */}
              <div className="lg:col-span-7 space-y-3">
                {activeCategories.map((item, idx) => {
                  const color = PALETTE[idx % PALETTE.length];

                  return (
                    <div
                      key={item.category}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition hover:bg-slate-50 hover:border-slate-200"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-xs shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-bold text-slate-800 line-clamp-1">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">
                            {formatCurrency(item.amount)}
                          </span>
                          <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-black text-slate-700 min-w-11 text-right">
                            {item.percent}%
                          </span>
                        </div>
                      </div>

                      {/* Percentage Bar */}
                      <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percent}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}