import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type InventoryPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
  }>;
};


type InventoryStatus =
  | "available"
  | "low_stock"
  | "out_of_stock";

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(
    Number.isFinite(amount)
      ? amount
      : 0,
  );
}

function formatQuantity(value: unknown) {
  const quantity = Number(value ?? 0);

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(
    Number.isFinite(quantity)
      ? quantity
      : 0,
  );
}

function getInventoryStatus(
  stockQuantity: number,
  minimumStock: number,
): {
  value: InventoryStatus;
  label: string;
  className: string;
} {
  if (stockQuantity <= 0) {
    return {
      value: "out_of_stock",
      label: "Hết hàng",
      className:
        "border border-red-200 bg-red-100 text-red-700",
    };
  }

  if (stockQuantity <= minimumStock) {
    return {
      value: "low_stock",
      label: "Sắp hết",
      className:
        "border border-amber-200 bg-amber-100 text-amber-800",
    };
  }

  return {
    value: "available",
    label: "Còn hàng",
    className:
      "border border-emerald-200 bg-emerald-100 text-emerald-700",
  };
}

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const params = await searchParams;

  const keyword = String(
    params.q ?? "",
  ).trim();

  const selectedStatus = String(
    params.status ?? "all",
  ).trim();

  const selectedCategory = String(
    params.category ?? "all",
  ).trim();

  const [
    filteredProducts,
    categoryRecords,
    inventoryProducts,
  ] = await Promise.all([
    prisma.products.findMany({
      where: {
        organization_id: organizationId,
        is_active: true,

        ...(keyword
          ? {
              OR: [
                {
                  product_code: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
                {
                  name: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
                {
                  category: {
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
              ],
            }
          : {}),

        ...(selectedCategory !== "all"
          ? {
              category:
                selectedCategory,
            }
          : {}),
      },

      orderBy: [
        {
          stock_quantity: "asc",
        },
        {
          name: "asc",
        },
      ],
    }),

    prisma.products.findMany({
      where: {
        organization_id: organizationId,
        is_active: true,
        category: {
          not: null,
        },
      },

      select: {
        category: true,
      },

      distinct: ["category"],

      orderBy: {
        category: "asc",
      },
    }),

    prisma.products.findMany({
      where: {
        organization_id: organizationId,
        is_active: true,
      },

      select: {
        stock_quantity: true,
        minimum_stock: true,
        cost_price: true,
      },
    }),
  ]);

  const products =
    filteredProducts.filter(
      (product) => {
        if (selectedStatus === "all") {
          return true;
        }

        const status =
          getInventoryStatus(
            Number(
              product.stock_quantity,
            ),
            Number(
              product.minimum_stock,
            ),
          );

        return (
          status.value ===
          selectedStatus
        );
      },
    );

  const categories = categoryRecords
    .map((record) => record.category)
    .filter(
      (category): category is string =>
        Boolean(category),
    );

  const totalProductTypes =
    inventoryProducts.length;

  const totalQuantity =
    inventoryProducts.reduce(
      (total, product) =>
        total +
        Number(
          product.stock_quantity,
        ),
      0,
    );

  const lowStockCount =
    inventoryProducts.filter(
      (product) => {
        const stock = Number(
          product.stock_quantity,
        );

        const minimumStock = Number(
          product.minimum_stock,
        );

        return (
          stock > 0 &&
          stock <= minimumStock
        );
      },
    ).length;

  const outOfStockCount =
    inventoryProducts.filter(
      (product) =>
        Number(
          product.stock_quantity,
        ) <= 0,
    ).length;

  const totalInventoryValue =
    inventoryProducts.reduce(
      (total, product) =>
        total +
        Number(
          product.stock_quantity,
        ) *
          Number(product.cost_price),
      0,
    );

  const hasFilters =
    keyword.length > 0 ||
    selectedStatus !== "all" ||
    selectedCategory !== "all";

  return (
    <div className="p-5 md:p-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Tổng loại linh kiện"
          value={String(
            totalProductTypes,
          )}
          description="Linh kiện đang hoạt động"
          valueClassName="text-blue-700"
        />

        <SummaryCard
          label="Tổng số lượng tồn"
          value={formatQuantity(
            totalQuantity,
          )}
          description="Tổng số lượng trong kho"
          valueClassName="text-slate-900"
        />

        <SummaryCard
          label="Cảnh báo tồn kho"
          value={`${lowStockCount} sắp hết`}
          description={`${outOfStockCount} linh kiện đã hết`}
          valueClassName="text-amber-700"
        />

        <SummaryCard
          label="Giá trị tồn kho"
          value={formatCurrency(
            totalInventoryValue,
          )}
          description="Tính theo giá nhập hiện tại"
          valueClassName="text-emerald-700"
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Danh sách kho linh kiện
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Hiển thị {products.length} linh kiện
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/inventory/movements"
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Lịch sử nhập xuất
              </Link>

              <Link
                href="/inventory/movements/new"
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                + Tạo phiếu kho
              </Link>
            </div>
          </div>

          <form
            action="/inventory"
            method="GET"
            className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_200px_180px_auto_auto]"
          >
            <input
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="Tìm mã, tên hoặc nhóm linh kiện..."
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              name="category"
              defaultValue={
                selectedCategory
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                Tất cả nhóm
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ),
              )}
            </select>

            <select
              name="status"
              defaultValue={
                selectedStatus
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                Tất cả trạng thái
              </option>

              <option value="available">
                Còn hàng
              </option>

              <option value="low_stock">
                Sắp hết
              </option>

              <option value="out_of_stock">
                Hết hàng
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
                href="/inventory"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-bold text-slate-900">
              Không tìm thấy linh kiện
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Hãy thử bộ lọc khác hoặc thêm linh kiện mới.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/products/new"
                className="inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                + Thêm linh kiện
              </Link>

              <Link
                href="/inventory/movements/new"
                className="inline-flex rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Tạo phiếu kho
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-4">
                    Mã
                  </th>

                  <th className="px-4 py-4">
                    Tên linh kiện
                  </th>

                  <th className="px-4 py-4">
                    Nhóm
                  </th>

                  <th className="px-4 py-4 text-right">
                    Tồn kho
                  </th>

                  <th className="px-4 py-4 text-right">
                    Tồn tối thiểu
                  </th>

                  <th className="px-4 py-4 text-right">
                    Giá nhập
                  </th>

                  <th className="px-4 py-4 text-right">
                    Giá trị tồn
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
                {products.map(
                  (product) => {
                    const stockQuantity =
                      Number(
                        product.stock_quantity,
                      );

                    const minimumStock =
                      Number(
                        product.minimum_stock,
                      );

                    const inventoryValue =
                      stockQuantity *
                      Number(
                        product.cost_price,
                      );

                    const inventoryStatus =
                      getInventoryStatus(
                        stockQuantity,
                        minimumStock,
                      );

                    return (
                      <tr
                        key={product.id}
                        className="bg-white transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-blue-600">
                          {
                            product.product_code
                          }
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {product.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Đơn vị:{" "}
                            {product.unit}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {product.category ||
                            "Chưa phân nhóm"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {formatQuantity(
                              stockQuantity,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {product.unit}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-right text-sm text-slate-600">
                          {formatQuantity(
                            minimumStock,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-medium text-slate-700">
                          {formatCurrency(
                            product.cost_price,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">
                          {formatCurrency(
                            inventoryValue,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${inventoryStatus.className}`}
                          >
                            {
                              inventoryStatus.label
                            }
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/products/${product.id}/edit`}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                              Sửa
                            </Link>

                            <Link
                              href="/inventory/movements/new"
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Nhập/Xuất
                            </Link>
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
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  valueClassName,
}: {
  label: string;
  value: string;
  description: string;
  valueClassName: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 text-2xl font-bold ${valueClassName}`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </article>
  );
}
