import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CustomerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type CustomerStatus =
  | "waiting_quote"
  | "waiting_topic"
  | "waiting_close"
  | "in_progress"
  | "done"
  | "cancelled";

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

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const { id } = await params;

  const customer = await prisma.customers.findFirst({
    where: {
      id,
      organization_id: organizationId,
    },
    include: {
      projects: {
        orderBy: {
          created_at: "desc",
        },
        include: {
          _count: {
            select: {
              project_items: true,
            },
          },
        },
      },
      transactions: {
        orderBy: {
          transaction_date: "desc",
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const status = customer.status as CustomerStatus;

  const totalProjectValue = customer.projects.reduce(
    (sum, p) => sum + Number(p.actual_value ?? 0),
    0,
  );

  const totalPaid = customer.projects.reduce(
    (sum, p) => sum + Number(p.paid_amount ?? 0),
    0,
  );

  const remainingDebt = Math.max(0, totalProjectValue - totalPaid);

  return (
    <div className="p-5 md:p-8 space-y-6">
      {/* 1. Header Card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <Link
            href="/customers"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Quay lại danh sách khách hàng
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {customer.full_name}
            </h1>
            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              {customer.customer_code}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                statusClasses[status] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {statusLabels[status] ?? customer.status}
            </span>
          </div>
          {customer.company_name && (
            <p className="mt-1 text-sm font-medium text-slate-500">
              🏢 {customer.company_name}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href={`/projects/new`}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            + Tạo dự án mới
          </Link>
          <Link
            href={`/customers/${customer.id}/edit`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Sửa thông tin
          </Link>
        </div>
      </div>

      {/* 2. Customer KPIs */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Tổng dự án
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {customer.projects.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {customer.projects.filter((p) => p.status === "in_progress").length} dự án đang làm
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Tổng giá trị hợp đồng
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            {formatCurrency(totalProjectValue)}
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">
            Đã thanh toán: {formatCurrency(totalPaid)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Công nợ còn lại
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              remainingDebt > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {formatCurrency(remainingDebt)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {remainingDebt > 0 ? "Chưa thanh toán hết" : "Đã tất toán toàn bộ"}
          </p>
        </div>
      </div>

      {/* 3. Customer Profile Information Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
          Thông tin liên hệ & Hồ sơ
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <span className="block text-xs font-medium text-slate-500">Số điện thoại:</span>
            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="mt-1 inline-block font-semibold text-blue-600 hover:underline"
              >
                📞 {customer.phone}
              </a>
            ) : (
              <span className="mt-1 block text-slate-400">Chưa cập nhật</span>
            )}
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500">Email:</span>
            {customer.email ? (
              <a
                href={`mailto:${customer.email}`}
                className="mt-1 inline-block font-semibold text-blue-600 hover:underline"
              >
                ✉️ {customer.email}
              </a>
            ) : (
              <span className="mt-1 block text-slate-400">Chưa cập nhật</span>
            )}
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500">Phân loại:</span>
            <span className="mt-1 block font-semibold text-slate-800">
              {customerTypeLabels[customer.customer_type] ?? customer.customer_type}
            </span>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500">Nguồn khách hàng:</span>
            <span className="mt-1 block font-semibold text-slate-800">
              {customer.source || "Chưa xác định"}
            </span>
          </div>

          <div className="sm:col-span-2">
            <span className="block text-xs font-medium text-slate-500">Địa chỉ:</span>
            <span className="mt-1 block font-medium text-slate-700">
              {customer.address || "Chưa cập nhật"}
            </span>
          </div>

          <div className="sm:col-span-2">
            <span className="block text-xs font-medium text-slate-500">Ghi chú:</span>
            <span className="mt-1 block font-medium text-slate-700">
              {customer.notes || "Không có ghi chú"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Projects of this Customer */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Dự án của khách hàng ({customer.projects.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Danh sách các hợp đồng và dự án thực hiện
            </p>
          </div>

          <Link
            href={`/projects/new`}
            className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
          >
            + Thêm dự án
          </Link>
        </div>

        {customer.projects.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Khách hàng này chưa có dự án nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Mã & Tên dự án</th>
                  <th className="px-6 py-4">Hạn hoàn thành</th>
                  <th className="px-6 py-4">Giá trị hợp đồng</th>
                  <th className="px-6 py-4">Đã thanh toán</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {customer.projects.map((project) => {
                  const actualVal = Number(project.actual_value ?? 0);
                  const paidVal = Number(project.paid_amount ?? 0);
                  const percentPaid = actualVal > 0 ? Math.min(100, Math.round((paidVal / actualVal) * 100)) : 0;

                  return (
                    <tr key={project.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/projects/${project.id}/items`}
                          className="font-bold text-slate-900 hover:text-blue-600"
                        >
                          {project.project_name}
                        </Link>
                        <p className="mt-0.5 text-xs text-blue-600 font-semibold">
                          {project.project_code} • {project._count.project_items} linh kiện
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(project.due_date)}
                      </td>

                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {formatCurrency(project.actual_value)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-emerald-700">{formatCurrency(paidVal)}</span>
                            <span className="text-slate-500">{percentPaid}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                          {project.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/projects/${project.id}/items`}
                          className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Linh kiện →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Transactions History */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Lịch sử giao dịch tài chính ({customer.transactions.length})
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Các phiếu thu tiền và chi phí liên quan đến khách hàng này
          </p>
        </div>

        {customer.transactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Chưa có giao dịch nào được ghi nhận cho khách hàng này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Mã GD</th>
                  <th className="px-6 py-4">Ngày</th>
                  <th className="px-6 py-4">Loại</th>
                  <th className="px-6 py-4">Danh mục</th>
                  <th className="px-6 py-4 text-right">Số tiền</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {customer.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 text-sm">
                    <td className="px-6 py-4 font-semibold text-blue-600">
                      {tx.transaction_code}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          tx.transaction_type === "income"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {tx.transaction_type === "income" ? "Thu" : "Chi"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-medium">
                      {tx.category}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold ${
                        tx.transaction_type === "income"
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {tx.transaction_type === "income" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
