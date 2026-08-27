"use client";

import { useTransition } from "react";
import { changeCustomerStatus } from "@/app/customers/actions";

type CustomerStatus =
  | "waiting_quote"
  | "waiting_topic"
  | "waiting_close"
  | "in_progress"
  | "done"
  | "cancelled";

const statusLabels: Record<CustomerStatus, string> = {
  waiting_quote: "Đang chờ báo giá",
  waiting_topic: "Đang chờ đề tài",
  waiting_close: "Đang chờ chốt",
  in_progress: "Đang thực hiện",
  done: "Done",
  cancelled: "Cancel",
};

const statusClasses: Record<CustomerStatus, string> = {
  waiting_quote: "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200",
  waiting_topic: "bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200",
  waiting_close: "bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200",
  in_progress: "bg-cyan-100 text-cyan-900 border-cyan-300 hover:bg-cyan-200",
  done: "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
};

export default function CustomerStatusSelect({
  customerId,
  currentStatus,
}: {
  customerId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: CustomerStatus) => {
    if (newStatus === currentStatus) return;

    startTransition(async () => {
      await changeCustomerStatus(customerId, newStatus);
    });
  };

  const status = (currentStatus in statusLabels ? currentStatus : "waiting_quote") as CustomerStatus;

  return (
    <div className="relative inline-block">
      <select
        value={status}
        disabled={isPending}
        onChange={(e) => handleStatusChange(e.target.value as CustomerStatus)}
        className={`cursor-pointer appearance-none rounded-full border py-1 pl-3 pr-7 text-xs font-bold transition outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${
          statusClasses[status]
        }`}
        title="Nhấp để thay đổi trạng thái khách hàng"
      >
        <option value="waiting_quote" className="bg-white text-amber-900 font-medium">
          Đang chờ báo giá
        </option>
        <option value="waiting_topic" className="bg-white text-blue-900 font-medium">
          Đang chờ đề tài
        </option>
        <option value="waiting_close" className="bg-white text-purple-900 font-medium">
          Đang chờ chốt
        </option>
        <option value="in_progress" className="bg-white text-cyan-900 font-medium">
          Đang thực hiện
        </option>
        <option value="done" className="bg-white text-emerald-800 font-medium">
          Done
        </option>
        <option value="cancelled" className="bg-white text-red-800 font-medium">
          Cancel
        </option>
      </select>

      {/* Down arrow chevron indicator */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        {isPending ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
        ) : (
          <svg
            className="h-3.5 w-3.5 opacity-70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  );
}
