import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import AppShell from "@/components/AppShell";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SM-LAB CRM",
  description: "Hệ thống quản lý khách hàng & dự án SM-LAB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={plusJakartaSans.variable}>
      <body className={`${plusJakartaSans.className} bg-slate-100 text-slate-900 antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}