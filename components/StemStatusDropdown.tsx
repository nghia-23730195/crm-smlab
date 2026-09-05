"use client";

import { useState, useTransition } from "react";
import { updateStemModelStatus } from "@/app/stem/actions";

type StemStatusDropdownProps = {
  id: string;
  initialStatus: string;
};

export const STEM_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bgClass: string;
    dotClass: string;
    arrowClass: string;
  }
> = {
  idea: {
    label: "Ý tưởng",
    bgClass: "bg-slate-100 text-slate-700 border border-slate-200/90 hover:bg-slate-200/70 shadow-2xs",
    dotClass: "bg-slate-500",
    arrowClass: "text-slate-500",
  },
  designing: {
    label: "Đang thiết kế",
    bgClass: "bg-amber-50 text-amber-800 border border-amber-200/90 hover:bg-amber-100/80 shadow-2xs",
    dotClass: "bg-amber-500",
    arrowClass: "text-amber-600",
  },
  prototyping: {
    label: "Mẫu thử (Proto)",
    bgClass: "bg-purple-50 text-purple-700 border border-purple-200/90 hover:bg-purple-100/80 shadow-2xs",
    dotClass: "bg-purple-500",
    arrowClass: "text-purple-600",
  },
  completed: {
    label: "Đã hoàn thiện",
    bgClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/90 hover:bg-emerald-100/80 shadow-2xs",
    dotClass: "bg-emerald-500",
    arrowClass: "text-emerald-600",
  },
};

export default function StemStatusDropdown({
  id,
  initialStatus,
}: StemStatusDropdownProps) {
  const [status, setStatus] = useState(initialStatus || "idea");
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const currentConfig = STEM_STATUS_CONFIG[status] || STEM_STATUS_CONFIG.idea;

  const handleSelect = (newStatus: string) => {
    setStatus(newStatus);
    setIsOpen(false);
    startTransition(async () => {
      await updateStemModelStatus(id, newStatus);
    });
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={isPending}
        className={`inline-flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer active:scale-95 ${
          currentConfig.bgClass
        } ${isPending ? "opacity-60 cursor-wait" : ""}`}
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
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 mt-1.5 z-40 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              onClick={() => handleSelect("idea")}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                status === "idea" ? "bg-slate-100 text-slate-800" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
              Ý tưởng
            </button>
            <button
              type="button"
              onClick={() => handleSelect("designing")}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                status === "designing" ? "bg-amber-50 text-amber-800" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              Đang thiết kế
            </button>
            <button
              type="button"
              onClick={() => handleSelect("prototyping")}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                status === "prototyping" ? "bg-purple-50 text-purple-700" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
              Mẫu thử (Proto)
            </button>
            <button
              type="button"
              onClick={() => handleSelect("completed")}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                status === "completed" ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              Đã hoàn thiện
            </button>
          </div>
        </>
      )}
    </div>
  );
}
