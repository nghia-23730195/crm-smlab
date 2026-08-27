"use client";

import { useTransition } from "react";
import Link from "next/link";
import DeadlineBadge from "@/components/DeadlineBadge";
import { getDeadlineInfo } from "@/lib/deadline";
import { changeProjectStatus } from "@/app/projects/actions";

type ProjectStatus =
  | "draft"
  | "planning"
  | "in_progress"
  | "waiting"
  | "completed"
  | "cancelled";

export type ProjectItem = {
  id: string;
  project_code: string;
  project_name: string;
  project_type: string | null;
  status: string;
  due_date: Date | null;
  actual_value: unknown;
  paid_amount: unknown;
  customers: {
    id: string;
    customer_code: string;
    full_name: string;
    company_name: string | null;
  } | null;
  _count: {
    project_items: number;
  };
};

const columns: {
  id: ProjectStatus;
  title: string;
  color: string;
  bgColor: string;
  badgeBg: string;
}[] = [
  {
    id: "draft",
    title: "Nháp",
    color: "text-slate-700 border-slate-300",
    bgColor: "bg-slate-50",
    badgeBg: "bg-slate-200 text-slate-700",
  },
  {
    id: "planning",
    title: "Đang chuẩn bị",
    color: "text-violet-700 border-violet-300",
    bgColor: "bg-violet-50/40",
    badgeBg: "bg-violet-100 text-violet-800",
  },
  {
    id: "in_progress",
    title: "Đang thực hiện",
    color: "text-blue-700 border-blue-300",
    bgColor: "bg-blue-50/40",
    badgeBg: "bg-blue-100 text-blue-800",
  },
  {
    id: "waiting",
    title: "Chờ khách hàng",
    color: "text-amber-800 border-amber-300",
    bgColor: "bg-amber-50/40",
    badgeBg: "bg-amber-100 text-amber-900",
  },
  {
    id: "completed",
    title: "Hoàn thành",
    color: "text-emerald-700 border-emerald-300",
    bgColor: "bg-emerald-50/40",
    badgeBg: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "cancelled",
    title: "Đã hủy",
    color: "text-red-700 border-red-300",
    bgColor: "bg-red-50/40",
    badgeBg: "bg-red-100 text-red-800",
  },
];

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default function ProjectKanbanBoard({
  projects,
}: {
  projects: ProjectItem[];
}) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (projectId: string, newStatus: ProjectStatus) => {
    startTransition(async () => {
      await changeProjectStatus(projectId, newStatus);
    });
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1400px]">
        {columns.map((col) => {
          const colProjects = projects.filter((p) => p.status === col.id);
          const colTotalValue = colProjects.reduce(
            (sum, p) => sum + Number(p.actual_value ?? 0),
            0,
          );

          return (
            <div
              key={col.id}
              className={`flex-1 rounded-2xl border border-slate-200 ${col.bgColor} p-3.5 flex flex-col`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      col.id === "completed"
                        ? "bg-emerald-500"
                        : col.id === "in_progress"
                        ? "bg-blue-500"
                        : col.id === "waiting"
                        ? "bg-amber-500"
                        : col.id === "planning"
                        ? "bg-violet-500"
                        : col.id === "cancelled"
                        ? "bg-red-500"
                        : "bg-slate-400"
                    }`}
                  />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {col.title}
                  </h3>
                </div>

                <span className={`rounded-full px-2 py-0.5 text-xs font-bold shadow-xs ${col.badgeBg}`}>
                  {colProjects.length}
                </span>
              </div>

              {/* Total Column Value */}
              <p className="text-[11px] text-slate-500 font-semibold mb-3">
                Tổng: <span className="text-slate-800 font-bold">{formatCurrency(colTotalValue)}</span>
              </p>

              {/* Card List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                {colProjects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
                    Trống
                  </div>
                ) : (
                  colProjects.map((project) => {
                    const actualVal = Number(project.actual_value ?? 0);
                    const paidVal = Number(project.paid_amount ?? 0);
                    const percentPaid =
                      actualVal > 0
                        ? Math.min(100, Math.round((paidVal / actualVal) * 100))
                        : 0;

                    const customerName =
                      project.customers?.company_name ||
                      project.customers?.full_name ||
                      "Chưa có khách";

                    const deadlineInfo = getDeadlineInfo(project.due_date, project.status);

                    return (
                      <div
                        key={project.id}
                        className={`group rounded-xl border bg-white p-3.5 shadow-xs transition hover:shadow-md ${
                          deadlineInfo.isOverdue
                            ? "border-red-300 ring-1 ring-red-100"
                            : "border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        {/* Project Header */}
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition line-clamp-2"
                          >
                            {project.project_name}
                          </Link>
                        </div>

                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-blue-600">
                            {project.project_code}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            📦 {project._count.project_items} BOM
                          </span>
                        </div>

                        {/* Customer */}
                        <p className="mt-1.5 text-xs text-slate-600 truncate font-medium">
                          👤 {customerName}
                        </p>

                        {/* Deadline Display Badge */}
                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                          <span className="text-slate-400 font-medium">Hạn chót:</span>
                          <DeadlineBadge
                            dueDate={project.due_date}
                            status={project.status}
                          />
                        </div>

                        {/* Financial and Progress */}
                        <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs border border-slate-100">
                          <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                            <span>{formatCurrency(actualVal)}</span>
                            <span className="text-emerald-600">{percentPaid}% đã thu</span>
                          </div>

                          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                        </div>

                        {/* Quick Move Status Selector */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Chuyển:
                          </span>
                          <select
                            defaultValue={project.status}
                            disabled={isPending}
                            onChange={(e) =>
                              handleStatusChange(
                                project.id,
                                e.target.value as ProjectStatus,
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 outline-none focus:border-blue-500"
                          >
                            <option value="draft">Nháp</option>
                            <option value="planning">Đang chuẩn bị</option>
                            <option value="in_progress">Đang thực hiện</option>
                            <option value="waiting">Chờ khách</option>
                            <option value="completed">Hoàn thành</option>
                            <option value="cancelled">Đã hủy</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
