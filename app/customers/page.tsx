import Link from "next/link";

import ConvertCustomerButton from "@/components/ConvertCustomerButton";
import CustomerPipelineBoard from "@/components/CustomerPipelineBoard";
import CustomerStatusSelect from "@/components/CustomerStatusSelect";
import DeleteCustomerButton from "@/components/DeleteCustomerButton";
import ExportCsvButton from "@/components/ExportCsvButton";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

import { deleteCustomer } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CustomerStatus =
  | "waiting_quote"
  | "waiting_topic"
  | "waiting_close"
  | "in_progress"
  | "done"
  | "cancelled";

type CustomersPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    segment?: string;
    view?: string;
    success?: string;
    error?: string;
  }>;
};

const statusLabels: Record<CustomerStatus, string> = {
  waiting_quote: "Đang chờ báo giá",
  waiting_topic: "Đang chờ đề tài",
  waiting_close: "Đang chờ chốt",
  in_progress: "Đang thực hiện",
  done: "Done",
  cancelled: "Cancel",
};

const statusClasses: Record<CustomerStatus, string> = {
  waiting_quote: "bg-amber-100 text-amber-800 border-amber-200",
  waiting_topic: "bg-blue-100 text-blue-800 border-blue-200",
  waiting_close: "bg-purple-100 text-purple-800 border-purple-200",
  in_progress: "bg-cyan-100 text-cyan-800 border-cyan-200",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const customerTypeLabels: Record<string, string> = {
  individual: "Cá nhân",
  school: "Trường học",
  business: "Doanh nghiệp",
  dealer: "Đại lý",
  other: "Khác",
};

const CONSULTING_STATUSES: CustomerStatus[] = [
  "waiting_quote",
  "waiting_topic",
  "waiting_close",
];

const EXECUTING_STATUSES: CustomerStatus[] = [
  "in_progress",
  "done",
  "cancelled",
];

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const params = await searchParams;

  const keyword = String(params.q ?? "").trim();
  const selectedType = String(params.type ?? "all").trim();
  const selectedStatus = String(params.status ?? "all").trim();
  const currentSegment = params.segment ?? "consulting"; // "consulting" | "executing" | "all"
  const currentView = params.view === "pipeline" ? "pipeline" : "list";

  const validStatuses: CustomerStatus[] = [
    "waiting_quote",
    "waiting_topic",
    "waiting_close",
    "in_progress",
    "done",
    "cancelled",
  ];

  // If a specific status is chosen, use it. Otherwise, filter by segment.
  let statusFilterList: CustomerStatus[] | null = null;
  if (selectedStatus !== "all" && validStatuses.includes(selectedStatus as CustomerStatus)) {
    statusFilterList = [selectedStatus as CustomerStatus];
  } else if (currentSegment === "consulting") {
    statusFilterList = CONSULTING_STATUSES;
  } else if (currentSegment === "executing") {
    statusFilterList = EXECUTING_STATUSES;
  }

  const [allCustomersSummary, customers] = await Promise.all([
    // Get count breakdown for segments
    prisma.customers.findMany({
      where: {
        organization_id: organizationId,
      },
      select: {
        id: true,
        status: true,
      },
    }),

    // Query filtered customers list
    prisma.customers.findMany({
      where: {
        organization_id: organizationId,

        ...(keyword
          ? {
              OR: [
                {
                  customer_code: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
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
                  phone: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),

        ...(selectedType !== "all"
          ? {
              customer_type: selectedType,
            }
          : {}),

        ...(statusFilterList && currentView !== "pipeline"
          ? {
              status: {
                in: statusFilterList,
              },
            }
          : {}),
      },

      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },

      orderBy: {
        created_at: "desc",
      },
    }),
  ]);

  const totalCount = allCustomersSummary.length;
  const consultingCount = allCustomersSummary.filter((c) =>
    CONSULTING_STATUSES.includes(c.status as CustomerStatus),
  ).length;
  const executingCount = allCustomersSummary.filter((c) =>
    EXECUTING_STATUSES.includes(c.status as CustomerStatus),
  ).length;

  const hasFilters =
    keyword.length > 0 ||
    selectedType !== "all" ||
    selectedStatus !== "all";

  // Prepare CSV Export rows
  const csvHeaders = [
    "Mã khách hàng",
    "Họ và tên",
    "Đơn vị / Công ty",
    "Số điện thoại",
    "Email",
    "Địa chỉ",
    "Phân loại",
    "Nguồn khách",
    "Số lượng dự án",
    "Trạng thái",
  ];

  const csvRows = customers.map((c) => [
    c.customer_code,
    c.full_name,
    c.company_name || "",
    c.phone || "",
    c.email || "",
    c.address || "",
    customerTypeLabels[c.customer_type] || c.customer_type,
    c.source || "",
    c._count.projects,
    statusLabels[c.status as CustomerStatus] || c.status,
  ]);

  return (
    <div className="p-5 md:p-8 space-y-6">
      {params.success === "created" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Thêm khách hàng mới thành công.
        </div>
      )}

      {params.success === "updated" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Cập nhật thông tin khách hàng thành công.
        </div>
      )}

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {params.error}
        </div>
      )}

      {/* 1. Two Big Segment Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Segment 1: Quá trình Tư vấn */}
        <Link
          href={`/customers?segment=consulting&view=${currentView}`}
          className={`block rounded-2xl border-2 p-5 transition shadow-sm ${
            currentSegment === "consulting"
              ? "border-amber-400 bg-amber-50/40 ring-2 ring-amber-200"
              : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-sm font-black">
                💬
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase">
                  1. Quá trình tư vấn & Chờ chốt
                </h3>
                <p className="text-xs text-slate-500">
                  Khách đang tìm hiểu, chờ báo giá & đề tài
                </p>
              </div>
            </div>

            <span className="rounded-xl bg-amber-500 px-3.5 py-1 text-sm font-black text-white shadow-xs">
              {consultingCount} khách
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600 border-t border-amber-200/60 pt-3">
            <span className="rounded-md bg-amber-100/80 px-2 py-0.5 text-amber-900">
              Chờ báo giá: {allCustomersSummary.filter((c) => c.status === "waiting_quote").length}
            </span>
            <span className="rounded-md bg-blue-100/80 px-2 py-0.5 text-blue-900">
              Chờ đề tài: {allCustomersSummary.filter((c) => c.status === "waiting_topic").length}
            </span>
            <span className="rounded-md bg-purple-100/80 px-2 py-0.5 text-purple-900">
              Chờ chốt: {allCustomersSummary.filter((c) => c.status === "waiting_close").length}
            </span>
          </div>
        </Link>

        {/* Segment 2: Đã Chốt Cọc & Đang Thực Hiện */}
        <Link
          href={`/customers?segment=executing&view=${currentView}`}
          className={`block rounded-2xl border-2 p-5 transition shadow-sm ${
            currentSegment === "executing"
              ? "border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-200"
              : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 text-sm font-black">
                🚀
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase">
                  2. Đã chốt cọc & Đang thực hiện
                </h3>
                <p className="text-xs text-slate-500">
                  Khách hàng chính thức, đang làm & đã hoàn thành
                </p>
              </div>
            </div>

            <span className="rounded-xl bg-emerald-600 px-3.5 py-1 text-sm font-black text-white shadow-xs">
              {executingCount} khách
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600 border-t border-emerald-200/60 pt-3">
            <span className="rounded-md bg-cyan-100/80 px-2 py-0.5 text-cyan-900">
              Đang thực hiện: {allCustomersSummary.filter((c) => c.status === "in_progress").length}
            </span>
            <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-emerald-900">
              Hoàn thành (Done): {allCustomersSummary.filter((c) => c.status === "done").length}
            </span>
            <span className="rounded-md bg-red-100/80 px-2 py-0.5 text-red-900">
              Hủy: {allCustomersSummary.filter((c) => c.status === "cancelled").length}
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Main Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {currentSegment === "consulting" ? (
                  <>
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    Danh sách khách hàng đang tư vấn ({customers.length})
                  </>
                ) : currentSegment === "executing" ? (
                  <>
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    Danh sách khách hàng đã chốt cọc & đang thực hiện ({customers.length})
                  </>
                ) : (
                  <>Tất cả khách hàng ({customers.length})</>
                )}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {currentSegment === "consulting"
                  ? "Khi khách hàng chốt cọc, bấm nút 'Chốt cọc' để chuyển ngay sang giai đoạn Đang thực hiện"
                  : "Theo dõi tiến độ dự án và lịch sử bàn giao"}
              </p>
            </div>

            {/* Actions: View Switcher, Export CSV, Add Customer */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Switcher Toggle */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
                <Link
                  href={`/customers?q=${encodeURIComponent(keyword)}&type=${encodeURIComponent(selectedType)}&status=${encodeURIComponent(selectedStatus)}&segment=${currentSegment}&view=list`}
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
                  href={`/customers?q=${encodeURIComponent(keyword)}&type=${encodeURIComponent(selectedType)}&status=${encodeURIComponent(selectedStatus)}&segment=${currentSegment}&view=pipeline`}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    currentView === "pipeline"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Phễu 2 giai đoạn
                </Link>
              </div>

              <ExportCsvButton
                filename={`danh-sach-khach-hang-${currentSegment}`}
                headers={csvHeaders}
                rows={csvRows}
              />

              <Link
                href="/customers/new"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                + Thêm khách hàng
              </Link>
            </div>
          </div>

          {/* Segment Filter Tabs */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
            <Link
              href={`/customers?segment=consulting&view=${currentView}&type=${encodeURIComponent(selectedType)}`}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                currentSegment === "consulting"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              💬 Phần 1: Đang tư vấn ({consultingCount})
            </Link>

            <Link
              href={`/customers?segment=executing&view=${currentView}&type=${encodeURIComponent(selectedType)}`}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                currentSegment === "executing"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              🚀 Phần 2: Đã chốt cọc & Đang làm ({executingCount})
            </Link>

            <Link
              href={`/customers?segment=all&view=${currentView}&type=${encodeURIComponent(selectedType)}`}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                currentSegment === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Toàn bộ khách ({totalCount})
            </Link>
          </div>

          {/* Quick Sub-status Filter Pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/customers?q=${encodeURIComponent(keyword)}&type=${encodeURIComponent(selectedType)}&segment=${currentSegment}&view=${currentView}&status=all`}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                selectedStatus === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tất cả trạng thái
            </Link>

            {(currentSegment === "consulting"
              ? CONSULTING_STATUSES
              : currentSegment === "executing"
              ? EXECUTING_STATUSES
              : validStatuses
            ).map((st) => (
              <Link
                key={st}
                href={`/customers?q=${encodeURIComponent(keyword)}&type=${encodeURIComponent(selectedType)}&segment=${currentSegment}&view=${currentView}&status=${st}`}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedStatus === st
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : `${statusClasses[st]} hover:opacity-80`
                }`}
              >
                {statusLabels[st]}
              </Link>
            ))}
          </div>

          {/* Search bar */}
          <form
            action="/customers"
            method="GET"
            className="mt-4 grid gap-3 lg:grid-cols-[1fr_200px_auto_auto]"
          >
            <input type="hidden" name="status" value={selectedStatus} />
            <input type="hidden" name="segment" value={currentSegment} />
            <input type="hidden" name="view" value={currentView} />

            <input
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="Tìm theo tên, mã, số điện thoại, công ty..."
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              name="type"
              defaultValue={selectedType}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả loại khách</option>
              <option value="individual">Cá nhân</option>
              <option value="school">Trường học</option>
              <option value="business">Doanh nghiệp</option>
              <option value="dealer">Đại lý</option>
              <option value="other">Khác</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Tìm
            </button>

            {hasFilters && (
              <Link
                href={`/customers?segment=${currentSegment}&view=${currentView}`}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {/* Render View: Pipeline or Table */}
        {currentView === "pipeline" ? (
          <div className="p-6">
            <CustomerPipelineBoard customers={customers} />
          </div>
        ) : (
          <>
            {customers.length === 0 ? (
              <div className="p-12 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  Không tìm thấy khách hàng trong mục này
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Hãy thử từ khóa khác hoặc tạo khách hàng mới.
                </p>
                <Link
                  href="/customers/new"
                  className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  + Thêm khách hàng đầu tiên
                </Link>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Mã KH</th>
                      <th className="px-5 py-4">Khách hàng / Đơn vị</th>
                      <th className="px-5 py-4">Liên hệ</th>
                      <th className="px-5 py-4">Phân loại</th>
                      <th className="px-5 py-4">Dự án</th>
                      <th className="px-5 py-4">Trạng thái</th>
                      <th className="px-5 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {customers.map((customer) => {
                      const status = customer.status as CustomerStatus;
                      const isConsulting = CONSULTING_STATUSES.includes(status);

                      return (
                        <tr
                          key={customer.id}
                          className="bg-white transition hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-blue-600">
                            <Link
                              href={`/customers/${customer.id}`}
                              className="hover:underline"
                            >
                              {customer.customer_code}
                            </Link>
                          </td>

                          <td className="px-5 py-4">
                            <Link
                              href={`/customers/${customer.id}`}
                              className="font-bold text-slate-900 hover:text-blue-600 transition"
                            >
                              {customer.full_name}
                            </Link>

                            {customer.company_name && (
                              <p className="mt-0.5 text-xs text-slate-500 font-medium">
                                🏢 {customer.company_name}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {customer.phone && (
                              <p className="font-medium text-slate-800">
                                📞 {customer.phone}
                              </p>
                            )}
                            {customer.email && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                ✉️ {customer.email}
                              </p>
                            )}
                            {!customer.phone && !customer.email && (
                              <span className="text-xs text-slate-400">
                                Chưa có liên hệ
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {customerTypeLabels[customer.customer_type] ??
                              customer.customer_type}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                              {customer._count.projects} dự án
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <CustomerStatusSelect
                              customerId={customer.id}
                              currentStatus={customer.status}
                            />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Convert Button for Consulting Phase */}
                              {isConsulting && (
                                <ConvertCustomerButton
                                  customerId={customer.id}
                                  customerName={customer.full_name}
                                />
                              )}

                              <Link
                                href={`/customers/${customer.id}`}
                                className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Hồ sơ
                              </Link>

                              <Link
                                href={`/customers/${customer.id}/edit`}
                                className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                Sửa
                              </Link>

                              <form
                                action={deleteCustomer.bind(
                                  null,
                                  customer.id,
                                )}
                              >
                                <DeleteCustomerButton />
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