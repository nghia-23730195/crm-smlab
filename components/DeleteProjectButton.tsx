"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "@/app/projects/actions";

type DeleteProjectButtonProps = {
  projectId?: string;
  projectName?: string;
  className?: string;
  redirectTo?: string;
};

export default function DeleteProjectButton({
  projectId,
  projectName,
  className,
  redirectTo,
}: DeleteProjectButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (projectId) {
      e.preventDefault();
      const message = projectName
        ? `Bạn có chắc chắn muốn xóa dự án "${projectName}" không? Thao tác này không thể hoàn tác.`
        : "Bạn có chắc chắn muốn xóa dự án này không? Thao tác này không thể hoàn tác.";

      if (window.confirm(message)) {
        startTransition(async () => {
          try {
            const res = await deleteProject(projectId);
            if (!res.success) {
              alert(res.error || "Không thể xóa dự án.");
              return;
            }
            if (redirectTo) {
              router.push(redirectTo);
            }
          } catch (err: unknown) {
            console.error("Lỗi khi xóa dự án:", err);
            const msg = err instanceof Error ? err.message : "";
            if (
              msg &&
              !msg.includes("NEXT_REDIRECT") &&
              !msg.includes("Server Components render")
            ) {
              alert(msg);
            }
          }
        });
      }
    } else {
      const ok = confirm("Bạn có chắc chắn muốn xóa dự án này không?");
      if (!ok) {
        e.preventDefault();
      }
    }
  };

  return (
    <button
      type={projectId ? "button" : "submit"}
      onClick={handleClick}
      disabled={isPending}
      className={
        className ??
        "inline-flex rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 cursor-pointer"
      }
    >
      {isPending ? "Đang xóa..." : "Xóa"}
    </button>
  );
}
