import Link from "next/link";

export default function ReportsPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Báo cáo
            </h1>

            <p className="mt-2 text-slate-500">
              Tổng hợp báo cáo kinh doanh và hoạt động của SM-LAB.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Về Dashboard
          </Link>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold">Danh sách báo cáo</h2>

          <p className="mt-2 text-slate-500">
            Các báo cáo doanh thu, chi phí và dự án sẽ hiển thị tại đây.
          </p>
        </section>
      </div>
    </main>
  );
}