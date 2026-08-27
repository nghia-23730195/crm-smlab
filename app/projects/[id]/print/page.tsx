import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import PrintTriggerButton from "@/components/PrintTriggerButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PrintProjectPageProps = {
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
    return "........................";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(value);
}

export default async function PrintProjectPage({
  params,
}: PrintProjectPageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const { id } = await params;

  const [project, organization] = await Promise.all([
    prisma.projects.findFirst({
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
      },
    }),
    prisma.organizations.findUnique({
      where: {
        id: organizationId,
      },
    }),
  ]);

  if (!project) {
    notFound();
  }

  const totalBOMCost = project.project_items.reduce(
    (sum, item) => sum + Number(item.total_amount ?? 0),
    0,
  );

  const actualValue = Number(project.actual_value ?? 0);
  const paidAmount = Number(project.paid_amount ?? 0);
  const remainingAmount = Math.max(0, actualValue - paidAmount);

  const customerName =
    project.customers?.company_name ||
    project.customers?.full_name ||
    "Khách hàng";

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:bg-white print:p-0">
      {/* Print / Navigation Toolbar - Hidden during print */}
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          ← Quay lại chi tiết dự án
        </Link>

        <div className="flex items-center gap-3">
          <PrintTriggerButton />
        </div>
      </div>

      {/* Printable Document (A4 format) */}
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm print:border-none print:p-0 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
              {organization?.name || "SM-LAB WORKSHOP"}
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              📍 {organization?.address || "Địa chỉ xưởng SM-LAB"}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              📞 Hotline: {organization?.phone || "09xx.xxx.xxx"} • ✉️ Email: {organization?.email || "contact@smlab.vn"}
            </p>
            {organization?.tax_code && (
              <p className="mt-0.5 text-xs text-slate-600">
                Mã số thuế: {organization.tax_code}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="inline-block rounded-md bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              BẢNG BÁO GIÁ & DỰ TOÁN
            </span>
            <p className="mt-2 text-xs font-bold text-slate-800">
              Mã dự án: <span className="text-blue-600">{project.project_code}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Ngày lập: {formatDate(new Date())}
            </p>
          </div>
        </div>

        {/* Project & Customer Information */}
        <div className="mt-6 grid grid-cols-2 gap-6 rounded-xl bg-slate-50 p-5 text-xs">
          <div>
            <p className="font-bold uppercase text-slate-500">Thông tin khách hàng:</p>
            <p className="mt-1.5 text-sm font-bold text-slate-900">{customerName}</p>
            {project.customers && (
              <>
                <p className="mt-1 text-slate-600">Người liên hệ: {project.customers.full_name}</p>
                <p className="mt-0.5 text-slate-600">Điện thoại: {project.customers.phone || "Chưa có"}</p>
                <p className="mt-0.5 text-slate-600">Địa chỉ: {project.customers.address || "Chưa có"}</p>
              </>
            )}
          </div>

          <div>
            <p className="font-bold uppercase text-slate-500">Thông tin dự án:</p>
            <p className="mt-1.5 text-sm font-bold text-slate-900">{project.project_name}</p>
            <p className="mt-1 text-slate-600">Loại hình: {project.project_type || "Gia công & chế tạo"}</p>
            <p className="mt-0.5 text-slate-600">Ngày bắt đầu: {formatDate(project.start_date)}</p>
            <p className="mt-0.5 text-slate-600">Hạn bàn giao: {formatDate(project.due_date)}</p>
          </div>
        </div>

        {/* BOM Items Table */}
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            I. Danh mục linh kiện & Chi phí vật tư (BOM)
          </h2>

          <table className="mt-3 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-700">
                <th className="border border-slate-300 p-2 text-center w-12">STT</th>
                <th className="border border-slate-300 p-2">Tên linh kiện / Vật tư</th>
                <th className="border border-slate-300 p-2 text-center w-16">ĐVT</th>
                <th className="border border-slate-300 p-2 text-right w-20">SL</th>
                <th className="border border-slate-300 p-2 text-right w-28">Đơn giá</th>
                <th className="border border-slate-300 p-2 text-right w-24">Chiết khấu</th>
                <th className="border border-slate-300 p-2 text-right w-32">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {project.project_items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-slate-300 p-4 text-center text-slate-400">
                    Chưa có linh kiện trong bảng dự toán.
                  </td>
                </tr>
              ) : (
                project.project_items.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-2 text-center">{index + 1}</td>
                    <td className="border border-slate-300 p-2">
                      <p className="font-bold text-slate-900">{item.item_name}</p>
                      {item.products && (
                        <p className="text-[11px] text-slate-500">Mã kho: {item.products.product_code}</p>
                      )}
                    </td>
                    <td className="border border-slate-300 p-2 text-center">{item.products?.unit || "Cái"}</td>
                    <td className="border border-slate-300 p-2 text-right font-semibold">{Number(item.quantity)}</td>
                    <td className="border border-slate-300 p-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="border border-slate-300 p-2 text-right text-slate-500">{formatCurrency(item.discount)}</td>
                    <td className="border border-slate-300 p-2 text-right font-bold text-slate-900">{formatCurrency(item.total_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold">
                <td colSpan={6} className="border border-slate-300 p-2 text-right uppercase">
                  Tổng chi phí linh kiện:
                </td>
                <td className="border border-slate-300 p-2 text-right text-sm text-slate-900">
                  {formatCurrency(totalBOMCost)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            II. Tổng kết giá trị hợp đồng & Thanh toán
          </h2>

          <div className="mt-3 flex justify-end">
            <div className="w-80 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Tổng giá trị dự án:</span>
                <span className="text-sm font-black text-blue-600">{formatCurrency(actualValue)}</span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-600">Đã thanh toán tạm ứng:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(paidAmount)}</span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-slate-800">Số tiền còn lại cần thanh toán:</span>
                <span className="text-sm text-amber-600">{formatCurrency(remainingAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Notes */}
        <div className="mt-6 rounded-xl border border-slate-200 p-4 text-xs text-slate-600">
          <p className="font-bold text-slate-800">Điều khoản & Ghi chú:</p>
          <p className="mt-1">1. Báo giá có hiệu lực trong vòng 15 ngày kể từ ngày lập.</p>
          <p className="mt-0.5">2. Thời gian bảo hành theo tiêu chuẩn linh kiện chính hãng của SM-LAB.</p>
          <p className="mt-0.5">3. Quý khách vui lòng thanh toán theo tiến độ đã thỏa thuận.</p>
          {project.description && (
            <p className="mt-1 font-medium text-slate-800">Ghi chú dự án: {project.description}</p>
          )}
        </div>

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <p className="font-bold uppercase text-slate-800">ĐẠI DIỆN KHÁCH HÀNG</p>
            <p className="text-slate-400 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
            <div className="h-24" />
            <p className="font-bold text-slate-700">{customerName}</p>
          </div>

          <div>
            <p className="font-bold uppercase text-slate-800">ĐẠI DIỆN SM-LAB</p>
            <p className="text-slate-400 italic mt-0.5">(Ký và đóng dấu)</p>
            <div className="h-24" />
            <p className="font-bold text-slate-700">{organization?.name || "SM-LAB WORKSHOP"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
