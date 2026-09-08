"use client";

import { useEffect } from "react";
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
  const isServerActionSkew =
    error.message?.includes("was not found on the server") ||
    error.message?.includes("failed-to-find-server-action");

  useEffect(() => {
    if (isServerActionSkew) {
      const key = "next_action_reload_attempt";
      const lastAttempt = sessionStorage.getItem(key);
      // Tự động tải lại trang 1 lần nếu gặp lỗi phiên bản cũ (deployment skew)
      if (!lastAttempt || Date.now() - Number(lastAttempt) > 15000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.href = window.location.pathname;
      }
    }
  }, [isServerActionSkew]);

  const handleAction = () => {
    if (isServerActionSkew) {
      sessionStorage.removeItem("next_action_reload_attempt");
      window.location.href = window.location.pathname;
    } else {
      reset();
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-2xs ${
          isServerActionSkew
            ? "bg-amber-50 text-amber-600 border-amber-200"
            : "bg-rose-50 text-rose-600 border-rose-200"
        }`}>
          {isServerActionSkew ? (
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>

        <p className={`text-xs font-bold uppercase tracking-wider ${
          isServerActionSkew ? "text-amber-600" : "text-rose-600"
        }`}>
          {isServerActionSkew ? "Cập nhật phiên bản mới" : "Đã xảy ra lỗi"}
        </p>

        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {isServerActionSkew ? "Hệ thống vừa cập nhật" : "Không thể hoàn thành thao tác"}
        </h1>

        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          {isServerActionSkew
            ? "Hệ thống vừa cập nhật phiên bản mới trên máy chủ trong lúc tab trình duyệt đang mở. Vui lòng nhấn 'Tải lại trang' để nhận mã phiên bản mới nhất."
            : error.message && !error.message.includes("Server Components render")
            ? error.message
            : "Hệ thống gặp sự cố tạm thời khi tải dữ liệu. Bạn có thể nhấn thử lại hoặc quay lại trang trước."}
        </p>

        {error.digest && !isServerActionSkew && (
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
            onClick={handleAction}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 shadow-2xs cursor-pointer"
          >
            {isServerActionSkew ? "Tải lại trang (F5)" : "Thử lại"}
          </button>
        </div>
      </div>
    </div>
  );
}
