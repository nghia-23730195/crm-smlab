"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import GlobalSearchModal from "@/components/GlobalSearchModal";

type PageInformation = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

const pageInformation: Record<string, PageInformation> = {
  "/": {
    title: "Dashboard",
    description: "Tổng quan hoạt động và chỉ số chính của SM-LAB",
  },

  "/products": {
    title: "Quản lý sản phẩm",
    description: "Quản lý danh mục sản phẩm, giá bán và định mức tồn kho",
    actionLabel: "+ Thêm sản phẩm",
    actionHref: "/products/new",
  },

  "/products/new": {
    title: "Thêm sản phẩm",
    description: "Tạo sản phẩm mới trong hệ thống CRM",
  },

  "/inventory": {
    title: "Kho linh kiện",
    description: "Theo dõi số lượng tồn kho, cảnh báo hết hàng và giá trị lưu kho",
    actionLabel: "+ Tạo phiếu kho",
    actionHref: "/inventory/movements/new",
  },

  "/inventory/movements": {
    title: "Lịch sử nhập xuất kho",
    description: "Chi tiết các giao dịch nhập kho, xuất kho dự án và điều chỉnh",
    actionLabel: "+ Tạo phiếu kho",
    actionHref: "/inventory/movements/new",
  },

  "/inventory/movements/new": {
    title: "Tạo phiếu nhập xuất kho",
    description: "Ghi nhận giao dịch kho và tự động cập nhật số lượng tồn",
  },

  "/customers": {
    title: "Quản lý khách hàng",
    description: "Quản lý thông tin liên hệ, phân loại và tiến trình khách hàng",
    actionLabel: "+ Thêm khách hàng",
    actionHref: "/customers/new",
  },

  "/customers/new": {
    title: "Thêm khách hàng",
    description: "Tạo hồ sơ khách hàng hoặc đối tác mới",
  },

  "/projects": {
    title: "Quản lý dự án",
    description: "Theo dõi tiến độ, chi phí linh kiện và thời hạn dự án",
    actionLabel: "+ Thêm dự án",
    actionHref: "/projects/new",
  },

  "/projects/new": {
    title: "Thêm dự án",
    description: "Khởi tạo dự án mới cho khách hàng",
  },

  "/finance": {
    title: "Quản lý tài chính",
    description: "Theo dõi doanh thu, chi phí, dòng tiền và công nợ",
    actionLabel: "+ Tạo giao dịch",
    actionHref: "/finance/new",
  },

  "/finance/new": {
    title: "Tạo giao dịch tài chính",
    description: "Thêm phiếu thu hoặc phiếu chi mới vào sổ quỹ",
  },

  "/reports": {
    title: "Báo cáo tổng hợp",
    description: "Phân tích doanh thu, chi phí, công nợ và hiệu suất dự án",
  },

  "/settings": {
    title: "Cài đặt hệ thống",
    description: "Cấu hình thông tin doanh nghiệp và tài khoản CRM",
  },
};

function getProjectIdFromItemsPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)\/items(?:\/|$)/);
  return match?.[1] ?? null;
}

function getPageInformation(pathname: string): PageInformation {
  if (
    pathname.startsWith("/projects/") &&
    pathname.endsWith("/items/new")
  ) {
    const projectId = getProjectIdFromItemsPath(pathname);
    return {
      title: "Thêm linh kiện dự án",
      description: "Thêm linh kiện và chi phí cho dự án",
      actionLabel: "Danh sách linh kiện",
      actionHref: projectId
        ? `/projects/${projectId}/items`
        : "/projects",
    };
  }

  if (
    pathname.startsWith("/projects/") &&
    pathname.includes("/items/") &&
    pathname.endsWith("/edit")
  ) {
    const projectId = getProjectIdFromItemsPath(pathname);
    return {
      title: "Sửa linh kiện dự án",
      description: "Cập nhật thông tin và trạng thái linh kiện",
      actionLabel: "Danh sách linh kiện",
      actionHref: projectId
        ? `/projects/${projectId}/items`
        : "/projects",
    };
  }

  if (
    pathname.startsWith("/projects/") &&
    pathname.endsWith("/items")
  ) {
    const projectId = getProjectIdFromItemsPath(pathname);
    return {
      title: "Linh kiện dự án",
      description: "Quản lý danh sách linh kiện và chi phí dự án",
      actionLabel: "+ Thêm linh kiện",
      actionHref: projectId
        ? `/projects/${projectId}/items/new`
        : "/projects",
    };
  }

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
    pathname.startsWith("/customers/") &&
    !pathname.endsWith("/new")
  ) {
    return {
      title: "Hồ sơ khách hàng",
      description: "Chi tiết thông tin, dự án và giao dịch của khách hàng",
      actionLabel: "+ Thêm khách hàng",
      actionHref: "/customers/new",
    };
  }

  if (
    pathname.startsWith("/projects/") &&
    pathname.endsWith("/print")
  ) {
    return {
      title: "In Báo Giá Dự Án",
      description: "Mẫu báo giá và dự toán kỹ thuật SM-LAB",
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

  if (
    pathname.startsWith("/projects/") &&
    !pathname.endsWith("/new") &&
    !pathname.includes("/items")
  ) {
    return {
      title: "Chi Tiết Dự Án",
      description: "Tổng quan tiến độ, chi phí BOM và dòng tiền dự án",
      actionLabel: "+ Thêm dự án",
      actionHref: "/projects/new",
    };
  }

  if (
    pathname.startsWith("/finance/") &&
    pathname.endsWith("/edit")
  ) {
    return {
      title: "Sửa giao dịch",
      description: "Cập nhật thông tin giao dịch tài chính",
    };
  }

  return (
    pageInformation[pathname] ?? {
      title: "SM-LAB CRM",
      description: "Hệ thống quản lý workshop SM-LAB",
    }
  );
}

type AppHeaderProps = {
  onOpenMobileNav?: () => void;
};

export default function AppHeader({ onOpenMobileNav }: AppHeaderProps) {
  const pathname = usePathname();
  const currentPage = getPageInformation(pathname);

  return (
    <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-xs md:px-8">
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileNav && (
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Mở menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:hidden"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
            {currentPage.title}
          </h2>

          <p className="hidden truncate text-sm text-slate-500 sm:block">
            {currentPage.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <GlobalSearchModal />

        {currentPage.actionLabel && currentPage.actionHref && (
          <Link
            href={currentPage.actionHref}
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800"
          >
            {currentPage.actionLabel}
          </Link>
        )}
      </div>
    </header>
  );
}