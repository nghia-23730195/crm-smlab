"use client";

import { useTransition } from "react";
import { changeCustomerStatus } from "@/app/customers/actions";

type ConvertCustomerButtonProps = {
  customerId: string;
  customerName: string;
};

export default function ConvertCustomerButton({
  customerId,
  customerName,
}: ConvertCustomerButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleConvert = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      `Xác nhận khách hàng "${customerName}" đã chốt cọc và chuyển sang giai đoạn "Đang thực hiện"?`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      await changeCustomerStatus(customerId, "in_progress");
    });
  };

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleConvert}
      title="Chốt cọc và chuyển sang Đang thực hiện"
      className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-600 hover:text-white active:scale-95 disabled:opacity-50"
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span>{isPending ? "Đang chuyển..." : "Chốt cọc"}</span>
    </button>
  );
}
