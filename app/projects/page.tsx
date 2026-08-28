import Link from "next/link";

import DeadlineBadge from "@/components/DeadlineBadge";
import DeleteProjectButton from "@/components/DeleteProjectButton";
import ExportCsvButton from "@/components/ExportCsvButton";
import ProjectKanbanBoard from "@/components/ProjectKanbanBoard";
import ProjectStatusSelect from "@/components/ProjectStatusSelect";
import QuickPaymentAdjuster from "@/components/QuickPaymentAdjuster";
import { getDeadlineInfo } from "@/lib/deadline";
import { formatProjectTitle } from "@/lib/formatters";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { deleteProject } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectStatus =
  | "draft"
  | "planning"
  | "in_progress"
  | "waiting"
  | "completed"
  | "cancelled";

type ProjectsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    customer?: string;
    year?: string;
    deadline?: string;
    sort?: string;
    view?: string;
    success?: string;
    error?: string;
  }>;
};

const statusLabels: Record<ProjectStatus, string> = {
  draft: "Nháp",
  planning: "Đang chuẩn bị",
  in_progress: "Đang thực hiện",
  waiting: "Chờ khách hàng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Chưa thiết lập";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(value);
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const params = await searchParams;

  const now = new Date();
  const currentSystemYear = now.getUTCFullYear();

  const keyword = String(params.q ?? "").trim();
  const selectedStatus = String(params.status ?? "all").trim();
  const selectedCustomer = String(params.customer ?? "all").trim();
  const selectedDeadline = String(params.deadline ?? "all").trim();
  const selectedSort = String(params.sort ?? "code_desc").trim();
  const selectedYear = params.year ? String(params.year).trim() : "all";
  const currentView = params.view === "kanban" ? "kanban" : "list";

  const validStatuses: ProjectStatus[] = [
    "draft",
    "planning",
    "in_progress",
    "waiting",
    "completed",
    "cancelled",
  ];

  const statusFilter = validStatuses.includes(
    selectedStatus as ProjectStatus,
  )
    ? (selectedStatus as ProjectStatus)
    : null;

  const yearStart =
    selectedYear !== "all"
      ? new Date(Date.UTC(Number(selectedYear), 0, 1))
      : null;
  const yearEnd =
    selectedYear !== "all"
      ? new Date(Date.UTC(Number(selectedYear) + 1, 0, 1))
      : null;

  const yearFilter =
    selectedYear !== "all" && yearStart && yearEnd
      ? {
          OR: [
            // 1. Hạn hoàn thành thuộc năm được chọn
            {
              due_date: {
                gte: yearStart,
                lt: yearEnd,
              },
            },
            // 2. Không có hạn hoàn thành nhưng ngày bắt đầu thuộc năm được chọn
            {
              due_date: null,
              start_date: {
                gte: yearStart,
                lt: yearEnd,
              },
            },
            // 3. Không có hạn & ngày bắt đầu nhưng ngày hoàn thành thuộc năm được chọn
            {
              due_date: null,
              start_date: null,
              completed_date: {
                gte: yearStart,
                lt: yearEnd,
              },
            },
            // 4. Nếu không có ngày nào thì dùng ngày tạo trong hệ thống
            {
              due_date: null,
              start_date: null,
              completed_date: null,
              created_at: {
                gte: yearStart,
                lt: yearEnd,
              },
            },
          ],
        }
      : {};

  let projectOrderBy: Record<string, "asc" | "desc">[] = [
    { project_code: "desc" },
    { created_at: "desc" },
  ];

  if (selectedSort === "created_desc") {
    projectOrderBy = [{ created_at: "desc" }, { project_code: "desc" }];
  } else if (selectedSort === "created_asc") {
    projectOrderBy = [{ created_at: "asc" }, { project_code: "asc" }];
  } else if (selectedSort === "code_asc") {
    projectOrderBy = [{ project_code: "asc" }];
  } else if (selectedSort === "code_desc") {
    projectOrderBy = [{ project_code: "desc" }];
  } else if (selectedSort === "due_asc") {
    projectOrderBy = [{ due_date: "asc" }, { created_at: "desc" }];
  } else if (selectedSort === "value_desc") {
    projectOrderBy = [{ actual_value: "desc" }, { created_at: "desc" }];
  }

  const [rawProjects, customers, allProjectsSummary] = await Promise.all([
    prisma.projects.findMany({
      where: {
        organization_id: organizationId,
        ...yearFilter,

        ...(keyword
          ? {
              OR: [
                {
                  project_code: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
                {
                  project_name: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
                {
                  project_type: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
                {
                  description: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
                {
                  customers: {
                    is: {
                      OR: [
                        {
                          full_name: {
                            contains: keyword,
                            mode: "insensitive",
                          },
                        },
                        {
                          company_name: {
                            contains: keyword,
                            mode: "insensitive",
                          },
                        },
                        {
                          customer_code: {
                            contains: keyword,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),

        ...(statusFilter
          ? {
              status: statusFilter,
            }
          : {}),

        ...(selectedCustomer !== "all"
          ? {
              customer_id: selectedCustomer,
            }
          : {}),
      },

      include: {
        customers: {
          select: {
            id: true,
            customer_code: true,
            full_name: true,
            company_name: true,
          },
        },

        _count: {
          select: {
            project_items: true,
          },
        },
      },

      orderBy: projectOrderBy,
    }),

    prisma.customers.findMany({
      where: {
        organization_id: organizationId,
      },
      select: {
        id: true,
        customer_code: true,
        full_name: true,
        company_name: true,
      },
      orderBy: {
        full_name: "asc",
      },
    }),

    prisma.projects.findMany({
      where: {
        organization_id: organizationId,
        ...yearFilter,
        status: {
          not: "cancelled",
        },
      },
      select: {
        status: true,
        due_date: true,
        completed_date: true,
        actual_value: true,
        paid_amount: true,
      },
    }),
  ]);

  // Filter projects by deadline if selected
  const projects = rawProjects.filter((p) => {
    if (selectedDeadline === "all") return true;

    const effectiveDeadline = p.due_date ?? p.completed_date;
    const info = getDeadlineInfo(effectiveDeadline, p.status);

    if (selectedDeadline === "overdue") {
      return info.isOverdue;
    }
    if (selectedDeadline === "due_today") {
      return info.daysRemaining === 0;
    }
    if (selectedDeadline === "due_soon") {
      return info.daysRemaining !== null && info.daysRemaining >= 0 && info.daysRemaining <= 3;
    }
    if (selectedDeadline === "this_week") {
      return info.daysRemaining !== null && info.daysRemaining >= 0 && info.daysRemaining <= 7;
    }

    return true;
  });

  // Calculate deadline statistics for current year
  const overdueProjectsCount = rawProjects.filter((p) => {
    const effectiveDeadline = p.due_date ?? p.completed_date;
    const info = getDeadlineInfo(effectiveDeadline, p.status);
    return info.isOverdue;
  }).length;

  const dueSoonProjectsCount = rawProjects.filter((p) => {
    const effectiveDeadline = p.due_date ?? p.completed_date;
    const info = getDeadlineInfo(effectiveDeadline, p.status);
    return info.daysRemaining !== null && info.daysRemaining >= 0 && info.daysRemaining <= 3;
  }).length;

  const totalValue = allProjectsSummary.reduce(
    (sum, p) => sum + Number(p.actual_value ?? 0),
    0,
  );

  const totalPaid = allProjectsSummary.reduce(
    (sum, p) => sum + Number(p.paid_amount ?? 0),
    0,
  );

  const totalDebt = Math.max(0, totalValue - totalPaid);

  const activeCount = allProjectsSummary.filter(
    (p) =>
      p.status === "in_progress" ||
      p.status === "planning" ||
      p.status === "waiting",
  ).length;

  const hasFilters =
    keyword.length > 0 ||
    selectedStatus !== "all" ||
    selectedCustomer !== "all" ||
    selectedDeadline !== "all" ||
    selectedYear !== "all" ||
    selectedSort !== "code_desc";

  // Prepare CSV Export rows
  const csvHeaders = [
    "Mã dự án",
    "Tên dự án",
    "Khách hàng",
    "Loại hình",
    "Hạn hoàn thành",
    "Tình trạng deadline",
    "Giá trị dự án (VNĐ)",
    "Đã thanh toán (VNĐ)",
    "Công nợ còn lại (VNĐ)",
    "Số lượng linh kiện BOM",
    "Trạng thái",
  ];

  const csvRows = projects.map((p) => {
    const actual = Number(p.actual_value ?? 0);
    const paid = Number(p.paid_amount ?? 0);
    const debt = Math.max(0, actual - paid);
    const dInfo = getDeadlineInfo(p.due_date, p.status);
    return [
      p.project_code,
      p.project_name,
      p.customers?.full_name || "",
      p.project_type || "",
      p.due_date ? formatDate(p.due_date) : "",
      dInfo.label,
      actual,
      paid,
      debt,
      p._count.project_items,
      statusLabels[p.status as ProjectStatus] || p.status,
    ];
  });

  const yearOptions = [
    currentSystemYear + 1,
    currentSystemYear,
    currentSystemYear - 1,
    currentSystemYear - 2,
    currentSystemYear - 3,
  ];

  return (
    <div className="p-5 md:p-8 space-y-6">
      {params.success === "created" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Thêm dự án mới thành công.
        </div>
      )}

      {params.success === "updated" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Cập nhật dự án thành công.
        </div>
      )}

      {params.success === "deleted" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Xóa dự án thành công.
        </div>
      )}

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {params.error}
        </div>
      )}

      {/* 1. Projects KPIs Aggregated */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Tổng số dự án
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{allProjectsSummary.length}</p>
          <p className="mt-1 text-xs text-slate-500">
            {selectedYear !== "all" ? `Năm ${selectedYear}` : "Toàn bộ hợp đồng & đơn hàng"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Đang triển khai
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-600">{activeCount}</p>
          <div className="mt-1 flex items-center gap-2 text-xs font-medium">
            {overdueProjectsCount > 0 ? (
              <span className="text-rose-600 font-bold">{overdueProjectsCount} trễ hạn</span>
            ) : (
              <span className="text-emerald-600">Tiến độ đúng hạn</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Tổng giá trị hợp đồng
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(totalValue)}</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Đã thu: {formatCurrency(totalPaid)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Công nợ còn lại
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{formatCurrency(totalDebt)}</p>
          <p className="mt-1 text-xs text-amber-700 font-medium">Cần đối soát & thu hồi</p>
        </div>
      </div>

      {/* 2. Main Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* View Switcher Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <Link
                href={`/projects?q=${encodeURIComponent(keyword)}&year=${encodeURIComponent(selectedYear)}&customer=${encodeURIComponent(selectedCustomer)}&status=${encodeURIComponent(selectedStatus)}&deadline=${encodeURIComponent(selectedDeadline)}&view=list`}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  currentView === "list"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Danh sách
              </Link>

              <Link
                href={`/projects?q=${encodeURIComponent(keyword)}&year=${encodeURIComponent(selectedYear)}&customer=${encodeURIComponent(selectedCustomer)}&status=${encodeURIComponent(selectedStatus)}&deadline=${encodeURIComponent(selectedDeadline)}&view=kanban`}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  currentView === "kanban"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Bảng Kanban
              </Link>
            </div>

            <ExportCsvButton
              filename={`danh-sach-du-an-smlab-${selectedYear}`}
              headers={csvHeaders}
              rows={csvRows}
            />
          </div>

          {/* Unified Compact Filter Controls */}
          <form
            action="/projects"
            method="GET"
            className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100"
          >
            <input type="hidden" name="view" value={currentView} />

            <input
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="Tìm mã, tên dự án..."
              className="w-40 sm:w-44 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {/* Status Selector */}
            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500"
            >
              <option value="all">Tất cả trạng thái</option>
              {validStatuses.map((st) => (
                <option key={st} value={st}>
                  {statusLabels[st]}
                </option>
              ))}
            </select>

            {/* Deadline Selector */}
            <select
              name="deadline"
              defaultValue={selectedDeadline}
              className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500"
            >
              <option value="all">Tất cả thời hạn</option>
              <option value="overdue">🚨 Quá hạn ({overdueProjectsCount})</option>
              <option value="due_soon">⚠️ Sắp đến hạn ({dueSoonProjectsCount})</option>
              <option value="this_week">📅 Trong tuần này</option>
            </select>

            {/* Year Selector */}
            <select
              name="year"
              defaultValue={selectedYear}
              className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500"
            >
              <option value="all">Tất cả các năm</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            {/* Customer Selector */}
            <select
              name="customer"
              defaultValue={selectedCustomer}
              className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 max-w-[160px]"
            >
              <option value="all">Tất cả khách hàng</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_code} - {customer.full_name}
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              name="sort"
              defaultValue={selectedSort}
              className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500"
            >
              <option value="code_desc">🔢 Mã DA (Z → A)</option>
              <option value="code_asc">🔢 Mã DA (A → Z)</option>
              <option value="created_desc">⏱️ Mới nhất</option>
              <option value="created_asc">⏱️ Cũ nhất</option>
              <option value="due_asc">📅 Hạn hoàn thành</option>
              <option value="value_desc">💰 Giá trị (Cao → Thấp)</option>
            </select>

            <button
              type="submit"
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 px-3.5 py-1.5 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              🔍 Lọc
            </button>

            {hasFilters && (
              <Link
                href={`/projects?view=${currentView}`}
                className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-50 shadow-2xs"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {/* Render View: Kanban or Table */}
        {currentView === "kanban" ? (
          <div className="p-6">
            <ProjectKanbanBoard projects={projects} />
          </div>
        ) : (
          <>
            {projects.length === 0 ? (
              <div className="p-12 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  Không tìm thấy dự án phù hợp
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Hãy thử chọn bộ lọc deadline hoặc năm khác.
                </p>
                <Link
                  href="/projects/new"
                  className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  + Thêm dự án đầu tiên
                </Link>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3.5 text-center whitespace-nowrap text-slate-400 w-10">STT</th>
                      <th className="px-3.5 py-3.5 whitespace-nowrap">Mã & Tên dự án</th>
                      <th className="px-3.5 py-3.5 whitespace-nowrap">Khách hàng</th>
                      <th className="px-3.5 py-3.5 whitespace-nowrap">Hạn hoàn thành</th>
                      <th className="px-3.5 py-3.5 whitespace-nowrap">Giá trị & Thanh toán</th>
                      <th className="px-3.5 py-3.5 whitespace-nowrap">Linh kiện (BOM)</th>
                      <th className="px-3.5 py-3.5 whitespace-nowrap">Trạng thái</th>
                      <th className="px-3.5 py-3.5 text-right whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {projects.map((project, index) => {
                      const customerName =
                        project.customers?.company_name ||
                        project.customers?.full_name ||
                        "Chưa chọn khách hàng";

                      const actualVal = Number(project.actual_value ?? 0);
                      const paidVal = Number(project.paid_amount ?? 0);

                      const effectiveDeadline = project.due_date ?? project.completed_date;
                      const deadlineInfo = getDeadlineInfo(effectiveDeadline, project.status);

                      return (
                        <tr
                          key={project.id}
                          className={`bg-white transition hover:bg-slate-50 ${
                            deadlineInfo.isOverdue ? "bg-red-50/20" : ""
                          }`}
                        >
                          <td className="px-3 py-3.5 text-center text-xs font-bold text-slate-400 whitespace-nowrap">
                            {index + 1}
                          </td>

                          <td className="px-3.5 py-3.5">
                            <Link
                              href={`/projects/${project.id}`}
                              className="font-semibold text-slate-900 hover:text-blue-600 transition text-[13.5px] leading-snug block"
                            >
                              {formatProjectTitle(project.project_name)}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 border border-blue-200">
                                {project.project_code}
                              </span>
                              {project.project_type && (
                                <span className="text-slate-500 font-medium">
                                  {project.project_type}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3.5 py-3.5 whitespace-nowrap">
                            {project.customers ? (
                              <Link
                                href={`/customers/${project.customers.id}`}
                                className="text-xs font-semibold text-slate-800 hover:text-blue-600 hover:underline"
                              >
                                {customerName}
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Không gắn khách
                              </span>
                            )}
                          </td>

                          {/* Visual Deadline & Due date cell */}
                          <td className="px-3.5 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-semibold text-slate-800 tabular-nums">
                                📅 {formatDate(effectiveDeadline)}
                              </p>
                              <DeadlineBadge
                                dueDate={effectiveDeadline}
                                status={project.status}
                              />
                            </div>
                          </td>

                          <td className="px-3.5 py-3.5 whitespace-nowrap">
                            <QuickPaymentAdjuster
                              projectId={project.id}
                              projectCode={project.project_code}
                              projectName={project.project_name}
                              actualValue={actualVal}
                              currentPaid={paidVal}
                              customerName={customerName}
                            />
                          </td>

                          <td className="px-3.5 py-3.5 whitespace-nowrap">
                            <Link
                              href={`/projects/${project.id}/items`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              📦 {project._count.project_items} linh kiện
                            </Link>
                          </td>

                          <td className="px-3.5 py-3.5 whitespace-nowrap">
                            <ProjectStatusSelect
                              projectId={project.id}
                              currentStatus={project.status}
                            />
                          </td>

                          <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/projects/${project.id}`}
                                className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                              >
                                Chi tiết
                              </Link>

                              <Link
                                href={`/projects/${project.id}/print`}
                                title="In báo giá"
                                className="inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                              >
                                🖨️
                              </Link>

                              <Link
                                href={`/projects/${project.id}/edit`}
                                className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 shadow-2xs"
                              >
                                Sửa
                              </Link>

                              <form action={deleteProject.bind(null, project.id)}>
                                <DeleteProjectButton />
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}