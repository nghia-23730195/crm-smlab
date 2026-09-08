"use client";

import { useState } from "react";
import Link from "next/link";

type ProjectOption = {
  id: string;
  project_code: string;
  project_name: string;
};

type CustomerOption = {
  id: string;
  customer_code: string;
  full_name: string;
  company_name: string | null;
};

type TransactionFormProps = {
  nextTransactionCode: string;
  projects: ProjectOption[];
  customers: CustomerOption[];
  initialError?: string;
};

const EXPENSE_CATEGORIES = [
  "Mua linh kiện",
  "Gia công & In 3D",
  "Lương & Công thợ",
  "Gia hạn phần mềm & AI",
  "Vận chuyển & Đi lại",
  "Thuê mặt bằng / VP",
  "Tiếp khách & Hội thảo",
  "Chi phí khác",
];

const INCOME_CATEGORIES = [
  "Cọc dự án",
  "Doanh thu dự án",
  "Thanh toán hợp đồng",
  "Tài trợ / Quỹ dự án",
  "Thu khác",
];

const QUICK_AMOUNTS = [
  { label: "+100k", value: 100000 },
  { label: "+500k", value: 500000 },
  { label: "+1M", value: 1000000 },
  { label: "+2M", value: 2000000 },
  { label: "+5M", value: 5000000 },
  { label: "+10M", value: 10000000 },
];

function formatNumberString(val: string) {
  const digits = val.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
}

