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
        className="group relative w-36 text-left cursor-pointer transition hover:opacity-95 focus:outline-hidden"
      >
        <div className="flex justify-between items-center text-xs font-semibold mb-1 tabular-nums">
          <span
            className={`font-bold transition group-hover:underline ${
              percent >= 100
                ? "text-emerald-700"
                : percent >= 50
                ? "text-blue-700"
                : percent > 0
                ? "text-amber-700"
                : "text-slate-500"
            }`}
          >
            {formatCurrency(currentPaid)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">{percent}%</span>
            <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition">
              ✏️
            </span>
          </div>
        </div>

        {/* Progress bar with color gradient based on percentage */}
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200/80 group-hover:ring-blue-400 transition">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              percent >= 100
                ? "bg-emerald-500"
                : percent >= 50
                ? "bg-blue-600"
                : percent > 0
                ? "bg-amber-500"
                : "bg-slate-300"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </button>

      {/* 2. Quick Payment Adjustment Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                    {projectCode}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Điều chỉnh thanh toán
                  </h3>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600 line-clamp-1">
                  {formatProjectTitle(projectName)}
                  {customerName && ` • Khách: ${customerName}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <span className="text-[11px] font-semibold text-slate-500">
                  Giá trị HĐ
                </span>
                <p className="mt-1 text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
                  {formatCurrency(actualValue)}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <span className="text-[11px] font-semibold text-emerald-800">
                  Đã thu trước đó
                </span>
                <p className="mt-1 text-xs sm:text-sm font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(currentPaid)}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <span className="text-[11px] font-semibold text-amber-800">
                  Còn nợ hiện tại
                </span>
                <p className="mt-1 text-xs sm:text-sm font-bold text-amber-700 tabular-nums">
                  {formatCurrency(Math.max(0, actualValue - currentPaid))}
                </p>
              </div>
            </div>

            {/* Slider & Quick Buttons */}
            <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Thanh trượt điều chỉnh tỷ lệ:
                </label>
                <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-black text-white">
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
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
              />

              {/* Quick Percent Shortcut Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetPercent(100)}
                  className={`rounded-lg py-2 px-1 text-xs font-bold transition ${
                    selectedPercent === 100
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                  }`}
                >
                  ⚡ 100% (Hết nợ)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPercent(50)}
                  className={`rounded-lg py-2 px-1 text-xs font-bold transition ${
                    selectedPercent === 50
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-blue-50 hover:text-blue-800"
                  }`}
                >
                  ⚡ Cọc 50%
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPercent(30)}
                  className={`rounded-lg py-2 px-1 text-xs font-bold transition ${
                    selectedPercent === 30
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-blue-50 hover:text-blue-800"
                  }`}
                >
                  ⚡ Cọc 30%
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPercent(0)}
                  className={`rounded-lg py-2 px-1 text-xs font-bold transition ${
                    selectedPercent === 0
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ⚡ 0% (Chưa thu)
                </button>
              </div>
            </div>

            {/* Custom Input */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700">
                Hoặc nhập chính xác số tiền đã thanh toán (VNĐ):
              </label>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  min="0"
                  max={actualValue * 2}
                  step="50000"
                  value={paidInput}
                  onChange={(e) => setPaidInput(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 shadow-xs focus:border-blue-600 focus:outline-hidden focus:ring-1 focus:ring-blue-600 tabular-nums"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                  VNĐ
                </span>
              </div>

              {/* Real-time Preview Text */}
              <div className="mt-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">
                  {diffFromCurrent > 0 ? (
                    <span className="text-emerald-700">
                      📈 Thu thêm: +{formatCurrency(diffFromCurrent)}
                    </span>
                  ) : diffFromCurrent < 0 ? (
                    <span className="text-amber-700">
                      📉 Giảm bớt: {formatCurrency(diffFromCurrent)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Không thay đổi</span>
                  )}
                </span>

                <span className="text-slate-700">
                  Còn nợ sau khi lưu:{" "}
                  <strong className={remainingAfter > 0 ? "text-amber-700" : "text-emerald-700"}>
                    {formatCurrency(remainingAfter)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Auto sync to Finance Option */}
            {diffFromCurrent > 0 && (
              <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncFinance}
                  onChange={(e) => setSyncFinance(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-md border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold">
                    Tự động tạo phiếu Thu tiền vào Sổ Quỹ (+{formatCurrency(diffFromCurrent)})
                  </span>
                  <p className="text-[11px] text-blue-700/80 mt-0.5">
                    Đồng bộ ngay vào sổ quỹ tài chính doanh thu dự án giúp số liệu không bị lệch.
                  </p>
                </div>
              </label>
            )}

            {errorMsg && (
              <p className="mt-3 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                ⚠️ {errorMsg}
              </p>
            )}

            {/* Actions */}
            <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
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
