import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

type CustomerStatus =
  | "waiting_quote"
  | "waiting_topic"
  | "waiting_close"
  | "in_progress"
  | "done"
  | "cancelled";

type Customer = Awaited<
  ReturnType<typeof prisma.customers.findMany>
>[number];

type CustomersPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    success?: string;
  }>;
};

const customerTypeLabels: Record<string, string> = {
  individual: "Cá nhân",
  school: "Trường học",
  business: "Doanh nghiệp",
  dealer: "Đại lý",
  other: "Khác",
};

const customerStatuses: Array<{
  value: CustomerStatus;
  label: string;
}> = [
  {
    value: "waiting_quote",
    label: "Đang chờ báo giá",
  },
  {
    value: "waiting_topic",
    label: "Đang chờ đề tài",
  },
  {
    value: "waiting_close",
    label: "Đang chờ chốt",
  },
  {
    value: "in_progress",
    label: "Đang thực hiện",
  },
  {
    value: "done",
    label: "Done",
  },
  {
    value: "cancelled",
    label: "Cancel",
  },
];

const statusLabels: Record<CustomerStatus, string> = {
  waiting_quote: "Đang chờ báo giá",
  waiting_topic: "Đang chờ đề tài",
  waiting_close: "Đang chờ chốt",
  in_progress: "Đang thực hiện",
  done: "Done",
  cancelled: "Cancel",
};

const statusClasses: Record<CustomerStatus, string> = {
  waiting_quote:
    "border border-red-200 bg-red-100 text-red-700",

  waiting_topic:
    "border border-amber-200 bg-amber-100 text-amber-800",

  waiting_close:
    "border border-emerald-200 bg-emerald-100 text-emerald-700",

  in_progress:
    "border border-blue-700 bg-blue-600 text-white",

  done:
    "border border-emerald-800 bg-emerald-700 text-white",

  cancelled:
    "border border-red-900 bg-red-800 text-white",
};

function isCustomerStatus(
  value: string,
): value is CustomerStatus {
  return customerStatuses.some(
    (status) => status.value === value,
  );
}

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const params = await searchParams;

  const keyword = String(
    params.q ?? "",
  ).trim();

  const selectedType = String(
    params.type ?? "all",
  ).trim();

  const selectedStatus = String(
    params.status ?? "all",
  ).trim();

  const statusFilter =
    selectedStatus !== "all" &&
    isCustomerStatus(selectedStatus)
      ? selectedStatus
      : undefined;

  const customers: Customer[] =
    await prisma.customers.findMany({
      where: {
        organization_id: ORGANIZATION_ID,

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

        ...(statusFilter
          ? {
              status: statusFilter,
            }
          : {}),
      },

      orderBy: {
        created_at: "desc",
      },
    });

  const hasFilters =
    keyword.length > 0 ||
    selectedType !== "all" ||
    selectedStatus !== "all";

  return (
    <div className="p-5 md:p-8">
      {params.success === "created" && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Thêm khách hàng thành công.
        </div>
      )}

      {params.success === "updated" && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Cập nhật khách hàng thành công.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Danh sách khách hàng
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Hiển thị {customers.length} khách hàng
              </p>
            </div>

            <form
              action="/customers"
              method="GET"
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_200px_auto_auto]"
            >
              <input
                type="search"
                name="q"
                defaultValue={keyword}
                placeholder="Tìm mã, tên, công ty, điện thoại..."
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <select
                name="type"
                defaultValue={selectedType}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">
                  Tất cả loại
                </option>

                <option value="individual">
                  Cá nhân
                </option>

                <option value="school">
                  Trường học
                </option>

                <option value="business">
                  Doanh nghiệp
                </option>

                <option value="dealer">
                  Đại lý
                </option>

                <option value="other">
                  Khác
                </option>
              </select>

              <select
                name="status"
                defaultValue={selectedStatus}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">
                  Tất cả trạng thái
                </option>

                {customerStatuses.map((status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Tìm
              </button>

              {hasFilters && (
                <Link
                  href="/customers"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Xóa lọc
                </Link>
              )}
            </form>
          </div>
        </div>

        {customers.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              Không tìm thấy khách hàng
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Hãy thử từ khóa hoặc bộ lọc khác.
            </p>

            {hasFilters ? (
              <Link
                href="/customers"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Xem tất cả khách hàng
              </Link>
            ) : (
              <Link
                href="/customers/new"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Thêm khách hàng đầu tiên
              </Link>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1100px] table-fixed">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-[100px] px-4 py-4">
                    Mã
                  </th>

                  <th className="w-[220px] px-4 py-4">
                    Khách hàng
                  </th>

                  <th className="w-[200px] px-4 py-4">
                    Liên hệ
                  </th>

                  <th className="w-[130px] px-4 py-4">
                    Loại
                  </th>

                  <th className="w-[150px] px-4 py-4">
                    Nguồn
                  </th>

                  <th className="w-[180px] px-4 py-4">
                    Trạng thái
                  </th>

                  <th className="w-[100px] px-4 py-4">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {customers.map((customer) => {
                  const status =
                    customer.status as CustomerStatus;

                  return (
                    <tr
                      key={customer.id}
                      className="bg-white transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-sm font-semibold text-blue-600">
                        {customer.customer_code}
                      </td>

                      <td className="px-4 py-4">
                        <p className="truncate font-semibold text-slate-900">
                          {customer.full_name}
                        </p>

                        {customer.company_name && (
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {customer.company_name}
                          </p>
                        )}

                        {customer.address && (
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {customer.address}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        <p>
                          {customer.phone ??
                            "Chưa có số điện thoại"}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {customer.email ??
                            "Chưa có email"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {customerTypeLabels[
                          customer.customer_type
                        ] ?? customer.customer_type}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {customer.source ??
                          "Chưa xác định"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                            statusClasses[status] ??
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {statusLabels[status] ??
                            customer.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/customers/${customer.id}/edit`}
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