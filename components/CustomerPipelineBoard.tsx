"use client";

import { useTransition } from "react";
import Link from "next/link";
import { changeCustomerStatus } from "@/app/customers/actions";

type CustomerStatus =
  | "waiting_quote"
  | "waiting_topic"
  | "waiting_close"
  | "in_progress"
  | "done"
  | "cancelled";

export type CustomerItem = {
  id: string;
  customer_code: string;
  full_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  customer_type: string;
  status: string;
  _count: {
    projects: number;
  };
};

const consultingColumns: {
  id: CustomerStatus;
  title: string;
  color: string;
  bgColor: string;
  dotColor: string;
}[] = [
  {
    id: "waiting_quote",
    title: "Chờ báo giá",
    color: "text-amber-700 border-amber-300",
    bgColor: "bg-amber-50/50",
    dotColor: "bg-amber-500",
  },
  {
    id: "waiting_topic",
    title: "Chờ đề tài",
    color: "text-blue-700 border-blue-300",
    bgColor: "bg-blue-50/50",
    dotColor: "bg-blue-500",
  },
  {
    id: "waiting_close",
    title: "Chờ chốt cọc",
    color: "text-purple-700 border-purple-300",
    bgColor: "bg-purple-50/50",
    dotColor: "bg-purple-500",
  },
];

const executingColumns: {
  id: CustomerStatus;
  title: string;
  color: string;
  bgColor: string;
  dotColor: string;
}[] = [
  {
    id: "in_progress",
    title: "Đang thực hiện",
    color: "text-cyan-700 border-cyan-300",
    bgColor: "bg-cyan-50/50",
    dotColor: "bg-cyan-500",
  },
  {
    id: "done",
    title: "Hoàn thành (Done)",
    color: "text-emerald-700 border-emerald-300",
    bgColor: "bg-emerald-50/50",
    dotColor: "bg-emerald-500",
  },
  {
    id: "cancelled",
    title: "Hủy (Cancel)",
    color: "text-red-700 border-red-300",
    bgColor: "bg-red-50/50",
    dotColor: "bg-red-500",
  },
];

const customerTypeLabels: Record<string, string> = {
  individual: "Cá nhân",
  school: "Trường học",
  business: "Doanh nghiệp",
  dealer: "Đại lý",
  other: "Khác",
};

export default function CustomerPipelineBoard({
  customers,
}: {
  customers: CustomerItem[];
}) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (customerId: string, newStatus: CustomerStatus) => {
    startTransition(async () => {
      await changeCustomerStatus(customerId, newStatus);
    });
  };

  const handleQuickConvert = (customerId: string, customerName: string) => {
    const confirmed = window.confirm(
      `Khách hàng "${customerName}" đã chốt cọc! Chuyển sang giai đoạn "Đang thực hiện"?`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      await changeCustomerStatus(customerId, "in_progress");
    });
  };

  const consultingCount = customers.filter((c) =>
    ["waiting_quote", "waiting_topic", "waiting_close"].includes(c.status),
  ).length;

  const executingCount = customers.filter((c) =>
    ["in_progress", "done", "cancelled"].includes(c.status),
  ).length;

  const renderColumn = (col: (typeof consultingColumns)[0], isConsultingPhase: boolean) => {
    const colCustomers = customers.filter((c) => c.status === col.id);

    return (
      <div
        key={col.id}
        className={`flex-1 rounded-2xl border border-slate-200 ${col.bgColor} p-3.5 flex flex-col`}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {col.title}
            </h3>
          </div>

          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-700 shadow-xs border border-slate-200">
            {colCustomers.length}
          </span>
        </div>

        {/* Card List */}
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
          {colCustomers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
              Trống
            </div>
          ) : (
            colCustomers.map((customer) => (
              <div
                key={customer.id}
                className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition"
                  >
                    {customer.full_name}
                  </Link>
                </div>

                <p className="mt-0.5 text-[11px] font-bold text-blue-600">
                  {customer.customer_code} • {customerTypeLabels[customer.customer_type] || customer.customer_type}
                </p>

                {customer.company_name && (
                  <p className="mt-1 text-xs text-slate-600 truncate font-medium">
                    🏢 {customer.company_name}
                  </p>
                )}

                <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                  {customer.phone && <p>📞 {customer.phone}</p>}
                  {customer.email && <p className="truncate">✉️ {customer.email}</p>}
                </div>

                {/* Quick Convert Button for Consulting Phase */}
                {isConsultingPhase && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleQuickConvert(customer.id, customer.full_name)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
                    >
                      🤝 Đã chốt cọc ➔ Bắt đầu
                    </button>
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                    {customer._count.projects} dự án
                  </span>

                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Hồ sơ →
                  </Link>
                </div>

                {/* Quick Move Status Selector */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Chuyển:
                  </span>
                  <select
                    defaultValue={customer.status}
                    disabled={isPending}
                    onChange={(e) =>
                      handleStatusChange(
                        customer.id,
                        e.target.value as CustomerStatus,
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="waiting_quote">Chờ báo giá</option>
                    <option value="waiting_topic">Chờ đề tài</option>
                    <option value="waiting_close">Chờ chốt</option>
                    <option value="in_progress">Đang thực hiện</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancel</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 overflow-x-auto pb-4">
      {/* 1. Phần 1: Quá trình tư vấn & Báo giá */}
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/20 p-4">
        <div className="flex items-center justify-between border-b border-amber-200/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-white text-xs font-black">
              1
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Giai đoạn 1: Quá trình tư vấn & Chờ chốt cọc
              </h2>
              <p className="text-[11px] text-slate-500">
                Các khách hàng đang tìm hiểu, trao đổi đề tài và nhận báo giá
              </p>
            </div>
          </div>

          <span className="rounded-xl bg-amber-500 px-3 py-1 text-xs font-black text-white shadow-xs">
            {consultingCount} khách hàng đang tư vấn
          </span>
        </div>

        <div className="flex gap-4 min-w-[900px]">
          {consultingColumns.map((col) => renderColumn(col, true))}
        </div>
      </div>

      {/* 2. Phần 2: Đã chốt cọc & Đang thực hiện */}
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/20 p-4">
        <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-black">
              2
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Giai đoạn 2: Đã chốt cọc & Triển khai thực hiện
              </h2>
              <p className="text-[11px] text-slate-500">
                Các khách hàng đã chốt hợp đồng, triển khai gia công xưởng và bàn giao
              </p>
            </div>
          </div>

          <span className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-black text-white shadow-xs">
            {executingCount} khách hàng chính thức
          </span>
        </div>

        <div className="flex gap-4 min-w-[900px]">
          {executingColumns.map((col) => renderColumn(col, false))}
        </div>
      </div>
    </div>
  );
}
