"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatProjectTitle } from "@/lib/formatters";
import { updateProjectPayment } from "@/app/projects/actions";

type QuickPaymentAdjusterProps = {
  projectId: string;
  projectCode: string;
  projectName: string;
  actualValue: number;
  currentPaid: number;
  customerName?: string;
};

export default function QuickPaymentAdjuster({
  projectId,
  projectCode,
  projectName,
  actualValue,
  currentPaid,
  customerName,
}: QuickPaymentAdjusterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [paidInput, setPaidInput] = useState<number>(currentPaid);
  const [syncFinance, setSyncFinance] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const percent =
    actualValue > 0 ? Math.min(100, Math.round((currentPaid / actualValue) * 100)) : 0;

  const handleOpen = () => {
    setPaidInput(currentPaid);
    setErrorMsg("");
    setIsOpen(true);
  };

  const handleSetPercent = (pct: number) => {
    const val = Math.round((actualValue * pct) / 100);
    setPaidInput(val);
  };

  const handleSave = () => {
    if (paidInput < 0) {
      setErrorMsg("Số tiền không thể âm.");
      return;
    }

    startTransition(async () => {
      try {
        await updateProjectPayment(projectId, paidInput, syncFinance);
        setIsOpen(false);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  };

  const selectedPercent =
    actualValue > 0 ? Math.min(100, Math.round((paidInput / actualValue) * 100)) : 0;
  const remainingAfter = Math.max(0, actualValue - paidInput);
  const diffFromCurrent = paidInput - currentPaid;

  return (
    <>
      {/* 1. Interactive Progress Trigger in Table Cell */}
      <button
        type="button"
        onClick={handleOpen}
        title="Bấm để điều chỉnh tiến độ thanh toán & thu tiền nhanh"
        className="group relative w-36 text-left cursor-pointer transition hover:opacity-90 focus:outline-hidden"
      >
        <div className="flex justify-between items-center text-xs font-semibold mb-1 tabular-nums">
          <span
            className={`font-semibold transition group-hover:underline ${
              percent >= 100
                ? "text-emerald-600"
                : percent >= 50
                ? "text-blue-600"
                : percent > 0
                ? "text-amber-600"
                : "text-slate-500"
            }`}
          >
            {formatCurrency(currentPaid)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">{percent}%</span>
            <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition">
              ✏️
            </span>
          </div>
        </div>

        {/* Progress bar with soft color styling */}
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200/70 group-hover:ring-blue-300 transition">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              percent >= 100
                ? "bg-emerald-500"
                : percent >= 50
                ? "bg-blue-500"
                : percent > 0
                ? "bg-amber-400"
                : "bg-slate-300"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </button>

      {/* 2. Quick Payment Adjustment Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                    {projectCode}
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Điều chỉnh thanh toán
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                  {formatProjectTitle(projectName)}
                  {customerName && ` • Khách: ${customerName}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Financial Overview Cards - Soft, clean, minimal pastel tones */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                <span className="text-[11px] font-medium text-slate-500">
                  Giá trị HĐ
                </span>
                <p className="mt-0.5 text-xs sm:text-[13px] font-semibold text-slate-800 tabular-nums">
                  {formatCurrency(actualValue)}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/30 p-2.5">
                <span className="text-[11px] font-medium text-slate-500">
                  Đã thu trước
                </span>
                <p className="mt-0.5 text-xs sm:text-[13px] font-semibold text-emerald-600 tabular-nums">
                  {formatCurrency(currentPaid)}
                </p>
              </div>

              <div className="rounded-xl border border-amber-100/80 bg-amber-50/30 p-2.5">
                <span className="text-[11px] font-medium text-slate-500">
                  Còn nợ
                </span>
                <p className="mt-0.5 text-xs sm:text-[13px] font-semibold text-amber-600 tabular-nums">
                  {formatCurrency(Math.max(0, actualValue - currentPaid))}
                </p>
              </div>
            </div>

            {/* Slider & Quick Buttons */}
            <div className="mt-4 space-y-3.5 rounded-xl border border-slate-100 bg-slate-50/40 p-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Thanh trượt điều chỉnh:
                </label>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600 border border-blue-100">
                  {selectedPercent}%
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={selectedPercent}
                onChange={(e) => handleSetPercent(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-500"
              />

              {/* Quick Percent Shortcut Buttons - Soft pastel active states */}
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleSetPercent(100)}
                  className={`rounded-lg py-1.5 px-1 font-semibold transition ${
                    selectedPercent === 100
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  ⚡ 100%
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPercent(50)}
                  className={`rounded-lg py-1.5 px-1 font-semibold transition ${
                    selectedPercent === 50
                      ? "bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  ⚡ Cọc 50%
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPercent(30)}
                  className={`rounded-lg py-1.5 px-1 font-semibold transition ${
                    selectedPercent === 30
                      ? "bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  ⚡ Cọc 30%
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPercent(0)}
                  className={`rounded-lg py-1.5 px-1 font-semibold transition ${
                    selectedPercent === 0
                      ? "bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  ⚡ 0%
                </button>
              </div>
            </div>

            {/* Custom Input */}
            <div className="mt-3.5">
              <label className="block text-xs font-semibold text-slate-600">
                Hoặc nhập số tiền thanh toán (VNĐ):
              </label>
              <div className="relative mt-1">
                <input
                  type="number"
                  min="0"
                  max={actualValue * 2}
                  step="50000"
                  value={paidInput}
                  onChange={(e) => setPaidInput(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-2xs focus:border-blue-400 focus:outline-hidden focus:ring-1 focus:ring-blue-400/30 tabular-nums"
                />
                <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">
                  VNĐ
                </span>
              </div>

              {/* Real-time Preview Text */}
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {diffFromCurrent > 0 ? (
                    <span className="text-emerald-600 font-semibold">
                      📈 Thu thêm: +{formatCurrency(diffFromCurrent)}
                    </span>
                  ) : diffFromCurrent < 0 ? (
                    <span className="text-amber-600 font-semibold">
                      📉 Giảm bớt: {formatCurrency(diffFromCurrent)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Không đổi</span>
                  )}
                </span>

                <span className="text-slate-500 font-medium">
                  Còn nợ:{" "}
                  <strong className={remainingAfter > 0 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                    {formatCurrency(remainingAfter)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Auto sync to Finance Option */}
            {diffFromCurrent > 0 && (
              <label className="mt-3.5 flex items-start gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncFinance}
                  onChange={(e) => setSyncFinance(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded-sm border-slate-300 text-blue-500 focus:ring-blue-400"
                />
                <div>
                  <span className="font-semibold text-slate-800">
                    Tự tạo phiếu Thu vào Sổ Quỹ (+{formatCurrency(diffFromCurrent)})
                  </span>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    Đồng bộ tự động vào sổ quỹ tài chính doanh thu dự án.
                  </p>
                </div>
              </label>
            )}

            {errorMsg && (
              <p className="mt-3 text-xs font-semibold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                ⚠️ {errorMsg}
              </p>
            )}

            {/* Actions */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 hover:border-blue-400 px-4.5 py-2 text-xs font-bold transition active:scale-95 shadow-2xs disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  "💾 Lưu thanh toán"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
