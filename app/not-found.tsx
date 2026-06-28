import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-lg text-center">
        <p className="text-sm font-semibold text-blue-600">
          Lá»—i 404
        </p>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          KhÃ´ng tÃ¬m tháº¥y trang
        </h1>

        <p className="mt-3 text-sm text-slate-500">
          Trang báº¡n Ä‘ang truy cáº­p khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ Ä‘Æ°á»£c thay Ä‘á»•i.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Vá» Dashboard
        </Link>
      </div>
    </div>
  );
}
