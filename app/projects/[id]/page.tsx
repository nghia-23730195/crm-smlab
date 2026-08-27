import Link from "next/link";
import { notFound } from "next/navigation";

import DeadlineBadge from "@/components/DeadlineBadge";
import DeleteProjectButton from "@/components/DeleteProjectButton";
import ProjectStatusSelect from "@/components/ProjectStatusSelect";
import { getDeadlineInfo } from "@/lib/deadline";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { deleteProject } from "../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
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

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const { id } = await params;

  const project = await prisma.projects.findFirst({
    where: {
      id,
      organization_id: organizationId,
    },
    include: {
      customers: true,
      project_items: {
        include: {
          products: {
            select: {
              product_code: true,
              name: true,
              unit: true,
            },
          },
        },
        orderBy: {
          created_at: "asc",
        },
      },
      transactions: {
        orderBy: {
          transaction_date: "desc",
        },
      },
    },
  });

  if (!project) {
    notFound();
  }



  const totalBOMCost = project.project_items.reduce(
    (sum, item) => sum + Number(item.total_amount ?? 0),
    0,
  );

  const actualValue = Number(project.actual_value ?? 0);
  const paidAmount = Number(project.paid_amount ?? 0);
  const remainingDebt = Math.max(0, actualValue - paidAmount);
  const expectedProfit = actualValue - totalBOMCost;
  const percentPaid = actualValue > 0 ? Math.min(100, Math.round((paidAmount / actualValue) * 100)) : 0;

  const customerName =
    project.customers?.company_name ||
    project.customers?.full_name ||
    "Chưa gắn khách hàng";

  const deadlineInfo = getDeadlineInfo(project.due_date, project.status);

  return (
    <div className="p-5 md:p-8 space-y-6">
      {/* 1. Header Card */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <Link
            href="/projects"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Quay lại danh sách dự án
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {project.project_name}
            </h1>
            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              {project.project_code}
            </span>
            <ProjectStatusSelect
              projectId={project.id}
              currentStatus={project.status}
            />
            <DeadlineBadge
              dueDate={project.due_date}
              status={project.status}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Loại hình: {project.project_type || "Chưa phân loại"} • Khách hàng: {customerName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/projects/${project.id}/print`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            🖨️ In báo giá
          </Link>

          <Link
            href={`/projects/${project.id}/items/new`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            + Thêm linh kiện
          </Link>

          <Link
            href={`/projects/${project.id}/edit`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Sửa dự án
          </Link>

          <form action={deleteProject.bind(null, project.id)}>
            <DeleteProjectButton />
          </form>
        </div>
      </div>

      {/* 2. Financial KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Giá trị hợp đồng</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(actualValue)}</p>
          <p className="mt-1 text-xs text-slate-500">Doanh thu dự kiến</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Chi phí linh kiện (BOM)</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(totalBOMCost)}</p>
          <p className="mt-1 text-xs text-slate-500">{project.project_items.length} hạng mục linh kiện</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Đã thanh toán</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(paidAmount)}</p>
          <div className="mt-2 w-full">
            <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
              <span>Tiến độ: {percentPaid}%</span>
              <span>Còn lại: {formatCurrency(remainingDebt)}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percentPaid}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Lợi nhuận dự kiến</p>
          <p className={`mt-2 text-2xl font-bold ${expectedProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
            {formatCurrency(expectedProfit)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {actualValue > 0 ? `Tỷ suất: ${Math.round((expectedProfit / actualValue) * 100)}%` : "Chưa có doanh thu"}
          </p>
        </div>
      </div>

      {/* 3. Customer & Timeline Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Khách hàng & Liên hệ
          </h2>

          {project.customers ? (
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Tên đơn vị / Khách hàng:</span>
                <Link
                  href={`/customers/${project.customers.id}`}
                  className="font-bold text-sm text-blue-600 hover:underline"
                >
                  {project.customers.full_name}
                </Link>
                {project.customers.company_name && (
                  <p className="text-slate-600 font-medium">🏢 {project.customers.company_name}</p>
                )}
              </div>

              <div>
                <span className="text-slate-500 block">Số điện thoại:</span>
                <p className="font-semibold text-slate-800">{project.customers.phone || "Chưa có"}</p>
              </div>

              <div>
                <span className="text-slate-500 block">Email:</span>
                <p className="font-semibold text-slate-800">{project.customers.email || "Chưa có"}</p>
              </div>

              <div>
                <span className="text-slate-500 block">Địa chỉ:</span>
                <p className="font-medium text-slate-700">{project.customers.address || "Chưa có"}</p>
              </div>

              <Link
                href={`/customers/${project.customers.id}`}
                className="mt-4 inline-block text-xs font-bold text-blue-600 hover:underline"
              >
                Xem hồ sơ khách hàng đầy đủ →
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-400">Dự án này chưa được liên kết với khách hàng nào.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Tiến độ & Thời hạn dự án
            </h2>
            <DeadlineBadge
              dueDate={project.due_date}
              status={project.status}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-slate-500 block font-medium">Ngày bắt đầu:</span>
              <p className="mt-1 font-bold text-slate-800 text-sm">{formatDate(project.start_date)}</p>
            </div>

            <div className={`rounded-xl p-3.5 border ${
              deadlineInfo.isOverdue
                ? "bg-red-50/50 border-red-200"
                : "bg-blue-50/50 border-blue-100"
            }`}>
              <span className="text-slate-500 block font-medium">Hạn hoàn thành (Deadline):</span>
              <p className="mt-1 font-bold text-blue-600 text-sm">{formatDate(project.due_date)}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-600">
                {deadlineInfo.text}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-slate-500 block font-medium">Ngày hoàn thành thực tế:</span>
              <p className="mt-1 font-bold text-slate-800 text-sm">{formatDate(project.completed_date)}</p>
            </div>
          </div>

          <div className="mt-4">
            <span className="text-xs text-slate-500 block font-medium">Ghi chú & Yêu cầu kỹ thuật:</span>
            <p className="mt-1 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
              {project.description || "Không có ghi chú kỹ thuật."}
            </p>
          </div>
        </div>
      </div>

      {/* 4. BOM Items List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Danh mục linh kiện dự án ({project.project_items.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Bảng kê vật tư và chi phí linh kiện phục vụ dự án
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/projects/${project.id}/items`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Quản lý chi tiết BOM
            </Link>

            <Link
              href={`/projects/${project.id}/items/new`}
              className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              + Thêm linh kiện
            </Link>
          </div>
        </div>

        {project.project_items.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Chưa có linh kiện nào trong danh mục BOM của dự án này.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Mã linh kiện</th>
                  <th className="px-6 py-3">Tên linh kiện / Vật tư</th>
                  <th className="px-6 py-3">Số lượng</th>
                  <th className="px-6 py-3">Đơn giá dự toán</th>
                  <th className="px-6 py-3">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {project.project_items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-semibold text-blue-600">
                      {item.products?.product_code || "N/A"}
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-800">
                      {item.item_name}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {Number(item.quantity)} {item.products?.unit || ""}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-900">
                      {formatCurrency(item.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Transactions History */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Lịch sử thu chi dự án ({project.transactions.length})
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Các khoản tạm ứng, quyết toán và chi phí thực tế liên quan
          </p>
        </div>

        {project.transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Chưa có phát sinh thu chi nào gắn với dự án này.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Ngày</th>
                  <th className="px-6 py-3">Loại</th>
                  <th className="px-6 py-3">Danh mục</th>
                  <th className="px-6 py-3">Mô tả</th>
                  <th className="px-6 py-3 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {project.transactions.map((tx) => {
                  const isIncome = tx.transaction_type === "income";
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-600">
                        {formatDate(tx.transaction_date)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-bold ${
                            isIncome
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {isIncome ? "Thu (Khách trả)" : "Chi (Phí dự án)"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-700 font-medium">
                        {tx.category || "Khác"}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {tx.description || "—"}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-bold text-sm ${
                          isIncome ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