function getTodayString() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function TransactionForm({
  nextTransactionCode,
  projects,
  customers,
  initialError,
}: TransactionFormProps) {
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [transactionCode, setTransactionCode] = useState(nextTransactionCode);
  const [category, setCategory] = useState("");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [transactionDate, setTransactionDate] = useState(getTodayString());
  const [projectId, setProjectId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const isExpense = transactionType === "expense";

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberString(e.target.value);
    setAmountDisplay(formatted);
  };

  const handleAddQuickAmount = (val: number) => {
    const currentNum = Number(amountDisplay.replace(/[^\d]/g, "") || 0);
    const nextNum = currentNum + val;
    setAmountDisplay(nextNum.toLocaleString("vi-VN"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawNum = Number(amountDisplay.replace(/[^\d]/g, ""));
    if (!rawNum || rawNum <= 0) {
      setError("Vui lòng nhập số tiền hợp lệ lớn hơn 0.");
      return;
    }

    if (!category.trim()) {
      setError("Vui lòng nhập hoặc chọn danh mục.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_code: transactionCode.trim(),
          transaction_type: transactionType,
          category: category.trim(),
          amount: String(rawNum),
          payment_method: paymentMethod,
          transaction_date: transactionDate,
          project_id: projectId || "",
          customer_id: customerId || "",
          description: description.trim(),
          attachment_url: attachmentUrl.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi lưu giao dịch.");
      }

      window.location.href = "/finance?success=created";
    } catch (err: unknown) {
      console.error("Submit transaction error:", err);
      setError(
        err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu giao dịch.",
      );
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs"
    >
      {/* Form Header */}
      <div className="border-b border-slate-100 pb-5 mb-6">
        <h2 className="text-lg font-bold text-slate-900">
          Ghi nhận phiếu thu / chi vào sổ quỹ
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Hệ thống sẽ tự động cập nhật số dư quỹ, dòng tiền và phân tích chi phí tức thì.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 flex items-start gap-2 animate-in fade-in">
          <span className="text-base leading-none">⚠️</span>
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Type Toggle Tabs */}
      <div className="mb-6">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
          Loại giao dịch <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => setTransactionType("expense")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold transition border cursor-pointer ${
              isExpense
                ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-100 shadow-2xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            🔴 Khoản chi (Tiền ra)
          </button>

          <button
            type="button"
            onClick={() => setTransactionType("income")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold transition border cursor-pointer ${
              !isExpense
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-100 shadow-2xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            🟢 Khoản thu (Tiền vào)
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Transaction Code */}
        <div>
          <label
            htmlFor="transaction_code"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Mã giao dịch (Tự động cấp) <span className="text-red-500">*</span>
          </label>
          <input
            id="transaction_code"
            name="transaction_code"
            type="text"
            value={transactionCode}
            onChange={(e) => setTransactionCode(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-50"
            placeholder="Ví dụ: GD-001"
          />
        </div>

        {/* Amount Input */}
        <div>
          <label
            htmlFor="amount"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            {isExpense ? "Số tiền chi (VNĐ)" : "Số tiền thu (VNĐ)"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="amount"
              name="amount"
              type="text"
              inputMode="numeric"
              value={amountDisplay}
              onChange={handleAmountChange}
              required
              placeholder="Ví dụ: 500.000"
              className={`w-full rounded-xl border px-3.5 py-2.5 pr-14 text-sm font-bold outline-none transition focus:ring-2 ${
                isExpense
                  ? "border-rose-200 bg-rose-50/20 text-rose-700 focus:border-rose-400 focus:ring-rose-50"
                  : "border-emerald-200 bg-emerald-50/20 text-emerald-700 focus:border-emerald-400 focus:ring-emerald-50"
              }`}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              VNĐ
            </span>
          </div>

          {/* Quick amount chips */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">Cộng nhanh:</span>
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => handleAddQuickAmount(q.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 hover:border-slate-300 active:scale-95 cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>

          <p className="mt-1.5 text-[11px] text-slate-400">
            {isExpense
              ? "💡 Hệ thống tự động trừ quỹ đối với khoản chi, vui lòng nhập số tiền dương."
              : "💡 Hệ thống tự động cộng vào quỹ đối với khoản thu."}
          </p>
        </div>

        {/* Category with Quick Chips */}
        <div className="md:col-span-2">
          <label
            htmlFor="category"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Danh mục {isExpense ? "chi phí" : "nguồn thu"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            placeholder={
              isExpense
                ? "Ví dụ: Mua linh kiện, Gia công 3D, Lương công thợ..."
                : "Ví dụ: Cọc dự án, Doanh thu dự án, Thanh toán hợp đồng..."
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
          />

          {/* Category Suggestions */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">
              Gợi ý danh mục:
            </span>
            {(isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                  category === cat
                    ? isExpense
                      ? "border-rose-400 bg-rose-50 text-rose-700 font-bold"
                      : "border-emerald-400 bg-emerald-50 text-emerald-700 font-bold"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label
            htmlFor="payment_method"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Phương thức thanh toán <span className="text-red-500">*</span>
          </label>
          <select
            id="payment_method"
            name="payment_method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
          >
            <option value="cash">Tiền mặt</option>
            <option value="bank_transfer">Chuyển khoản</option>
            <option value="card">Thẻ</option>
            <option value="e_wallet">Ví điện tử</option>
            <option value="other">Khác</option>
          </select>
        </div>

        {/* Transaction Date */}
        <div>
          <label
            htmlFor="transaction_date"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Ngày giao dịch <span className="text-red-500">*</span>
          </label>
          <input
            id="transaction_date"
            name="transaction_date"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
          />
        </div>

        {/* Project Link */}
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
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
          >
            <option value="">-- Không gắn với dự án --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code} - {p.project_name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">
            {isExpense
              ? "Gắn chi phí vào dự án để tính giá vốn và lợi nhuận ròng của dự án."
              : "Gắn doanh thu thu được từ dự án."}
          </p>
        </div>

        {/* Customer / Vendor Link */}
        <div>
          <label
            htmlFor="customer_id"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            {isExpense
              ? "Đối tác / Nhà cung cấp / Người nhận chi"
              : "Khách hàng liên kết"}
          </label>
          <select
            id="customer_id"
            name="customer_id"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
          >
            <option value="">
              {isExpense
                ? "-- Không gắn đối tác / người nhận --"
                : "-- Không gắn với khách hàng --"}
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_code} - {c.full_name}
                {c.company_name ? ` (${c.company_name})` : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">
            {isExpense
              ? "Có thể chọn bất kỳ đối tác/nhà cung cấp nào nhận khoản chi."
              : "Khách hàng thanh toán tiền cho công ty."}
          </p>
        </div>

        {/* Attachment URL */}
        <div className="md:col-span-2">
          <label
            htmlFor="attachment_url"
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Đường dẫn chứng từ / Hóa đơn (Không bắt buộc)
          </label>
          <input
            id="attachment_url"
            name="attachment_url"
            type="url"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="https://drive.google.com/... hoặc đường link ảnh chứng từ"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
          />
        </div>
      </div>

      {/* Description */}
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
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            isExpense
              ? "Chi tiết mục đích chi, mua những gì, số lượng hoặc ghi chú hóa đơn..."
              : "Chi tiết nội dung thu tiền, đợt thanh toán..."
          }
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/finance"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer"
        >
          Hủy
        </Link>

        <button
          type="submit"
          disabled={loading}
          className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-6 py-2.5 text-xs font-bold text-white transition active:scale-95 shadow-2xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
            isExpense
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {loading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Đang ghi sổ quỹ...</span>
            </>
          ) : (
            <span>
              {isExpense ? "+ Ghi nhận khoản chi" : "+ Ghi nhận khoản thu"}
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
