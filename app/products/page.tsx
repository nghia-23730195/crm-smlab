import Link from "next/link";

import ComponentThumbnail from "@/components/ComponentThumbnail";
import DeleteProductButton from "@/components/DeleteProductButton";
import ProductStatusToggle from "@/components/ProductStatusToggle";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { deleteProduct } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Product = Awaited<
  ReturnType<typeof prisma.products.findMany>
>[number];

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    success?: string;
    error?: string;
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
                {
                  description: {
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
    <div className="p-5 md:p-8 space-y-6">
      {params.success === "created" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Thêm sản phẩm thành công.
        </div>
      )}

      {params.success === "updated" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Cập nhật sản phẩm thành công.
        </div>
      )}

      {params.success === "deleted" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Xóa sản phẩm thành công.
        </div>
      )}

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {params.error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 md:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-slate-900">
              Danh sách sản phẩm & Linh kiện
            </h2>

            <p className="text-xs text-slate-500">
              Hiển thị {products.length} sản phẩm
              {hasFilters
                ? ` trên ${allProducts.length} kết quả lọc`
                : " trong hệ thống SM-LAB"}
            </p>
          </div>

          {/* Quick Filter Pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/products?q=${encodeURIComponent(keyword)}&status=all`}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                selectedStatus === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tất cả ({allProducts.length})
            </Link>

            <Link
              href={`/products?q=${encodeURIComponent(keyword)}&status=in-stock`}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                selectedStatus === "in-stock"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              ✅ Còn hàng
            </Link>

            <Link
              href={`/products?q=${encodeURIComponent(keyword)}&status=low-stock`}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                selectedStatus === "low-stock"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              }`}
            >
              ⚠️ Sắp hết
            </Link>

            <Link
              href={`/products?q=${encodeURIComponent(keyword)}&status=out-of-stock`}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                selectedStatus === "out-of-stock"
                  ? "bg-red-600 text-white border-red-600 shadow-xs"
                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              }`}
            >
              ⛔ Hết hàng
            </Link>

            <Link
              href={`/products?q=${encodeURIComponent(keyword)}&status=inactive`}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                selectedStatus === "inactive"
                  ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
              }`}
            >
              Ngừng bán
            </Link>
          </div>

          {/* Search Form */}
          <form
            action="/products"
            method="GET"
            className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center"
          >
            <input
              type="hidden"
              name="status"
              value={selectedStatus}
            />
            <input
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="Tìm theo tên, mã hoặc danh mục..."
              className="w-full sm:w-80 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="in-stock">Còn hàng</option>
              <option value="low-stock">Sắp hết</option>
              <option value="out-of-stock">Hết hàng</option>
              <option value="inactive">Ngừng bán</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-2xs"
            >
              Tìm kiếm
            </button>

            {hasFilters && (
              <Link
                href="/products"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-base font-bold text-slate-900">
              Không tìm thấy sản phẩm
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Hãy thử từ khóa khác hoặc xóa bộ lọc hiện tại.
            </p>

            {hasFilters ? (
              <Link
                href="/products"
                className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Xem tất cả sản phẩm
              </Link>
            ) : (
              <Link
                href="/products/new"
                className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                + Thêm sản phẩm đầu tiên
              </Link>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Sản phẩm / Linh kiện</th>
                  <th className="px-4 py-3.5">Danh mục</th>
                  <th className="px-4 py-3.5">ĐVT</th>
                  <th className="px-4 py-3.5 text-right">Giá nhập</th>
                  <th className="px-4 py-3.5 text-right">Giá bán</th>
                  <th className="px-4 py-3.5 text-right">Tồn kho</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
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
                      className="bg-white text-slate-900 transition hover:bg-slate-50/80 group"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <ComponentThumbnail
                            imageUrl={product.image_url}
                            name={product.name}
                            category={product.category}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                                {product.product_code}
                              </span>
                              <p className="font-semibold text-slate-900 text-sm">
                                {product.name}
                              </p>
                            </div>
                            {product.description && (
                              <p className="mt-0.5 max-w-sm truncate text-xs text-slate-500">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {product.category ?? "Chưa phân loại"}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {product.unit}
                      </td>

                      <td className="px-4 py-3.5 text-right text-xs font-medium text-slate-700 tabular-nums">
                        {formatCurrency(product.cost_price)}
                      </td>

                      <td className="px-4 py-3.5 text-right text-xs font-bold text-slate-900 tabular-nums">
                        {formatCurrency(product.sale_price)}
                      </td>

                      <td className="px-4 py-3.5 text-right text-sm font-bold text-slate-900 tabular-nums">
                        {product.stock_quantity.toString()}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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

                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Sửa
                          </Link>

                          <ProductStatusToggle
                            productId={product.id}
                            productName={product.name}
                            isActive={product.is_active}
                          />

                          <form action={deleteProduct.bind(null, product.id)}>
                            <DeleteProductButton />
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
      </section>
    </div>
  );
}