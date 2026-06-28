"use client";

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
      <div className="max-w-lg text-center">
        <p className="text-sm font-semibold text-red-600">
          Đã xảy ra lỗi
        </p>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Không thể hoàn thành thao tác
        </h1>

        <p className="mt-3 text-sm text-slate-500">
          {error.message ||
            "Hệ thống gặp lỗi không xác định."}
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}