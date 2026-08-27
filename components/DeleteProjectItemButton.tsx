"use client";

export default function DeleteProjectItemButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        const ok = confirm(
          "Bạn có chắc chắn muốn xóa linh kiện này khỏi dự án?",
        );

        if (!ok) {
          e.preventDefault();
        }
      }}
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
    >
      Xóa
    </button>
  );
}
