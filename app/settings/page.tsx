import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cài đặt</h1>

            <p className="mt-2 text-slate-500">
              Cấu hình tài khoản và hệ thống CRM.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold"
          >
            Về Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}