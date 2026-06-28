import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { toggleProductActive } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

type Product = Awaited<
  ReturnType<typeof prisma.products.findMany>
>[number];

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export default async function ProductsPage() {
  const products: Product[] =
    await prisma.products.findMany({
      where: {
        organization_id: ORGANIZATION_ID,
      },
      orderBy: {
        created_at: "desc",
      },
    });

  return (
    <div className="p-5 md:p-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Danh sách sản phẩm
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Có {products.length} sản phẩm trong hệ thống
            </p>
          </div>

          <input
            type="search"
            placeholder="Tìm theo tên hoặc mã sản phẩm..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:w-80"
          />
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              Chưa có sản phẩm
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Hãy sử dụng nút Thêm sản phẩm để tạo sản phẩm đầu tiên.
            </p>
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

                          <form
                            action={toggleProductActive.bind(
                              null,
                              product.id,
                            )}
                          >
                            <button
                              type="submit"
                              className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                product.is_active
                                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {product.is_active
                                ? "Ngừng bán"
                                : "Kinh doanh lại"}
                            </button>
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