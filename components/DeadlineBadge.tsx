import { getDeadlineInfo } from "@/lib/deadline";

export default function DeadlineBadge({
  dueDate,
  status,
  showIcon = true,
}: {
  dueDate: Date | string | null | undefined;
  status: string;
  showIcon?: boolean;
}) {
  const info = getDeadlineInfo(dueDate, status);

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-0.5 text-xs transition ${info.badgeClass}`}
      title={dueDate ? `Hạn chót: ${new Date(dueDate).toLocaleDateString("vi-VN")}` : undefined}
    >
      {showIcon && <span className="text-[11px]">{info.icon}</span>}
      <span>{info.label}</span>
    </span>
  );
}
