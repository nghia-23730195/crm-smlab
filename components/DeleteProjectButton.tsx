"use client";

export default function DeleteProjectButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        const ok = confirm(
          "Bạn có chắc chắn muốn xóa dự án này không?",
        );

        if (!ok) {
          e.preventDefault();
        }
      }}
      className="inline-flex rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
    >
      Xóa
    </button>
  );
}
