"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function GlobalSearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectRoute = (href: string) => {
    setIsOpen(false);
    setSearchQuery("");
    router.push(href);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsOpen(false);
    // Search across projects as default
    router.push(`/projects?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const quickLinks = [
    { title: "Bảng điều khiển (Dashboard)", category: "Trang chủ", href: "/" },
    { title: "Danh sách khách hàng", category: "Khách hàng", href: "/customers" },
    { title: "Phễu bán hàng (Pipeline)", category: "Khách hàng", href: "/customers?view=pipeline" },
    { title: "Thêm khách hàng mới", category: "Khách hàng", href: "/customers/new" },
    { title: "Danh sách dự án", category: "Dự án", href: "/projects" },
    { title: "Bảng Kanban dự án", category: "Dự án", href: "/projects?view=kanban" },
    { title: "Tạo dự án mới", category: "Dự án", href: "/projects/new" },
    { title: "Kho linh kiện", category: "Kho hàng", href: "/inventory" },
    { title: "Lịch sử nhập / xuất kho", category: "Kho hàng", href: "/inventory/movements" },
    { title: "Tạo phiếu kho", category: "Kho hàng", href: "/inventory/movements/new" },
    { title: "Sản phẩm & Giá bán", category: "Sản phẩm", href: "/products" },
    { title: "Sổ quỹ tài chính", category: "Tài chính", href: "/finance" },
    { title: "Ghi nhận Thu / Chi mới", category: "Tài chính", href: "/finance/new" },
    { title: "Báo cáo thống kê", category: "Báo cáo", href: "/reports" },
  ];

  const filteredLinks = searchQuery.trim()
    ? quickLinks.filter(
        (link) =>
          link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          link.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : quickLinks;

  return (
    <>
      {/* Search trigger button in header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 sm:flex"
      >
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Tìm kiếm nhanh...</span>
        <kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 shadow-2xs">
          Ctrl K
        </kbd>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 backdrop-blur-xs bg-slate-900/40 animate-fade-in">
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center border-b border-slate-200 px-4 py-3.5"
            >
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm dự án, khách hàng, trang chức năng..."
                className="w-full bg-transparent px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <kbd className="text-[11px] font-semibold">ESC</kbd>
              </button>
            </form>

            {/* Quick Suggestions / Links */}
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredLinks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <p>Không tìm thấy mục khớp với &quot;{searchQuery}&quot;.</p>
                  <p className="mt-1 text-slate-400">
                    Nhấn <kbd className="font-bold">Enter</kbd> để tìm kiếm trong danh sách dự án.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLinks.map((link) => (
                    <button
                      key={link.href}
                      type="button"
                      onClick={() => handleSelectRoute(link.href)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-800 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-slate-400">→</span>
                        {link.title}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        {link.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
              <span>Điều hướng nhanh với phím tắt</span>
              <span>SM-LAB CRM</span>
            </div>
          </div>

          {/* Click backdrop to close */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}
