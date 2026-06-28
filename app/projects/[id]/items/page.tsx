import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { deleteProjectItem } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

type ProjectItemsPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    success?: string;
  }>;
};

const purchaseStatusInformation: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  not_purchased: {
    label: "Chưa mua",
    className:
      "bg-amber-100 text-amber-800",
  },

  purchased: {
    label: "Đã mua",
    className:
      "bg-emerald-100 text-emerald-700",
  },

  cancelled: {
    label: "Đã hủy",
    className:
      "bg-red-100 text-red-700",
  },
};

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export default async function ProjectItemsPage({
  params,
  searchParams,
}: ProjectItemsPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const project =
    await prisma.projects.findFirst({
      where: {
        id,
        organization_id: ORGANIZATION_ID,
      },

      include: {
        customers: {
          select: {
            full_name: true,
            company_name: true,
          },
        },

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
    });

  if (!project) {
    notFound();
  }

  const totalCost =
    project.project_items.reduce(
      (sum, item) =>
        sum + Number(item.total_amount ?? 0),
      0,
    );

  const projectValue =
    Number(project.actual_value) > 0
      ? Number(project.actual_value)
      : Number(project.estimated_value);

  const expectedProfit =
    projectValue - totalCost;

  const customerName =
    project.customers?.company_name ||
    project.customers?.full_name ||
    "Chưa chọn khách hàng";

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        {query.success === "created" && (
          <SuccessMessage>
            Thêm linh kiện thành công.
          </SuccessMessage>
        )}

        {query.success === "updated" && (
          <SuccessMessage>
            Cập nhật linh kiện thành công.
          </SuccessMessage>
        )}

        {query.success === "deleted" && (
          <SuccessMessage>
            Xóa linh kiện thành công.
          </SuccessMessage>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 border-b border-slate-200 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/projects"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                ← Quay lại danh sách dự án
              </Link>

              <h1 className="mt-3 text-2xl font-bold text-slate-900">
                Danh sách linh kiện dự án
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {project.project_code} —{" "}
                {project.project_name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Khách hàng: {customerName}
              </p>
            </div>

          </div>

          {project.project_items.length === 0 ? (
            <div className="p-12 text-center">
              <h2 className="text-lg font-bold text-slate-900">
                Chưa có linh kiện
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Hãy thêm linh kiện đầu tiên cho dự án này.
              </p>

              <Link
                href={`/projects/${project.id}/items/new`}
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Thêm linh kiện
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1350px] w-full">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-4">
                      STT
                    </th>

                    <th className="px-4 py-4">
                      Tên linh kiện
                    </th>

                    <th className="px-4 py-4 text-right">
                      Số lượng
                    </th>

                    <th className="px-4 py-4 text-right">
                      Đơn giá
                    </th>

                    <th className="px-4 py-4 text-right">
                      Giảm giá
                    </th>

                    <th className="px-4 py-4 text-right">
                      Thành tiền
                    </th>

                    <th className="px-4 py-4">
                      Link sản phẩm
                    </th>

                    <th className="px-4 py-4">
                      Trạng thái
                    </th>

                    <th className="px-4 py-4">
                      Ghi chú
                    </th>

                    <th className="px-4 py-4">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {project.project_items.map(
                    (item, index) => {
                      const status =
                        purchaseStatusInformation[
                          item.purchase_status
                        ] ??
                        purchaseStatusInformation
                          .not_purchased;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {index + 1}
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-900">
                              {item.item_name}
                            </p>

                            {item.products && (
                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  item.products
                                    .product_code
                                }{" "}
                                — {item.products.name}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4 text-right text-sm text-slate-700">
                            {formatNumber(
                              item.quantity,
                            )}
                          </td>

                          <td className="px-4 py-4 text-right text-sm font-medium text-slate-700">
                            {formatCurrency(
                              item.unit_price,
                            )}
                          </td>

                          <td className="px-4 py-4 text-right text-sm text-slate-600">
                            {formatCurrency(
                              item.discount,
                            )}
                          </td>

                          <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">
                            {formatCurrency(
                              item.total_amount,
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {item.product_url ? (
                              <a
                                href={item.product_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-semibold text-blue-600 hover:underline"
                              >
                                Xem sản phẩm
                              </a>
                            ) : (
                              <span className="text-sm text-slate-400">
                                Chưa có
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>

                          <td className="max-w-[240px] px-4 py-4 text-sm text-slate-600">
                            <p className="line-clamp-2">
                              {item.notes ||
                                "Không có"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/projects/${project.id}/items/${item.id}/edit`}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                Sửa
                              </Link>

                              <form
                                action={deleteProjectItem.bind(
                                  null,
                                  project.id,
                                  item.id,
                                )}
                              >
                                <button
                                  type="submit"
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                                >
                                  Xóa
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-3">
          <SummaryCard
            label="Tổng chi phí linh kiện"
            value={formatCurrency(totalCost)}
            className="text-red-700"
          />

          <SummaryCard
            label="Giá trị dự án"
            value={formatCurrency(projectValue)}
            className="text-blue-700"
          />

          <SummaryCard
            label="Lợi nhuận dự kiến"
            value={formatCurrency(expectedProfit)}
            className={
              expectedProfit >= 0
                ? "text-emerald-700"
                : "text-red-700"
            }
          />
        </section>
      </div>
    </div>
  );
}

function SuccessMessage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
      {children}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 text-2xl font-bold ${className}`}
      >
        {value}
      </p>
    </article>
  );
}