"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PageInformation = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

const pageInformation: Record<string, PageInformation> = {
  "/": {
    title: "Dashboard",
    description: "Tổng quan hoạt động của SM-LAB",
  },

  "/products": {
    title: "Quản lý sản phẩm",
    description: "Quản lý sản phẩm, giá bán và tồn kho",
    actionLabel: "+ Thêm sản phẩm",
    actionHref: "/products/new",
  },

  "/products/new": {
    title: "Thêm sản phẩm",
    description: "Tạo sản phẩm mới trong hệ thống",
  },

  "/customers": {
    title: "Quản lý khách hàng",
    description: "Quản lý thông tin và lịch sử khách hàng",
    actionLabel: "+ Thêm khách hàng",
    actionHref: "/customers/new",
  },

  "/customers/new": {
    title: "Thêm khách hàng",
    description: "Tạo khách hàng mới trong hệ thống",
  },

  "/projects": {
    title: "Quản lý dự án",
    description: "Theo dõi tiến độ và thời hạn dự án",
    actionLabel: "+ Thêm dự án",
    actionHref: "/projects/new",
  },

  "/projects/new": {
    title: "Thêm dự án",
    description: "Tạo dự án mới trong hệ thống",
  },

  "/finance": {
    title: "Quản lý tài chính",
    description: "Quản lý doanh thu, chi phí và công nợ",
    actionLabel: "+ Tạo giao dịch",
    actionHref: "/finance/new",
  },

  "/finance/new": {
    title: "Tạo giao dịch",
    description: "Thêm giao dịch thu hoặc chi mới",
  },

  "/reports": {
    title: "Báo cáo",
    description: "Tổng hợp báo cáo hoạt động của SM-LAB",
  },

  "/settings": {
    title: "Cài đặt",
    description: "Cấu hình tài khoản và hệ thống CRM",
  },
};

function getPageInformation(pathname: string): PageInformation {
  if (
    pathname.startsWith("/products/") &&
    pathname.endsWith("/edit")
  ) {
    return {
      title: "Sửa sản phẩm",
      description: "Cập nhật thông tin sản phẩm",
    };
  }

  if (
    pathname.startsWith("/customers/") &&
    pathname.endsWith("/edit")
  ) {
    return {
      title: "Sửa khách hàng",
      description: "Cập nhật thông tin khách hàng",
    };
  }

  if (
    pathname.startsWith("/projects/") &&
    pathname.endsWith("/edit")
  ) {
    return {
      title: "Sửa dự án",
      description: "Cập nhật thông tin và tiến độ dự án",
    };
  }

  return (
    pageInformation[pathname] ?? {
      title: "SM-LAB CRM",
      description: "Hệ thống quản lý workshop",
    }
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const currentPage = getPageInformation(pathname);

  return (
    <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 md:px-8">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
          {currentPage.title}
        </h2>

        <p className="mt-1 truncate text-sm text-slate-500">
          {currentPage.description}
        </p>
      </div>

      {currentPage.actionLabel && currentPage.actionHref && (
        <Link
          href={currentPage.actionHref}
          className="shrink-0 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          {currentPage.actionLabel}
        </Link>
      )}
    </header>
  );
}