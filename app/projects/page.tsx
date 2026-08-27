import Link from "next/link";

import DeadlineBadge from "@/components/DeadlineBadge";
import DeleteProjectButton from "@/components/DeleteProjectButton";
import ExportCsvButton from "@/components/ExportCsvButton";
import ProjectKanbanBoard from "@/components/ProjectKanbanBoard";
import ProjectStatusSelect from "@/components/ProjectStatusSelect";
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

const statusClasses: Record<ProjectStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  planning: "bg-violet-100 text-violet-700 border-violet-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  waiting: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
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
  const selectedYear = params.year ? String(params.year).trim() : String(currentSystemYear);
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

  const yearFilter =
    selectedYear !== "all"
      ? {
          created_at: {
            gte: new Date(Date.UTC(Number(selectedYear), 0, 1)),
            lt: new Date(Date.UTC(Number(selectedYear) + 1, 0, 1)),
          },
        }
      : {};

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

      orderBy: [
        {
          due_date: "asc",
        },
        {
          created_at: "desc",
        },
      ],
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
        actual_value: true,
        paid_amount: true,
      },
    }),
  ]);

  // Filter projects by deadline if selected
  const projects = rawProjects.filter((p) => {
    if (selectedDeadline === "all") return true;

    const info = getDeadlineInfo(p.due_date, p.status);

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
    const info = getDeadlineInfo(p.due_date, p.status);
    return info.isOverdue;
  }).length;

  const dueSoonProjectsCount = rawProjects.filter((p) => {
    const info = getDeadlineInfo(p.due_date, p.status);
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
    selectedYear !== String(currentSystemYear);

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

  const yearDisplayLabel =
    selectedYear !== "all" ? `NĂM ${selectedYear}` : "TOÀN BỘ";

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

      {/* 0. Year Selection Pills Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase text-slate-500 mr-1">
            Tổng hợp theo năm:
          </span>

          <Link
            href={`/projects?year=${currentSystemYear}&status=${selectedStatus}&customer=${selectedCustomer}&deadline=${selectedDeadline}&view=${currentView}`}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
              selectedYear === String(currentSystemYear)
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Năm nay ({currentSystemYear})
          </Link>

          <Link
            href={`/projects?year=${currentSystemYear - 1}&status=${selectedStatus}&customer=${selectedCustomer}&deadline=${selectedDeadline}&view=${currentView}`}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
              selectedYear === String(currentSystemYear - 1)
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Năm trước ({currentSystemYear - 1})
          </Link>

          <Link
            href={`/projects?year=${currentSystemYear - 2}&status=${selectedStatus}&customer=${selectedCustomer}&deadline=${selectedDeadline}&view=${currentView}`}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
              selectedYear === String(currentSystemYear - 2)
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Năm {currentSystemYear - 2}
          </Link>

          <Link
            href={`/projects?year=all&status=${selectedStatus}&customer=${selectedCustomer}&deadline=${selectedDeadline}&view=${currentView}`}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
              selectedYear === "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Toàn thời gian
          </Link>
        </div>

        {/* Deadline Alert Summary on Header */}
        <div className="flex items-center gap-2 text-xs font-bold">
          {overdueProjectsCount > 0 && (
            <Link
              href={`/projects?year=${selectedYear}&deadline=overdue&view=${currentView}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1 text-white shadow-xs animate-pulse hover:bg-red-700"
            >
              <span>🚨</span>
              <span>{overdueProjectsCount} dự án quá hạn!</span>
            </Link>
          )}

          {dueSoonProjectsCount > 0 && (
            <Link
              href={`/projects?year=${selectedYear}&deadline=due_soon&view=${currentView}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1 text-white shadow-xs hover:bg-amber-600"
            >
              <span>⚠️</span>
              <span>{dueSoonProjectsCount} dự án sắp đến hạn</span>
            </Link>
          )}
        </div>
      </div>

      {/* 1. Projects KPIs Aggregated by Year */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Tổng số dự án ({yearDisplayLabel})
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{allProjectsSummary.length}</p>
          <p className="mt-1 text-xs text-slate-500">
            {selectedYear !== "all" ? `Hợp đồng tạo trong năm ${selectedYear}` : "Toàn bộ hợp đồng & đơn hàng"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Đang triển khai ({yearDisplayLabel})
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-600">{activeCount}</p>
          <div className="mt-1 flex items-center gap-2 text-xs font-medium">
            {overdueProjectsCount > 0 ? (
              <span className="text-red-600 font-bold">{overdueProjectsCount} trễ hạn</span>
            ) : (
              <span className="text-emerald-600">Tiến độ đúng hạn</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Tổng giá trị hợp đồng ({yearDisplayLabel})
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(totalValue)}</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Đã thu: {formatCurrency(totalPaid)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Công nợ còn lại ({yearDisplayLabel})
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{formatCurrency(totalDebt)}</p>
          <p className="mt-1 text-xs text-amber-700 font-medium">Cần đối soát & thu hồi</p>
        </div>
      </div>

      {/* 2. Main Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Quản lý & Tiến độ dự án
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Hiển thị {projects.length} dự án theo bộ lọc ({yearDisplayLabel})
              </p>
            </div>

            {/* Actions: View Switcher, Export CSV, Add Project */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Switcher Toggle */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
                <Link
                  href={`/projects?q=${encodeURIComponent(keyword)}&year=${encodeURIComponent(selectedYear)}&customer=${encodeURIComponent(selectedCustomer)}&status=${encodeURIComponent(selectedStatus)}&deadline=${encodeURIComponent(selectedDeadline)}&view=list`}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    currentView === "list"
                      ? "bg-white text-blue-600 shadow-xs"
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
                      ? "bg-white text-blue-600 shadow-xs"
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

              <Link
                href="/projects/new"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                + Thêm dự án mới
              </Link>
            </div>
          </div>

          {/* Quick Deadline Filter Pills */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase text-slate-400 mr-1">
              Thời hạn deadline:
            </span>

            <Link
              href={`/projects?q=${encodeURIComponent(keyword)}&year=${encodeURIComponent(selectedYear)}&customer=${encodeURIComponent(selectedCustomer)}&status=${encodeURIComponent(selectedStatus)}&view=${currentView}&deadline=all`}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                selectedDeadline === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tất cả thời hạn
            </Link>

            <Link
              href={`/projects?q=${encodeURIComponent(keyword)}&year=${encodeURIComponent(selectedYear)}&customer=${encodeURIComponent(selectedCustomer)}&status=${encodeURIComponent(selectedStatus)}&view=${currentView}&deadline=overdue`}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                selectedDeadline === "overdue"
                  ? "bg-red-600 text-white border-red-600 shadow-xs"
                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              }`}
            >
              🚨 Quá hạn ({overdueProjectsCount})
            </Link>

            <Link
              href={`/projects?q=${encodeURIComponent(keyword)}&year=${encodeURIComponent(selectedYear)}&customer=${encodeURIComponent(selectedCustomer)}&status=${encodeURIComponent(selectedStatus)}&view=${currentView}&deadline=due_soon`}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                selectedDeadline === "due_soon"
                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              }`}
            >
              ⚠️ Sắp đến hạn ({dueSoonProjectsCount})
            </Link>

            <Link
              href={`/projects?q=${encodeURIComponent(keyword)}&year=${encodeURIComponent(selectedYear)}&customer=${encodeURIComponent(selectedCustomer)}&status=${encodeURIComponent(selectedStatus)}&view=${currentView}&deadline=this_week`}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                selectedDeadline === "this_week"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
              }`}
            >
              📅 Trong tuần này
            </Link>
          </div>

          {/* Quick Status Filter Pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/projects?q=${encodeURIComponent(keyword)}&year=${encodeURIComponent(selectedYear)}&customer=${encodeURIComponent(selectedCustomer)}&deadline=${encodeURIComponent(selectedDeadline)}&view=${currentView}&status=all`}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedStatus === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tất cả trạng thái ({allProjectsSummary.length})
            </Link>

            {validStatuses.map((st) => (
              <Link
                key={st}
                href={`/projects?q=${encodeURIComponent(keyword)}&year=${encodeURIComponent(selectedYear)}&customer=${encodeURIComponent(selectedCustomer)}&deadline=${encodeURIComponent(selectedDeadline)}&view=${currentView}&status=${st}`}
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                  selectedStatus === st
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : `${statusClasses[st]} hover:opacity-80`
                }`}
              >
                {statusLabels[st]}
              </Link>
            ))}
          </div>

          {/* Filter Controls with Year & Customer Select */}
          <form
            action="/projects"
            method="GET"
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_220px_auto_auto]"
          >
            <input type="hidden" name="status" value={selectedStatus} />
            <input type="hidden" name="deadline" value={selectedDeadline} />
            <input type="hidden" name="view" value={currentView} />

            <input
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="Tìm mã, tên dự án, ghi chú..."
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            {/* Year Selector */}
            <select
              name="year"
              defaultValue={selectedYear}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả năm</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            <select
              name="customer"
              defaultValue={selectedCustomer}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả khách hàng</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_code} - {customer.full_name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Tìm
            </button>

            {hasFilters && (
              <Link
                href={`/projects?view=${currentView}`}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
                <table className="w-full min-w-[1300px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Mã & Tên dự án</th>
                      <th className="px-5 py-4">Khách hàng</th>
                      <th className="px-5 py-4">Hạn hoàn thành & Deadline</th>
                      <th className="px-5 py-4">Giá trị hợp đồng</th>
                      <th className="px-5 py-4">Tiến độ thanh toán</th>
                      <th className="px-5 py-4">Linh kiện (BOM)</th>
                      <th className="px-5 py-4">Trạng thái</th>
                      <th className="px-5 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {projects.map((project) => {
                      const customerName =
                        project.customers?.company_name ||
                        project.customers?.full_name ||
                        "Chưa chọn khách hàng";

                      const actualVal = Number(project.actual_value ?? 0);
                      const paidVal = Number(project.paid_amount ?? 0);
                      const percentPaid =
                        actualVal > 0
                          ? Math.min(100, Math.round((paidVal / actualVal) * 100))
                          : 0;
                      const remainingDebt = Math.max(0, actualVal - paidVal);

                      const deadlineInfo = getDeadlineInfo(project.due_date, project.status);

                      return (
                        <tr
                          key={project.id}
                          className={`bg-white transition hover:bg-slate-50 ${
                            deadlineInfo.isOverdue ? "bg-red-50/20" : ""
                          }`}
                        >
                          <td className="px-5 py-4">
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

                          <td className="px-5 py-4">
                            {project.customers ? (
                              <Link
                                href={`/customers/${project.customers.id}`}
                                className="text-sm font-semibold text-slate-800 hover:text-blue-600 hover:underline"
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
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-semibold text-slate-800 tabular-nums">
                                📅 {formatDate(project.due_date)}
                              </p>
                              <DeadlineBadge
                                dueDate={project.due_date}
                                status={project.status}
                              />
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900 tabular-nums">
                              {formatCurrency(actualVal)}
                            </p>
                            {remainingDebt > 0 && (
                              <p className="mt-0.5 text-xs text-amber-600 font-semibold tabular-nums">
                                Còn nợ: {formatCurrency(remainingDebt)}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="w-36">
                              <div className="flex justify-between text-xs font-semibold mb-1 tabular-nums">
                                <span className="text-emerald-700 font-bold">
                                  {formatCurrency(paidVal)}
                                </span>
                                <span className="text-slate-500 font-medium">
                                  {percentPaid}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${percentPaid}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <Link
                              href={`/projects/${project.id}/items`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              📦 {project._count.project_items} linh kiện
                            </Link>
                          </td>

                          <td className="px-5 py-4">
                            <ProjectStatusSelect
                              projectId={project.id}
                              currentStatus={project.status}
                            />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/projects/${project.id}`}
                                className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Chi tiết
                              </Link>

                              <Link
                                href={`/projects/${project.id}/print`}
                                title="In báo giá"
                                className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                🖨️
                              </Link>

                              <Link
                                href={`/projects/${project.id}/edit`}
                                className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
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