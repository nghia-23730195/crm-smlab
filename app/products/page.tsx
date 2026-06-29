import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/current-user";

import ProductStatusToggle from "@/components/ProductStatusToggle";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Product = Awaited<
  ReturnType<typeof prisma.products.findMany>
>[number];

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function getStockStatus(
  stockQuantity: unknown,
  minimumStock: unknown,
) {
  const stock = Number(stockQuantity);
  const minimum = Number(minimumStock);

  if (stock === 0) {
    return "out-of-stock";
  }

  if (stock <= minimum) {
    return "low-stock";
  }

  return "in-stock";
}

function getStatusLabel(status: string) {
  if (status === "in-stock") {
    return "Còn hàng";
  }

  if (status === "low-stock") {
    return "Sắp hết";
  }

  if (status === "out-of-stock") {
    return "Hết hàng";
  }

  if (status === "inactive") {
    return "Ngừng bán";
  }

  return "Tất cả trạng thái";
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const params = await searchParams;

  const keyword = String(params.q ?? "").trim();

  const selectedStatus = String(
    params.status ?? "all",
  ).trim();

  const allProducts: Product[] =
    await prisma.products.findMany({
      where: {
        organization_id: organizationId,

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
              ],
            }
          : {}),
      },

      orderBy: {
        created_at: "desc",
      },
    });

  const products = allProducts.filter((product) => {
    if (selectedStatus === "all") {
      return true;
    }

    if (selectedStatus === "inactive") {
      return !product.is_active;
    }

    if (!product.is_active) {
      return false;
    }

    const stockStatus = getStockStatus(
      product.stock_quantity,
      product.minimum_stock,
    );

    return stockStatus === selectedStatus;
  });

  const hasFilters =
    keyword.length > 0 ||
    selectedStatus !== "all";

  return (
    <div className="p-5 md:p-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Danh sách sản phẩm
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Hiển thị {products.length} sản phẩm
                {hasFilters
                  ? ` trên ${allProducts.length} kết quả tìm kiếm`
                  : " trong hệ thống"}
              </p>
            </div>

            <form
              action="/products"
              method="GET"
              className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row"
            >
              <input
                type="search"
                name="q"
                defaultValue={keyword}
                placeholder="Tìm theo tên, mã hoặc danh mục..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:w-80"
              />

              <select
                name="status"
                defaultValue={selectedStatus}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">
                  Tất cả trạng thái
                </option>

                <option value="in-stock">
                  Còn hàng
                </option>

                <option value="low-stock">
                  Sắp hết
                </option>

                <option value="out-of-stock">
                  Hết hàng
                </option>

                <option value="inactive">
                  Ngừng bán
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
                  href="/products"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Xóa lọc
                </Link>
              )}
            </form>
          </div>

          {hasFilters && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {keyword && (
                <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                  Từ khóa: {keyword}
                </span>
              )}

              {selectedStatus !== "all" && (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                  Trạng thái:{" "}
                  {getStatusLabel(selectedStatus)}
                </span>
              )}
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              Không tìm thấy sản phẩm
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Hãy thử từ khóa khác hoặc xóa bộ lọc hiện tại.
            </p>

            {hasFilters && (
              <Link
                href="/products"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Xem tất cả sản phẩm
              </Link>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1080px] table-fixed">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-[85px] px-3 py-4">
                    Mã
                  </th>

                  <th className="w-[210px] px-3 py-4">
                    Tên sản phẩm
                  </th>

                  <th className="w-[115px] px-3 py-4">
                    Danh mục
                  </th>

                  <th className="w-[70px] px-3 py-4">
                    Đơn vị
                  </th>

                  <th className="w-[115px] px-3 py-4">
                    Giá nhập
                  </th>

                  <th className="w-[115px] px-3 py-4">
                    Giá bán
                  </th>

                  <th className="w-[80px] px-3 py-4">
                    Tồn kho
                  </th>

                  <th className="w-[115px] px-3 py-4">
                    Trạng thái
                  </th>

                  <th className="w-[175px] px-3 py-4">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {products.map((product: Product) => {
                  const stock = Number(
                    product.stock_quantity,
                  );

                  const minimumStock = Number(
                    product.minimum_stock,
                  );

                  const stockStatus =
                    stock === 0
                      ? "Hết hàng"
                      : stock <= minimumStock
                        ? "Sắp hết"
                        : "Còn hàng";

                  const statusClass =
                    stockStatus === "Hết hàng"
                      ? "bg-red-100 text-red-700"
                      : stockStatus === "Sắp hết"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700";

                  return (
                    <tr
                      key={product.id}
                      className="bg-white text-slate-900 transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-blue-600">
                        {product.product_code}
                      </td>

                      <td className="px-3 py-4">
                        <p className="truncate font-semibold text-slate-900">
                          {product.name}
                        </p>

                        {product.description && (
                          <p className="mt-1 truncate text-xs text-slate-600">
                            {product.description}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-4 text-sm text-slate-700">
                        {product.category ??
                          "Chưa phân loại"}
                      </td>

                      <td className="px-3 py-4 text-sm text-slate-700">
                        {product.unit}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-700">
                        {formatCurrency(
                          product.cost_price,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(
                          product.sale_price,
                        )}
                      </td>

                      <td className="px-3 py-4 text-sm font-medium text-slate-900">
                        {product.stock_quantity.toString()}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-center text-xs font-semibold ${
                            product.is_active
                              ? statusClass
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {product.is_active
                            ? stockStatus
                            : "Ngừng bán"}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                          >
                            Sửa
                          </Link>

                          <ProductStatusToggle
                            productId={product.id}
                            productName={product.name}
                            isActive={product.is_active}
                          />
                        </div>
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