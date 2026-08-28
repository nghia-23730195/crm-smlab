import Link from "next/link";

import ComponentThumbnail from "@/components/ComponentThumbnail";
import ExportCsvButton from "@/components/ExportCsvButton";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type InventoryPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    view?: string;
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
  badgeClass: string;
} {
  if (stockQuantity <= 0) {
    return {
      value: "out_of_stock",
      label: "Hết hàng",
      className:
        "border border-red-200 bg-red-50 text-red-700",
      badgeClass: "bg-red-500",
    };
  }

  if (stockQuantity <= minimumStock) {
    return {
      value: "low_stock",
      label: "Sắp hết",
      className:
        "border border-amber-200 bg-amber-50 text-amber-800",
      badgeClass: "bg-amber-500",
    };
  }

  return {
    value: "available",
    label: "Còn hàng",
    className:
      "border border-emerald-200 bg-emerald-50 text-emerald-700",
    badgeClass: "bg-emerald-500",
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

  const viewMode = String(
    params.view ?? "table",
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
              category: selectedCategory,
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

  const categories = categoryRecords
    .map((record) => record.category)
    .filter(
      (
        category,
      ): category is string =>
        Boolean(category),
    );

  const products =
    filteredProducts.filter(
      (product) => {
        const stockQuantity =
          Number(
            product.stock_quantity,
          );

        const minimumStock =
          Number(
            product.minimum_stock,
          );

        const status =
          getInventoryStatus(
            stockQuantity,
            minimumStock,
          ).value;

        if (selectedStatus === "all") {
          return true;
        }

        return (
          status === selectedStatus
        );
      },
    );

  const totalProductTypes =
    inventoryProducts.length;

  let totalItemsInStock = 0;
  let totalInventoryValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const item of inventoryProducts) {
    const stock = Number(
      item.stock_quantity,
    );

    const minStock = Number(
      item.minimum_stock,
    );

    const costPrice = Number(
      item.cost_price,
    );

    totalItemsInStock += stock;
    totalInventoryValue +=
      stock * costPrice;

    if (stock <= 0) {
      outOfStockCount += 1;
    } else if (stock <= minStock) {
      lowStockCount += 1;
    }
  }

  const hasFilters =
    keyword !== "" ||
    selectedStatus !== "all" ||
    selectedCategory !== "all";

  const exportHeaders = [
    "Mã linh kiện",
    "Tên linh kiện",
    "Nhóm",
    "Đơn vị",
    "Tồn kho",
    "Tồn tối thiểu",
    "Giá nhập",
    "Giá bán",
    "Giá trị tồn",
    "Trạng thái tồn kho",
  ];

  const exportRows = products.map((product) => {
    const stockQuantity = Number(product.stock_quantity);
    const minimumStock = Number(product.minimum_stock);
    const inventoryValue = stockQuantity * Number(product.cost_price);
    const status = getInventoryStatus(stockQuantity, minimumStock);

    return [
      product.product_code,
      product.name,
      product.category || "Chưa phân nhóm",
      product.unit,
      stockQuantity,
      minimumStock,
      Number(product.cost_price),
      Number(product.sale_price),
      inventoryValue,
      status.label,
    ];
  });

  return (
    <div className="space-y-8 p-5 md:p-8">
      {/* 1. Header with Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              Kho linh kiện & Vật tư
            </h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
              {totalProductTypes} mã linh kiện
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi định mức tồn kho, hình ảnh minh họa và cảnh báo nhập xuất SM-LAB.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportCsvButton
            filename="kho-linh-kien-smlab.csv"
            headers={exportHeaders}
            rows={exportRows}
          />

          <Link
            href="/inventory/movements/new"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 shadow-2xs"
          >
            📦 Lập phiếu kho
          </Link>

          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 shadow-2xs"
          >
            + Thêm linh kiện mới
          </Link>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Tổng loại linh kiện"
          value={`${totalProductTypes} loại`}
          description={`Tổng số lượng tồn: ${formatQuantity(totalItemsInStock)}`}
          valueClassName="text-slate-900"
        />

        <SummaryCard
          label="Giá trị tồn kho"
          value={formatCurrency(totalInventoryValue)}
          description="Tính theo đơn giá nhập gần nhất"
          valueClassName="text-blue-600"
        />

        <SummaryCard
          label="Linh kiện sắp hết"
          value={`${lowStockCount} loại`}
          description="Đang ở mức hoặc dưới tồn tối thiểu"
          valueClassName={
            lowStockCount > 0
              ? "text-amber-600"
              : "text-slate-900"
          }
        />

        <SummaryCard
          label="Linh kiện hết hàng"
          value={`${outOfStockCount} loại`}
          description="Cần nhập hàng ngay để kịp dự án"
          valueClassName={
            outOfStockCount > 0
              ? "text-red-600"
              : "text-slate-900"
          }
        />
      </section>

      {/* 3. Filter & View Switcher Box */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/inventory?q=${encodeURIComponent(keyword)}&category=${encodeURIComponent(selectedCategory)}&status=all&view=${viewMode}`}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedStatus === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Tất cả ({totalProductTypes})
            </Link>

            <Link
              href={`/inventory?q=${encodeURIComponent(keyword)}&category=${encodeURIComponent(selectedCategory)}&status=low_stock&view=${viewMode}`}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedStatus === "low_stock"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              }`}
            >
              ⚠️ Sắp hết ({lowStockCount})
            </Link>

            <Link
              href={`/inventory?q=${encodeURIComponent(keyword)}&category=${encodeURIComponent(selectedCategory)}&status=out_of_stock&view=${viewMode}`}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedStatus === "out_of_stock"
                  ? "bg-red-600 text-white border-red-600 shadow-xs"
                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              }`}
            >
              ⛔ Hết hàng ({outOfStockCount})
            </Link>

            <Link
              href={`/inventory?q=${encodeURIComponent(keyword)}&category=${encodeURIComponent(selectedCategory)}&status=available&view=${viewMode}`}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedStatus === "available"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              ✅ Còn hàng ({totalProductTypes - lowStockCount - outOfStockCount})
            </Link>
          </div>

          {/* View Mode Toggle: Table View vs Gallery Grid */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <Link
              href={`/inventory?q=${encodeURIComponent(keyword)}&category=${encodeURIComponent(selectedCategory)}&status=${selectedStatus}&view=table`}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "table"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📋 Danh sách
            </Link>

            <Link
              href={`/inventory?q=${encodeURIComponent(keyword)}&category=${encodeURIComponent(selectedCategory)}&status=${selectedStatus}&view=grid`}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "grid"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🖼️ Thư viện hình ảnh
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <form
          action="/inventory"
          method="GET"
          className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_200px_180px_auto_auto]"
        >
          <input type="hidden" name="status" value={selectedStatus} />
          <input type="hidden" name="view" value={viewMode} />

          <input
            type="search"
            name="q"
            defaultValue={keyword}
            placeholder="Tìm mã, tên hoặc nhóm linh kiện..."
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <select
            name="category"
            defaultValue={selectedCategory}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Tất cả nhóm linh kiện</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={selectedStatus}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="available">Còn hàng</option>
            <option value="low_stock">Sắp hết</option>
            <option value="out_of_stock">Hết hàng</option>
          </select>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Tìm kiếm
          </button>

          {hasFilters && (
            <Link
              href={`/inventory?view=${viewMode}`}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Xóa lọc
            </Link>
          )}
        </form>

        {/* 4. Display Products (Empty / Table / Grid) */}
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
                className="inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                + Thêm linh kiện
              </Link>
              <Link
                href="/inventory/movements/new"
                className="inline-flex rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Tạo phiếu kho
              </Link>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* GALLERY GRID VIEW (THƯ VIỆN HÌNH ẢNH) */
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const stockQuantity = Number(product.stock_quantity);
              const minimumStock = Number(product.minimum_stock);
              const costPrice = Number(product.cost_price);
              const inventoryValue = stockQuantity * costPrice;
              const inventoryStatus = getInventoryStatus(stockQuantity, minimumStock);

              const stockPercent =
                minimumStock > 0
                  ? Math.min(100, Math.round((stockQuantity / (minimumStock * 2)) * 100))
                  : stockQuantity > 0
                  ? 100
                  : 0;

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                >
                  <div>
                    {/* Top image & status badge */}
                    <div className="relative mb-3 flex items-center justify-center rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                      <ComponentThumbnail
                        imageUrl={product.image_url}
                        name={product.name}
                        category={product.category}
                        size="xl"
                        className="shadow-sm group-hover:scale-105"
                      />

                      <span
                        className={`absolute top-2 right-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${inventoryStatus.className}`}
                      >
                        {inventoryStatus.label}
                      </span>
                    </div>

                    {/* Component Info */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                          {product.product_code}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {product.category || "Linh kiện"}
                        </span>
                      </div>

                      <h3
                        title={product.name}
                        className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug pt-1"
                      >
                        {product.name}
                      </h3>
                    </div>

                    {/* Stock Progress & Metrics */}
                    <div className="mt-3.5 rounded-xl bg-slate-50/80 p-3 border border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-600">Tồn kho hiện tại:</span>
                        <strong
                          className={`tabular-nums ${
                            stockQuantity <= 0
                              ? "text-red-600 font-bold"
                              : stockQuantity <= minimumStock
                              ? "text-amber-600 font-bold"
                              : "text-emerald-700 font-bold"
                          }`}
                        >
                          {formatQuantity(stockQuantity)} {product.unit}
                        </strong>
                      </div>

                      {/* Stock Visual Progress */}
                      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            stockQuantity <= 0
                              ? "bg-red-500"
                              : stockQuantity <= minimumStock
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.max(5, stockPercent)}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Tối thiểu: {formatQuantity(minimumStock)}</span>
                        <span>Đơn giá: {formatCurrency(costPrice)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Tổng: <strong className="text-slate-800">{formatCurrency(inventoryValue)}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/products/${product.id}/edit`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        Sửa
                      </Link>
                      <Link
                        href="/inventory/movements/new"
                        className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                      >
                        Xuất/Nhập
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW (DANH SÁCH BẢNG) */
          <div className="mt-6 w-full overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Linh kiện & Hình ảnh</th>
                  <th className="px-4 py-3.5">Nhóm</th>
                  <th className="px-4 py-3.5 text-right">Tồn kho</th>
                  <th className="px-4 py-3.5 text-right">Tồn tối thiểu</th>
                  <th className="px-4 py-3.5 text-right">Giá nhập</th>
                  <th className="px-4 py-3.5 text-right">Giá trị tồn</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {products.map((product) => {
                  const stockQuantity = Number(product.stock_quantity);
                  const minimumStock = Number(product.minimum_stock);
                  const inventoryValue = stockQuantity * Number(product.cost_price);
                  const inventoryStatus = getInventoryStatus(stockQuantity, minimumStock);

                  return (
                    <tr
                      key={product.id}
                      className="bg-white transition hover:bg-slate-50/80 group"
                    >
                      {/* Product Thumbnail & Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <ComponentThumbnail
                            imageUrl={product.image_url}
                            name={product.name}
                            category={product.category}
                            size="md"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                                {product.product_code}
                              </span>
                              <p className="font-semibold text-slate-900 text-sm">
                                {product.name}
                              </p>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Đơn vị: <strong className="text-slate-700">{product.unit}</strong>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs font-medium text-slate-600">
                        {product.category || "Chưa phân nhóm"}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <p
                          className={`text-sm font-bold tabular-nums ${
                            stockQuantity <= 0
                              ? "text-red-600"
                              : stockQuantity <= minimumStock
                              ? "text-amber-600"
                              : "text-slate-900"
                          }`}
                        >
                          {formatQuantity(stockQuantity)}
                        </p>
                        <p className="text-[11px] text-slate-400">{product.unit}</p>
                      </td>

                      <td className="px-4 py-3.5 text-right text-xs text-slate-600 tabular-nums">
                        {formatQuantity(minimumStock)}
                      </td>

                      <td className="px-4 py-3.5 text-right text-xs font-medium text-slate-700 tabular-nums">
                        {formatCurrency(product.cost_price)}
                      </td>

                      <td className="px-4 py-3.5 text-right text-xs font-bold text-slate-900 tabular-nums">
                        {formatCurrency(inventoryValue)}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${inventoryStatus.className}`}
                        >
                          {inventoryStatus.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Sửa
                          </Link>
                          <Link
                            href="/inventory/movements/new"
                            className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                          >
                            Nhập/Xuất
                          </Link>
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
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClassName}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </article>
  );
}
