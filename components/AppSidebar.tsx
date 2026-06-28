"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    name: "Dashboard",
    href: "/",
  },
  {
    name: "Sản phẩm",
    href: "/products",
  },
  {
    name: "Khách hàng",
    href: "/customers",
  },
  {
    name: "Dự án",
    href: "/projects",
  },
  {
    name: "Tài chính",
    href: "/finance",
  },
  {
    name: "Báo cáo",
    href: "/reports",
  },
  {
    name: "Cài đặt",
    href: "/settings",
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="border-b border-slate-200 px-6 py-6">
        <Link href="/">
          <h1 className="text-2xl font-bold text-blue-700">
            SM-LAB CRM
          </h1>
        </Link>

        <p className="mt-1 text-sm text-slate-500">
          Workshop Management
        </p>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {menuItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-900">
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