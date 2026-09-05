"use client";

import { useTransition } from "react";
import Link from "next/link";
import TaskStatusDropdown from "@/components/TaskStatusDropdown";
import DeleteTaskButton from "@/components/DeleteTaskButton";
import { changeTaskStatus } from "@/app/tasks/actions";

export type TaskItem = {
  id: string;
  task_code: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  start_date: string | null;
  due_date: string | null;
  project_id: string | null;
  project: {
    id: string;
    project_name: string;
    project_code: string | null;
  } | null;
  assigned_to: string | null;
  assignee_name: string | null;
  assignee: {
    id: string;
    full_name: string;
  } | null;
};

type TaskKanbanBoardProps = {
  tasks: TaskItem[];
};

const COLUMNS = [
  {
    id: "todo",
    title: "Cần làm",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    headerDot: "bg-slate-400",
    bgCol: "bg-slate-50/70 border-slate-200",
  },
  {
    id: "in_progress",
    title: "Đang làm",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    headerDot: "bg-amber-500",
    bgCol: "bg-amber-50/30 border-amber-200/60",
  },
  {
    id: "review",
    title: "Chờ duyệt",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    headerDot: "bg-purple-500",
    bgCol: "bg-purple-50/30 border-purple-200/60",
  },
  {
    id: "completed",
    title: "Hoàn thành",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    headerDot: "bg-emerald-500",
    bgCol: "bg-emerald-50/30 border-emerald-200/60",
  },
];

const PRIORITY_BADGES: Record<string, { label: string; class: string }> = {
  urgent: {
    label: "Khẩn cấp",
    class: "bg-rose-50 text-rose-700 border border-rose-200/80",
  },
  high: {
    label: "Cao",
    class: "bg-orange-50 text-orange-700 border border-orange-200/80",
  },
  medium: {
    label: "Vừa",
    class: "bg-blue-50 text-blue-700 border border-blue-200/80",
  },
  low: {
    label: "Thấp",
    class: "bg-slate-100 text-slate-600 border border-slate-200/80",
  },
};

function getAssigneeName(task: TaskItem): string {
  return task.assignee?.full_name || task.assignee_name || "Chưa giao";
}

function getInitials(name: string): string {
  if (!name || name === "Chưa giao") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function TaskKanbanBoard({ tasks }: TaskKanbanBoardProps) {
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const moveTask = (taskId: string, targetStatus: string) => {
    startTransition(async () => {
      await changeTaskStatus(taskId, targetStatus);
    });
  };

  const getPrevNext = (currentStatus: string) => {
    const order = ["todo", "in_progress", "review", "completed"];
    const idx = order.indexOf(currentStatus);
    return {
      prev: idx > 0 ? order[idx - 1] : null,
      next: idx < order.length - 1 ? order[idx + 1] : null,
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div
            key={col.id}
            className={`flex flex-col rounded-2xl border p-4 shadow-xs transition ${col.bgCol}`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${col.headerDot}`} />
                <h3 className="text-sm font-bold text-slate-800">{col.title}</h3>
              </div>
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${col.badgeColor}`}
              >
                {colTasks.length}
              </span>
            </div>

            {/* Task Card List */}
            <div className="mt-3.5 space-y-3 min-h-[140px]">
              {colTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300/80 p-6 text-center text-xs text-slate-600">
                  <span>Chưa có việc nào</span>
                </div>
              ) : (
                colTasks.map((task) => {
                  const priorityInfo =
                    PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
                  const assigneeName = getAssigneeName(task);
                  const isAssigned = assigneeName !== "Chưa giao";
                  const { prev, next } = getPrevNext(task.status);

                  let isOverdue = false;
                  let formattedDueDate = "";
                  if (task.due_date) {
                    const due = new Date(task.due_date);
                    formattedDueDate = due.toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    });
                    if (task.status !== "completed" && due < now) {
                      isOverdue = true;
                    }
                  }

                  return (
                    <div
                      key={task.id}
                      className="group relative rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:shadow-md transition-all hover:border-blue-300"
                    >
                      {/* Top row: Code + Priority + Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {task.task_code}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${priorityInfo.class}`}
                          >
                            {priorityInfo.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Link
                            href={`/tasks/${task.id}/edit`}
                            title="Chỉnh sửa công việc"
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition cursor-pointer"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </Link>
                          <DeleteTaskButton
                            id={task.id}
                            taskTitle={task.title}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Title & Description */}
                      <Link
                        href={`/tasks/${task.id}/edit`}
                        className="block font-semibold text-sm text-slate-900 hover:text-blue-600 transition line-clamp-2"
                      >
                        {task.title}
                      </Link>

                      {task.description && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Project Tag */}
                      {task.project && (
                        <div className="mt-2.5">
                          <Link
                            href={`/projects/${task.project.id}/edit`}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition"
                          >
                            <svg
                              className="h-3 w-3 shrink-0 text-slate-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                              />
                            </svg>
                            <span className="truncate max-w-[170px]">
                              {task.project.project_name}
                            </span>
                          </Link>
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
                          <span>Tiến độ</span>
                          <span
                            className={`font-semibold ${
                              task.progress === 100
                                ? "text-emerald-600"
                                : "text-blue-600"
                            }`}
                          >
                            {task.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              task.progress === 100
                                ? "bg-emerald-500"
                                : task.progress >= 50
                                ? "bg-blue-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Card Footer: Assignee + Due Date */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        {/* Assignee */}
                        <div
                          className="flex items-center gap-1.5 min-w-0"
                          title={`Người phụ trách: ${assigneeName}`}
                        >
                          <div
                            className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isAssigned
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                            }`}
                          >
                            {getInitials(assigneeName)}
                          </div>
                          <span
                            className={`text-xs truncate ${
                              isAssigned
                                ? "font-medium text-slate-700"
                                : "text-slate-400 italic"
                            }`}
                          >
                            {assigneeName}
                          </span>
                        </div>

                        {/* Due date badge */}
                        {task.due_date ? (
                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 ${
                              isOverdue
                                ? "bg-rose-50 text-rose-700 border border-rose-200/90 font-semibold"
                                : "bg-slate-100 text-slate-600"
                            }`}
                            title={isOverdue ? "Đã quá hạn hoàn thành!" : "Hạn hoàn thành"}
                          >
                            <svg
                              className={`h-3 w-3 ${
                                isOverdue ? "text-rose-600" : "text-slate-400"
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>{formattedDueDate}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Không có hạn</span>
                        )}
                      </div>

                      {/* Status quick mover bar */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <TaskStatusDropdown
                          id={task.id}
                          initialStatus={task.status}
                        />

                        <div className="flex items-center gap-1">
                          {prev && (
                            <button
                              type="button"
                              onClick={() => moveTask(task.id, prev)}
                              disabled={isPending}
                              title="Chuyển về trạng thái trước"
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 19l-7-7 7-7"
                                />
                              </svg>
                            </button>
                          )}
                          {next && (
                            <button
                              type="button"
                              onClick={() => moveTask(task.id, next)}
                              disabled={isPending}
                              title="Chuyển sang trạng thái tiếp theo"
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition cursor-pointer disabled:opacity-50"
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
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
  );
}
