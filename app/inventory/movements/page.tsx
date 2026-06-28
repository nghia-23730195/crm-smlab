import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

type InventoryMovementsPageProps = {
  searchParams: Promise<{
    type?: string;
    product?: string;
    success?: string;
  }>;
};

const movementInformation: Record<
  string,
  {
    label: string;
    className: string;
    symbol: string;
  }
> = {
  import: {
    label: "Nhập kho",
    className:
      "bg-emerald-100 text-emerald-700",
    symbol: "+",
  },

  project_use: {
    label: "Xuất cho dự án",
    className:
      "bg-blue-100 text-blue-700",
    symbol: "−",
  },

  return: {
    label: "Hoàn kho",
    className:
      "bg-violet-100 text-violet-700",
    symbol: "+",
  },

  adjustment_in: {
    label: "Điều chỉnh tăng",
    className:
      "bg-cyan-100 text-cyan-700",
    symbol: "+",
  },

  adjustment_out: {
    label: "Điều chỉnh giảm",
    className:
      "bg-amber-100 text-amber-800",
    symbol: "−",
  },
};

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatQuantity(value: unknown) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

export default async function InventoryMovementsPage({
  searchParams,
}: InventoryMovementsPageProps) {
  const params = await searchParams;

  const selectedType = String(
    params.type ?? "all",
  );

  const selectedProduct = String(
    params.product ?? "all",
  );

  const [movements, products] =
    await Promise.all([
      prisma.inventory_movements.findMany({
        where: {
          organization_id:
            ORGANIZATION_ID,

          ...(selectedType !== "all"
            ? {
                movement_type:
                  selectedType,
              }
            : {}),

          ...(selectedProduct !== "all"
            ? {
                product_id:
                  selectedProduct,
              }
            : {}),
        },

        include: {
          products: {
            select: {
              product_code: true,
              name: true,
              unit: true,
            },
          },

          projects: {
            select: {
              project_code: true,
              project_name: true,
            },
          },
        },

        orderBy: {
          created_at: "desc",
        },

        take: 200,
      }),

      prisma.products.findMany({
        where: {
          organization_id:
            ORGANIZATION_ID,
          is_active: true,
        },

        select: {
          id: true,
          product_code: true,
          name: true,
        },

        orderBy: {
          name: "asc",
        },
      }),
    ]);

  const hasFilters =
    selectedType !== "all" ||
    selectedProduct !== "all";

  return (
    <div className="p-5 md:p-8">
      {params.success === "created" && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Tạo phiếu kho thành công.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Lịch sử nhập xuất kho
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Hiển thị {movements.length} giao dịch gần nhất
              </p>
            </div>

            <Link
              href="/inventory"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              ← Quay lại kho linh kiện
            </Link>
          </div>

          <form
            action="/inventory/movements"
            method="GET"
            className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_minmax(260px,1fr)_auto_auto]"
          >
            <select
              name="type"
              defaultValue={selectedType}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                Tất cả loại giao dịch
              </option>

              <option value="import">
                Nhập kho
              </option>

              <option value="project_use">
                Xuất cho dự án
              </option>

              <option value="return">
                Hoàn kho
              </option>

              <option value="adjustment_in">
                Điều chỉnh tăng
              </option>

              <option value="adjustment_out">
                Điều chỉnh giảm
              </option>
            </select>

            <select
              name="product"
              defaultValue={selectedProduct}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                Tất cả linh kiện
              </option>

              {products.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.product_code} -{" "}
                  {product.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Lọc
            </button>

            {hasFilters && (
              <Link
                href="/inventory/movements"
                className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {movements.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-bold text-slate-900">
              Chưa có giao dịch kho
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Hãy tạo phiếu nhập hoặc xuất kho đầu tiên.
            </p>

            <Link
              href="/inventory/movements/new"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Tạo phiếu kho
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-4">
                    Thời gian
                  </th>

                  <th className="px-4 py-4">
                    Loại
                  </th>

                  <th className="px-4 py-4">
                    Linh kiện
                  </th>

                  <th className="px-4 py-4">
                    Dự án
                  </th>

                  <th className="px-4 py-4 text-right">
                    Số lượng
                  </th>

                  <th className="px-4 py-4 text-right">
                    Đơn giá
                  </th>

                  <th className="px-4 py-4 text-right">
                    Tồn trước
                  </th>

                  <th className="px-4 py-4 text-right">
                    Tồn sau
                  </th>

                  <th className="px-4 py-4">
                    Ghi chú
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {movements.map((movement) => {
                  const information =
                    movementInformation[
                      movement.movement_type
                    ] ?? {
                      label:
                        movement.movement_type,
                      className:
                        "bg-slate-100 text-slate-700",
                      symbol: "",
                    };

                  return (
                    <tr
                      key={movement.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                        {formatDateTime(
                          movement.created_at,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${information.className}`}
                        >
                          {information.label}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {movement.products.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            movement.products
                              .product_code
                          }
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {movement.projects
                          ? `${movement.projects.project_code} - ${movement.projects.project_name}`
                          : "Không có"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span
                          className={
                            information.symbol === "+"
                              ? "font-bold text-emerald-700"
                              : "font-bold text-red-700"
                          }
                        >
                          {information.symbol}
                          {formatQuantity(
                            movement.quantity,
                          )}
                        </span>

                        <span className="ml-1 text-xs text-slate-500">
                          {movement.products.unit}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right text-sm text-slate-700">
                        {formatCurrency(
                          movement.unit_price,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-sm text-slate-600">
                        {formatQuantity(
                          movement.stock_before,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">
                        {formatQuantity(
                          movement.stock_after,
                        )}
                      </td>

                      <td className="max-w-[250px] px-4 py-4 text-sm text-slate-600">
                        {movement.notes ||
                          "Không có"}
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
