"use client";

import { useState, useTransition } from "react";
import { updateRdTopicStatus } from "@/app/rd/actions";

type RdStatusDropdownProps = {
  id: string;
  initialStatus: string;
};

export default function RdStatusDropdown({
  id,
  initialStatus,
}: RdStatusDropdownProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const getStatusConfig = (val: string) => {
    switch (val) {
      case "completed":
      case "Đã thực hiện":
        return {
          label: "Đã thực hiện",
          bgClass: "bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100/80 shadow-2xs",
          dotClass: "bg-blue-600",
          arrowClass: "text-blue-500",
        };
      case "in_progress":
      case "Đang thực hiện":
        return {
          label: "Đang thực hiện",
          bgClass: "bg-amber-50 text-amber-800 border border-amber-200/90 hover:bg-amber-100/80 shadow-2xs",
          dotClass: "bg-amber-500",
          arrowClass: "text-amber-600",
        };
      case "pending":
      case "Chưa thực hiện":
      default:
        return {
          label: "Chưa thực hiện",
          bgClass: "bg-rose-50 text-rose-700 border border-rose-200/90 hover:bg-rose-100/80 shadow-2xs",
          dotClass: "bg-rose-500",
          arrowClass: "text-rose-500",
        };
    }
  };

  const currentConfig = getStatusConfig(status);

  const handleSelect = (newStatus: string) => {
    setStatus(newStatus);
    setIsOpen(false);
    startTransition(async () => {
      await updateRdTopicStatus(id, newStatus);
    });
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer active:scale-95 ${currentConfig.bgClass} ${
          isPending ? "opacity-60 cursor-wait" : ""
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${currentConfig.dotClass}`} />
        <span>{currentConfig.label}</span>
        <svg
          className={`h-3 w-3 ${currentConfig.arrowClass} transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1.5 z-40 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
            <button
              type="button"
              onClick={() => handleSelect("completed")}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                status === "completed"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
              Đã thực hiện
            </button>
            <button
              type="button"
              onClick={() => handleSelect("in_progress")}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                status === "in_progress"
                  ? "bg-amber-50 text-amber-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              Đang thực hiện
            </button>
            <button
              type="button"
              onClick={() => handleSelect("pending")}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                status === "pending"
                  ? "bg-red-50 text-red-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-red-600 shrink-0" />
              Chưa thực hiện
            </button>
          </div>
        </>
      )}
    </div>
  );
}