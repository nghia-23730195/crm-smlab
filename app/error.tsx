"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
          Đã xảy ra lỗi
        </p>

        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Không thể hoàn thành thao tác
        </h1>

        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          {error.message && !error.message.includes("Server Components render")
            ? error.message
            : "Hệ thống gặp sự cố tạm thời khi tải dữ liệu. Bạn có thể nhấn thử lại hoặc quay lại trang trước."}
        </p>

        {error.digest && (
          <p className="mt-3 text-[11px] font-mono text-slate-400 bg-slate-100 py-1 px-2.5 rounded-lg inline-block">
            Digest: {error.digest}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/finance"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
          >
            Quay lại sổ quỹ
          </Link>

          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 shadow-2xs cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    </div>
  );
}