import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

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
  draft: "bg-slate-100 text-slate-700",
  planning: "bg-violet-100 text-violet-700",
  in_progress: "bg-blue-100 text-blue-700",
  waiting: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
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
  }).format(value);
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const params = await searchParams;

  const keyword = String(params.q ?? "").trim();
  const selectedStatus = String(
    params.status ?? "all",
  ).trim();
  const selectedCustomer = String(
    params.customer ?? "all",
  ).trim();

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

  const [projects, customers] = await Promise.all([
    prisma.projects.findMany({
      where: {
        organization_id: ORGANIZATION_ID,

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
      },

      orderBy: {
        created_at: "desc",
      },
    }),

    prisma.customers.findMany({
      where: {
        organization_id: ORGANIZATION_ID,
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
  ]);

  const hasFilters =
    keyword.length > 0 ||
    selectedStatus !== "all" ||
    selectedCustomer !== "all";

  return (
    <div className="p-5 md:p-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Danh sách dự án
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Hiển thị {projects.length} dự án
            </p>
          </div>

          <form
            action="/projects"
            method="GET"
            className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_210px_190px_auto_auto]"
          >
            <input
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="Tìm mã, tên dự án, khách hàng..."
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              name="customer"
              defaultValue={selectedCustomer}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                Tất cả khách hàng
              </option>

              {customers.map((customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.customer_code} -{" "}
                  {customer.company_name ||
                    customer.full_name}
                </option>
              ))}
            </select>

            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                Tất cả trạng thái
              </option>
              <option value="draft">Nháp</option>
              <option value="planning">
                Đang chuẩn bị
              </option>
              <option value="in_progress">
                Đang thực hiện
              </option>
              <option value="waiting">
                Chờ khách hàng
              </option>
              <option value="completed">
                Hoàn thành
              </option>
              <option value="cancelled">
                Đã hủy
              </option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Tìm
            </button>

            {hasFilters && (
              <Link
                href="/projects"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              Không tìm thấy dự án
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Hãy thử từ khóa hoặc bộ lọc khác.
            </p>

            {hasFilters ? (
              <Link
                href="/projects"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Xem tất cả dự án
              </Link>
            ) : (
              <Link
                href="/projects/new"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Thêm dự án đầu tiên
              </Link>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-4">Mã</th>
                  <th className="px-4 py-4">
                    Tên dự án
                  </th>
                  <th className="px-4 py-4">
                    Khách hàng
                  </th>
                  <th className="px-4 py-4">
                    Thời gian
                  </th>
                  <th className="px-4 py-4">
                    Giá trị
                  </th>
                  <th className="px-4 py-4">
                    Thanh toán
                  </th>
                  <th className="px-4 py-4">
                    Trạng thái
                  </th>
                  <th className="px-4 py-4">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {projects.map((project) => {
                  const status =
                    project.status as ProjectStatus;

                  const customerName =
                    project.customers?.company_name ||
                    project.customers?.full_name ||
                    "Chưa chọn khách hàng";

                  return (
                    <tr
                      key={project.id}
                      className="bg-white transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-sm font-semibold text-blue-600">
                        {project.project_code}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {project.project_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {project.project_type ||
                            "Chưa phân loại"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {customerName}
                        </p>

                        {project.customers && (
                          <p className="mt-1 text-xs text-slate-500">
                            {
                              project.customers
                                .customer_code
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        <p>
                          Bắt đầu:{" "}
                          {formatDate(
                            project.start_date,
                          )}
                        </p>

                        <p className="mt-1">
                          Hạn:{" "}
                          {formatDate(project.due_date)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(
                            project.estimated_value,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Thực tế:{" "}
                          {formatCurrency(
                            project.actual_value,
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(
                            project.paid_amount,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Còn lại:{" "}
                          {formatCurrency(
                            Math.max(
                              0,
                              Number(
                                project.actual_value,
                              ) -
                                Number(
                                  project.paid_amount,
                                ),
                            ),
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                            statusClasses[status]
                          }`}
                        >
                          {statusLabels[status]}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/projects/${project.id}/edit`}
                          className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          Sửa
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}