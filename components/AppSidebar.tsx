"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import LogoutButton from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/client";

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
    label: "Kho linh kiện",
    href: "/inventory",
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

  const [email, setEmail] = useState(
    "Đang tải tài khoản...",
  );

  useEffect(() => {
    const supabase = createClient();

    let isMounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setEmail(
        user?.email ?? "Không xác định",
      );
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }

        setEmail(
          session?.user.email ??
            "Không xác định",
        );
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
              : pathname.startsWith(
                  item.href,
                );

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
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold uppercase text-white">
              {getEmailInitial(email)}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                Tài khoản đăng nhập
              </p>

              <p
                className="mt-1 truncate text-xs text-slate-500"
                title={email}
              >
                {email}
              </p>
            </div>
          </div>

          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

function getEmailInitial(email: string) {
  if (
    !email ||
    email === "Đang tải tài khoản..." ||
    email === "Không xác định"
  ) {
    return "SM";
  }

  return email.charAt(0);
}