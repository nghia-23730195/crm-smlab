"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatProjectTitle } from "@/lib/formatters";

type NotificationData = {
  deadlines: {
    id: string;
    project_code: string;
    project_name: string;
    customer_name: string;
    due_date: string;
    isOverdue: boolean;
    diffDays: number;
    text: string;
  }[];
  inventory: {
    id: string;
    product_code: string;
    name: string;
    stock_quantity: number;
    minimum_stock: number;
    unit: string;
    isOutOfStock: boolean;
    text: string;
  }[];
  debts: {
    id: string;
    project_code: string;
    project_name: string;
    customer_name: string;
    actual_value: number;
    paid_amount: number;
    debt_amount: number;
  }[];
  activities: {
    id: string;
    text: string;
    action: string;
    entity_type: string;
    created_at: string;
  }[];
  totalAlerts: number;
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày trước`;

  return date.toLocaleDateString("vi-VN");
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"deadlines" | "inventory" | "debts" | "activities">("deadlines");
  const [data, setData] = useState<NotificationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Lỗi tải thông báo:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/notifications");
        if (res.ok && isMounted) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error("Lỗi tải thông báo:", e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    const interval = setInterval(() => {
      void load();
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const deadlinesCount = data?.deadlines.length ?? 0;
  const inventoryCount = data?.inventory.length ?? 0;
  const debtsCount = data?.debts.length ?? 0;
  const activitiesCount = data?.activities.length ?? 0;
  const totalCount = data?.totalAlerts ?? 0;

  const hasCriticalAlert =
    (data?.deadlines.some((d) => d.isOverdue) ?? false) ||
    (data?.inventory.some((i) => i.isOutOfStock) ?? false);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        title="Trung tâm thông báo & Cảnh báo"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 shadow-2xs"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Notification Count Badge */}
        {totalCount > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-black text-white shadow-xs ${
              hasCriticalAlert ? "bg-red-600 animate-pulse" : "bg-blue-600"
            }`}
          >
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] sm:w-[440px] rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🔔</span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Trung tâm cảnh báo
                </h3>
                <p className="text-[11px] text-slate-500">
                  {totalCount > 0
                    ? `${totalCount} vấn đề cần chú ý`
                    : "Hệ thống đang hoạt động ổn định"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchNotifications}
              title="Làm mới"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <svg
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* 4 Tabs */}
          <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50/40 p-1.5 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("deadlines")}
              className={`flex flex-col items-center justify-center rounded-xl py-1.5 transition ${
                activeTab === "deadlines"
                  ? "bg-white text-red-600 shadow-xs"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <span>🚨 Hạn chót</span>
              <span className="text-[10px] font-black text-slate-500">
                ({deadlinesCount})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={`flex flex-col items-center justify-center rounded-xl py-1.5 transition ${
                activeTab === "inventory"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <span>📦 Tồn kho</span>
              <span className="text-[10px] font-black text-slate-500">
                ({inventoryCount})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("debts")}
              className={`flex flex-col items-center justify-center rounded-xl py-1.5 transition ${
                activeTab === "debts"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <span>💰 Công nợ</span>
              <span className="text-[10px] font-black text-slate-500">
                ({debtsCount})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("activities")}
              className={`flex flex-col items-center justify-center rounded-xl py-1.5 transition ${
                activeTab === "activities"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <span>📝 Nhật ký</span>
              <span className="text-[10px] font-black text-slate-500">
                ({activitiesCount})
              </span>
            </button>
          </div>

          {/* Tab Content List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-2">
            {/* 1. Tab Deadlines */}
            {activeTab === "deadlines" && (
              <>
                {deadlinesCount === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    🎉 Tuyệt vời! Không có dự án nào bị quá hạn hoặc sắp đến hạn trong 48h tới.
                  </div>
                ) : (
                  data?.deadlines.map((item) => (
                    <Link
                      key={item.id}
                      href={`/projects/${item.id}`}
                      onClick={() => setIsOpen(false)}
                      className={`block rounded-xl p-3 transition hover:bg-slate-50 ${
                        item.isOverdue ? "bg-red-50/40" : "bg-amber-50/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            item.isOverdue
                              ? "bg-red-600 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {item.text}
                        </span>
                        <span className="text-[11px] font-bold text-blue-600">
                          {item.project_code}
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs font-semibold text-slate-900 line-clamp-1">
                        {formatProjectTitle(item.project_name)}
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-500">
                        👤 Khách hàng: <span className="font-medium text-slate-700">{item.customer_name}</span>
                      </p>
                    </Link>
                  ))
                )}
              </>
            )}

            {/* 2. Tab Inventory */}
            {activeTab === "inventory" && (
              <>
                {inventoryCount === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    ✅ Kho hàng đầy đủ, không có linh kiện nào dưới định mức tồn kho tối thiểu.
                  </div>
                ) : (
                  data?.inventory.map((item) => (
                    <Link
                      key={item.id}
                      href="/inventory"
                      onClick={() => setIsOpen(false)}
                      className={`block rounded-xl p-3 transition hover:bg-slate-50 ${
                        item.isOutOfStock ? "bg-red-50/40" : "bg-amber-50/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            item.isOutOfStock
                              ? "bg-red-600 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {item.isOutOfStock ? "Hết hàng" : "Cảnh báo tồn kho"}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600">
                          {item.product_code}
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs font-semibold text-slate-900 line-clamp-1">
                        {item.name}
                      </p>

                      <p className="mt-0.5 text-[11px] font-bold text-slate-600">
                        Tồn: <span className={item.isOutOfStock ? "text-red-600" : "text-amber-700"}>{item.stock_quantity}</span> / Định mức: {item.minimum_stock} {item.unit}
                      </p>
                    </Link>
                  ))
                )}
              </>
            )}

            {/* 3. Tab Debts */}
            {activeTab === "debts" && (
              <>
                {debtsCount === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    🎉 Toàn bộ các hợp đồng dự án đã được thanh toán 100%!
                  </div>
                ) : (
                  data?.debts.map((item) => (
                    <Link
                      key={item.id}
                      href={`/projects/${item.id}`}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-xl p-3 transition hover:bg-slate-50 bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-amber-700 tabular-nums">
                          Còn nợ: {formatCurrency(item.debt_amount)}
                        </span>
                        <span className="text-[11px] font-bold text-blue-600">
                          {item.project_code}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-semibold text-slate-900 line-clamp-1">
                        {formatProjectTitle(item.project_name)}
                      </p>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span>👤 {item.customer_name}</span>
                        <span>Đã thu: {formatCurrency(item.paid_amount)}</span>
                      </div>
                    </Link>
                  ))
                )}
              </>
            )}

            {/* 4. Tab Activities */}
            {activeTab === "activities" && (
              <>
                {activitiesCount === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Chưa có nhật ký hoạt động nào được ghi nhận.
                  </div>
                ) : (
                  data?.activities.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 text-xs transition hover:bg-slate-50/60 rounded-xl"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-800 leading-snug">
                          {item.text}
                        </p>
                      </div>
                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        ⏱️ {formatTimeAgo(item.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* Footer Direct Links */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs font-bold">
            <Link
              href="/projects?deadline=overdue"
              onClick={() => setIsOpen(false)}
              className="text-blue-600 hover:underline"
            >
              Xem dự án quá hạn →
            </Link>

            <Link
              href="/finance"
              onClick={() => setIsOpen(false)}
              className="text-slate-600 hover:text-slate-900"
            >
              Sổ quỹ tài chính →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
