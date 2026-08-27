"use client";

import { useTransition } from "react";
import { changeProjectStatus } from "@/app/projects/actions";

type ProjectStatus =
  | "draft"
  | "planning"
  | "in_progress"
  | "waiting"
  | "completed"
  | "cancelled";

const statusLabels: Record<ProjectStatus, string> = {
  draft: "Nháp",
  planning: "Đang chuẩn bị",
  in_progress: "Đang thực hiện",
  waiting: "Chờ khách hàng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const statusClasses: Record<ProjectStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200",
  planning: "bg-violet-100 text-violet-800 border-violet-300 hover:bg-violet-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200",
  waiting: "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
};

export default function ProjectStatusSelect({
  projectId,
  currentStatus,
}: {
  projectId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: ProjectStatus) => {
    if (newStatus === currentStatus) return;

    startTransition(async () => {
      await changeProjectStatus(projectId, newStatus);
    });
  };

  const status = (currentStatus in statusLabels ? currentStatus : "draft") as ProjectStatus;

  return (
    <div className="relative inline-block">
      <select
        value={status}
        disabled={isPending}
        onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
        className={`cursor-pointer appearance-none rounded-full border py-1 pl-3 pr-7 text-xs font-bold transition outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${
          statusClasses[status]
        }`}
        title="Nhấp để thay đổi trạng thái dự án"
      >
        <option value="draft" className="bg-white text-slate-800 font-medium">
          Nháp
        </option>
        <option value="planning" className="bg-white text-violet-800 font-medium">
          Đang chuẩn bị
        </option>
        <option value="in_progress" className="bg-white text-blue-800 font-medium">
          Đang thực hiện
        </option>
        <option value="waiting" className="bg-white text-amber-800 font-medium">
          Chờ khách hàng
        </option>
        <option value="completed" className="bg-white text-emerald-800 font-medium">
          Hoàn thành
        </option>
        <option value="cancelled" className="bg-white text-red-800 font-medium">
          Đã hủy
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
