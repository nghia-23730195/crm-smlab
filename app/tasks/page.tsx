import Link from "next/link";
import ExportCsvButton from "@/components/ExportCsvButton";
import TaskStatusDropdown from "@/components/TaskStatusDropdown";
import DeleteTaskButton from "@/components/DeleteTaskButton";
import TaskKanbanBoard, { TaskItem } from "@/components/TaskKanbanBoard";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TasksPageProps = {
  searchParams: Promise<{
    q?: string;
    view?: string;
    status?: string;
    priority?: string;
    assigned_to?: string;
    project_id?: string;
    timeline?: string;
    success?: string;
    error?: string;
  }>;
};

const PRIORITY_CONFIG: Record<string, { label: string; class: string }> = {
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

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;
  const params = await searchParams;

  const keyword = (params.q ?? "").trim();
  const currentView = params.view === "table" ? "table" : "kanban";
  const selectedStatus = params.status ?? "all";
  const selectedPriority = params.priority ?? "all";
  const selectedAssignee = params.assigned_to ?? "all";
  const selectedProject = params.project_id ?? "all";
  const selectedTimeline = params.timeline ?? "all";

  // Fetch all tasks for organization
  const allTasks = await prisma.tasks.findMany({
    where: {
      organization_id: organizationId,
    },
    include: {
      projects: {
        select: {
          id: true,
          project_name: true,
          project_code: true,
        },
      },
      profiles_tasks_assigned_toToprofiles: {
        select: {
          id: true,
          full_name: true,
        },
      },
    },
    orderBy: [{ due_date: "asc" }, { created_at: "desc" }],
  });

  // Fetch projects and profiles for dropdown filters
  const [projects, profiles] = await Promise.all([
    prisma.projects.findMany({
      where: { organization_id: organizationId },
      select: { id: true, project_name: true, project_code: true },
      orderBy: { project_name: "asc" },
    }),
    prisma.profiles.findMany({
      where: { organization_id: organizationId },
      select: { id: true, full_name: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  // Filter tasks
  const filteredTasks = allTasks.filter((task) => {
    if (keyword) {
      const lower = keyword.toLowerCase();
      const matchCode = task.task_code.toLowerCase().includes(lower);
      const matchTitle = task.title.toLowerCase().includes(lower);
      const matchDesc = (task.description ?? "").toLowerCase().includes(lower);
      const matchAssignee = (
        task.profiles_tasks_assigned_toToprofiles?.full_name ||
        task.assignee_name ||
        ""
      )
        .toLowerCase()
        .includes(lower);
      const matchProject = (task.projects?.project_name ?? "").toLowerCase().includes(lower);

      if (!matchCode && !matchTitle && !matchDesc && !matchAssignee && !matchProject) {
        return false;
      }
    }

    if (selectedStatus !== "all" && task.status !== selectedStatus) {
      return false;
    }

    if (selectedPriority !== "all" && task.priority !== selectedPriority) {
      return false;
    }

    if (selectedAssignee !== "all" && task.assigned_to !== selectedAssignee) {
      return false;
    }

    if (selectedProject !== "all" && task.project_id !== selectedProject) {
      return false;
    }

    if (selectedTimeline !== "all") {
      if (!task.due_date) return false;
      const due = new Date(task.due_date);
      due.setHours(0, 0, 0, 0);

      if (selectedTimeline === "overdue") {
        if (task.status === "completed" || due >= today) return false;
      } else if (selectedTimeline === "today") {
        if (due.getTime() !== today.getTime()) return false;
      } else if (selectedTimeline === "this_week") {
        if (due < today || due > endOfWeek) return false;
      }
    }

    return true;
  });

  // Calculate Metrics on all tasks
  const totalCount = allTasks.length;
  const inProgressCount = allTasks.filter((t) => t.status === "in_progress").length;
  const completedCount = allTasks.filter((t) => t.status === "completed").length;
  const overdueCount = allTasks.filter((t) => {
    if (t.status === "completed" || !t.due_date) return false;
    const due = new Date(t.due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  const hasFilters =
    keyword.length > 0 ||
    selectedStatus !== "all" ||
    selectedPriority !== "all" ||
    selectedAssignee !== "all" ||
    selectedProject !== "all" ||
    selectedTimeline !== "all";

  // CSV Export Data
  const csvHeaders = [
    "Mã công việc",
    "Tên công việc",
    "Dự án",
    "Người phụ trách",
    "Trạng thái",
    "Mức ưu tiên",
    "Tiến độ (%)",
    "Hạn hoàn thành",
    "Mô tả",
  ];

  const csvRows = filteredTasks.map((t) => [
    t.task_code,
    t.title,
    t.projects?.project_name ?? "",
    t.profiles_tasks_assigned_toToprofiles?.full_name || t.assignee_name || "",
    t.status === "completed"
      ? "Hoàn thành"
      : t.status === "in_progress"
      ? "Đang làm"
      : t.status === "review"
      ? "Chờ duyệt"
      : "Cần làm",
    t.priority === "urgent"
      ? "Khẩn cấp"
      : t.priority === "high"
      ? "Cao"
      : t.priority === "medium"
      ? "Vừa"
      : "Thấp",
    `${t.progress}%`,
    t.due_date
      ? new Date(t.due_date).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "",
    t.description ?? "",
  ]);

  // Format tasks for client kanban board
  const kanbanTasks: TaskItem[] = filteredTasks.map((t) => ({
    id: t.id,
    task_code: t.task_code,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    progress: t.progress,
    start_date: t.start_date ? t.start_date.toISOString() : null,
    due_date: t.due_date ? t.due_date.toISOString() : null,
    project_id: t.project_id,
    project: t.projects,
    assigned_to: t.assigned_to,
    assignee_name: t.assignee_name,
    assignee: t.profiles_tasks_assigned_toToprofiles,
  }));

  return (
    <div className="p-5 md:p-8 space-y-6">
      {/* Notifications */}
      {params.success === "created" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Tạo công việc mới thành công!
        </div>
      )}

      {params.success === "updated" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Cập nhật thông tin công việc thành công!
        </div>
      )}

      {params.success === "deleted" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Đã xóa công việc thành công!
        </div>
      )}

      {params.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {params.error}
        </div>
      )}

      {/* Top Banner Header */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-base shadow-2xs">
                📋
              </span>
              <h1 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-wide">
                BẢNG QUẢN LÝ CÔNG VIỆC NHÂN VIÊN
              </h1>
              <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-xs font-bold text-slate-700">
                {allTasks.length} công việc
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Phân công nhiệm vụ, theo dõi tiến độ công việc và hạn hoàn thành của các thành viên SM-LAB
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* View Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <Link
                href={`/tasks?view=kanban${
                  keyword ? `&q=${encodeURIComponent(keyword)}` : ""
                }${selectedStatus !== "all" ? `&status=${selectedStatus}` : ""}${
                  selectedPriority !== "all" ? `&priority=${selectedPriority}` : ""
                }${
                  selectedAssignee !== "all" ? `&assigned_to=${selectedAssignee}` : ""
                }${
                  selectedProject !== "all" ? `&project_id=${selectedProject}` : ""
                }${
                  selectedTimeline !== "all" ? `&timeline=${selectedTimeline}` : ""
                }`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  currentView === "kanban"
                    ? "bg-white text-blue-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
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
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
                <span>Kanban</span>
              </Link>
              <Link
                href={`/tasks?view=table${
                  keyword ? `&q=${encodeURIComponent(keyword)}` : ""
                }${selectedStatus !== "all" ? `&status=${selectedStatus}` : ""}${
                  selectedPriority !== "all" ? `&priority=${selectedPriority}` : ""
                }${
                  selectedAssignee !== "all" ? `&assigned_to=${selectedAssignee}` : ""
                }${
                  selectedProject !== "all" ? `&project_id=${selectedProject}` : ""
                }${
                  selectedTimeline !== "all" ? `&timeline=${selectedTimeline}` : ""
                }`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  currentView === "table"
                    ? "bg-white text-blue-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
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
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>Danh sách</span>
              </Link>
            </div>

            <ExportCsvButton
              filename="danh-sach-cong-viec-nhan-vien"
              headers={csvHeaders}
              rows={csvRows}
            />

            <Link
              href="/tasks/new"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 px-4 py-2 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              <span>➕</span>
              <span>Thêm công việc mới</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tổng số công việc
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
          <span className="text-[11px] text-slate-400">Tất cả đầu việc</span>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-xs">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
            Đang thực hiện
          </span>
          <p className="text-2xl font-black text-amber-700 mt-1">{inProgressCount}</p>
          <span className="text-[11px] text-amber-600 font-medium">
            Đang xử lý tích cực
          </span>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
            Quá hạn deadline
          </span>
          <p className="text-2xl font-black text-rose-700 mt-1">{overdueCount}</p>
          <span className="text-[11px] text-rose-600 font-medium">
            Cần đẩy nhanh tiến độ
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
            Đã hoàn thành
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{completedCount}</p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}% tổng việc
          </span>
        </div>
      </div>

      {/* Main Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Filter Toolbar */}
        <div className="border-b border-slate-100 p-4 md:p-5">
          <form
            action="/tasks"
            method="GET"
            className="flex flex-wrap items-center gap-2.5"
          >
            <input type="hidden" name="view" value={currentView} />

            {/* Search Input */}
            <div className="min-w-[220px] flex-1">
              <input
                name="q"
                type="text"
                defaultValue={keyword}
                placeholder="Tìm mã CV, tên việc, nhân sự, dự án..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Assignee Filter */}
            <select
              name="assigned_to"
              defaultValue={selectedAssignee}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả nhân sự</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>

            {/* Project Filter */}
            <select
              name="project_id"
              defaultValue={selectedProject}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả dự án</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.project_name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              name="priority"
              defaultValue={selectedPriority}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả ưu tiên</option>
              <option value="urgent">Khẩn cấp</option>
              <option value="high">Cao</option>
              <option value="medium">Vừa</option>
              <option value="low">Thấp</option>
            </select>

            {/* Status Filter */}
            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="todo">Cần làm</option>
              <option value="in_progress">Đang làm</option>
              <option value="review">Chờ duyệt</option>
              <option value="completed">Hoàn thành</option>
            </select>

            {/* Timeline Filter */}
            <select
              name="timeline"
              defaultValue={selectedTimeline}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả thời hạn</option>
              <option value="overdue">Đã quá hạn</option>
              <option value="today">Hôm nay</option>
              <option value="this_week">Trong tuần này</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 cursor-pointer"
            >
              Lọc
            </button>

            {hasFilters && (
              <Link
                href={`/tasks?view=${currentView}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {/* View Rendering */}
        <div className="p-4 md:p-6">
          {currentView === "kanban" ? (
            <TaskKanbanBoard tasks={kanbanTasks} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Mã CV</th>
                    <th className="px-4 py-3">Tên công việc</th>
                    <th className="px-4 py-3">Dự án</th>
                    <th className="px-4 py-3">Người phụ trách</th>
                    <th className="px-4 py-3 text-center">Ưu tiên</th>
                    <th className="px-4 py-3">Hạn hoàn thành</th>
                    <th className="px-4 py-3 w-36">Tiến độ</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-slate-500 font-medium"
                      >
                        Không tìm thấy công việc nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const priorityInfo =
                        PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                      const assigneeName =
                        task.profiles_tasks_assigned_toToprofiles?.full_name ||
                        task.assignee_name ||
                        "Chưa giao";
                      const isAssigned = assigneeName !== "Chưa giao";

                      let isOverdue = false;
                      let formattedDueDate = "Không có";
                      if (task.due_date) {
                        const due = new Date(task.due_date);
                        formattedDueDate = due.toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });
                        due.setHours(0, 0, 0, 0);
                        if (task.status !== "completed" && due < today) {
                          isOverdue = true;
                        }
                      }

                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-slate-50/80 transition group"
                        >
                          {/* Mã CV */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                              {task.task_code}
                            </span>
                          </td>

                          {/* Title */}
                          <td className="px-4 py-3.5 max-w-xs">
                            <Link
                              href={`/tasks/${task.id}/edit`}
                              className="font-bold text-slate-800 hover:text-blue-600 transition block truncate"
                              title={task.title}
                            >
                              {task.title}
                            </Link>
                            {task.description && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-xs">
                                {task.description}
                              </p>
                            )}
                          </td>

                          {/* Project */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {task.projects ? (
                              <Link
                                href={`/projects/${task.projects.id}/edit`}
                                className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 font-medium"
                              >
                                <span className="text-slate-400">📁</span>
                                <span className="truncate max-w-[150px]">
                                  {task.projects.project_name}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-slate-400 italic">
                                Không gán
                              </span>
                            )}
                          </td>

                          {/* Assignee */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  isAssigned
                                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                                    : "bg-slate-100 text-slate-400 border border-slate-200"
                                }`}
                              >
                                {assigneeName.slice(0, 2).toUpperCase()}
                              </div>
                              <span
                                className={`font-medium ${
                                  isAssigned
                                    ? "text-slate-700"
                                    : "text-slate-400 italic"
                                }`}
                              >
                                {assigneeName}
                              </span>
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${priorityInfo.class}`}
                            >
                              {priorityInfo.label}
                            </span>
                          </td>

                          {/* Due date */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {task.due_date ? (
                              <span
                                className={`inline-flex items-center gap-1 font-medium ${
                                  isOverdue
                                    ? "text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                                    : "text-slate-600"
                                }`}
                              >
                                {isOverdue && <span>⚠️</span>}
                                {formattedDueDate}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">
                                Không có
                              </span>
                            )}
                          </td>

                          {/* Progress */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                                <span>{task.progress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
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
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            <TaskStatusDropdown
                              id={task.id}
                              initialStatus={task.status}
                            />
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/tasks/${task.id}/edit`}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                                title="Chỉnh sửa"
                              >
                                <svg
                                  className="h-4 w-4"
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
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
