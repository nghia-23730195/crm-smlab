import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white">
            SM
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Đăng nhập CRM
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Đăng nhập để quản lý hoạt động của SM-LAB
          </p>
        </div>

        {params.error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {params.error}
          </div>
        )}

        <form
          action={login}
          className="mt-7 space-y-5"
        >
          <input
            type="hidden"
            name="next"
            value={params.next ?? "/"}
          />

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="smlabvn@gmail.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Mật khẩu
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Nhập mật khẩu"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Đăng nhập
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Hệ thống quản lý khách hàng SM-LAB
        </p>
      </section>
    </main>
  );
}
