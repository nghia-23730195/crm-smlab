"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    label: "Dashboard",
    href: "/",
  },
  {
    label: "Sản phẩm",
    href: "/products",
  },
  {
    label: "Khách hàng",
    href: "/customers",
  },
  {
    label: "Dự án",
    href: "/projects",
  },
  {
    label: "Tài chính",
    href: "/finance",
  },
  {
    label: "Báo cáo",
    href: "/reports",
  },
  {
    label: "Cài đặt",
    href: "/settings",
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="border-b border-slate-200 px-6 py-6">
        <Link href="/" className="block">
          <h1 className="text-2xl font-bold text-blue-600">
            SM-LAB CRM
          </h1>
        </Link>

        <p className="mt-1 text-sm text-slate-500">
          Workshop Management
        </p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {menuItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl bg-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">
            Quản trị viên
          </p>

          <p className="mt-1 text-xs text-slate-500">
            admin@smlab.vn
          </p>
        </div>
      </div>
    </aside>
  );
}