export type DeadlineInfo = {
  label: string;
  badgeClass: string;
  isOverdue: boolean;
  daysRemaining: number | null;
  text: string;
  icon: string;
};

export function getDeadlineInfo(
  dueDate: Date | string | null | undefined,
  status: string,
): DeadlineInfo {
  if (status === "completed") {
    return {
      label: "Đã hoàn thành",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      isOverdue: false,
      daysRemaining: null,
      text: "Đã bàn giao",
      icon: "✅",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Đã hủy",
      badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
      isOverdue: false,
      daysRemaining: null,
      text: "Đã hủy",
      icon: "⛔",
    };
  }

  if (!dueDate) {
    return {
      label: "Chưa đặt deadline",
      badgeClass: "bg-slate-50 text-slate-400 border-slate-200",
      isOverdue: false,
      daysRemaining: null,
      text: "Chưa có hạn",
      icon: "⏳",
    };
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setUTCHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: `Quá hạn ${overdueDays} ngày`,
      badgeClass: "bg-red-600 text-white font-black border-red-700 shadow-xs",
      isOverdue: true,
      daysRemaining: diffDays,
      text: `Trễ ${overdueDays} ngày`,
      icon: "🚨",
    };
  }

  if (diffDays === 0) {
    return {
      label: "Hạn chót HÔM NAY",
      badgeClass: "bg-amber-500 text-white font-black border-amber-600 shadow-xs animate-pulse",
      isOverdue: false,
      daysRemaining: 0,
      text: "Hôm nay",
      icon: "⚡",
    };
  }

  if (diffDays <= 3) {
    return {
      label: `Còn ${diffDays} ngày`,
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
      isOverdue: false,
      daysRemaining: diffDays,
      text: `Còn ${diffDays} ngày`,
      icon: "⚠️",
    };
  }

  if (diffDays <= 7) {
    return {
      label: `Còn ${diffDays} ngày`,
      badgeClass: "bg-blue-50 text-blue-800 border-blue-200 font-semibold",
      isOverdue: false,
      daysRemaining: diffDays,
      text: `Còn ${diffDays} ngày`,
      icon: "📅",
    };
  }

  return {
    label: `Còn ${diffDays} ngày`,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
    isOverdue: false,
    daysRemaining: diffDays,
    text: `Còn ${diffDays} ngày`,
    icon: "📆",
  };
}
