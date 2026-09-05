"use client";

import { useTransition } from "react";
import { deleteStemModel } from "@/app/stem/actions";

type DeleteStemModelButtonProps = {
  id: string;
  modelName: string;
  className?: string;
  showText?: boolean;
};

export default function DeleteStemModelButton({
  id,
  modelName,
  className = "rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-50 cursor-pointer",
  showText = false,
}: DeleteStemModelButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa mô hình STEM "${modelName}" không? Thao tác này không thể hoàn tác.`
      )
    ) {
      startTransition(async () => {
        await deleteStemModel(id);
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      title="Xóa mô hình STEM"
      className={className}
    >
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      {showText && <span>{isPending ? "Đang xóa..." : "Xóa mô hình"}</span>}
    </button>
  );
}
