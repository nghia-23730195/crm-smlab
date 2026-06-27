import Link from "next/link";

export default function ProductsPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quản lý sản phẩm</h1>

            <p className="mt-2 text-slate-500">
              Quản lý sản phẩm, giá bán và tồn kho.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold"
          >
            Về Dashboard
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p>Danh sách sản phẩm sẽ được xây dựng tại đây.</p>
        </div>
      </div>
    </main>
  );
}