import Link from "next/link";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getNextTransactionCode } from "@/lib/finance";
import TransactionForm from "@/components/TransactionForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewTransactionPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewTransactionPage({
  searchParams,
}: NewTransactionPageProps) {
  const { organizationId } = await requireCurrentUser();
  const params = await searchParams;

  let projects: { id: string; project_code: string; project_name: string }[] = [];
  let customers: { id: string; customer_code: string; full_name: string; company_name: string | null }[] = [];
  let nextTransactionCode = "GD-001";

  try {
    const [pList, cList, code] = await Promise.all([
      prisma.projects.findMany({
        where: {
          organization_id: organizationId,
        },
        select: {
          id: true,
          project_code: true,
          project_name: true,
        },
        orderBy: {
          project_code: "asc",
        },
      }),

      prisma.customers.findMany({
        where: {
          organization_id: organizationId,
        },
        select: {
          id: true,
          customer_code: true,
          full_name: true,
          company_name: true,
        },
        orderBy: {
          customer_code: "asc",
        },
      }),

      getNextTransactionCode(organizationId),
    ]);

    projects = pList;
    customers = cList;
    nextTransactionCode = code;
  } catch (err) {
    console.error("Error loading data for NewTransactionPage:", err);
  }

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/finance" className="hover:text-blue-600 transition">
                Quản lý tài chính
              </Link>
              <span>/</span>
              <span className="text-slate-900">Thêm giao dịch</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Thêm giao dịch thu / chi mới
            </h1>
          </div>

          <Link
            href="/finance"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs"
          >
            Quay lại sổ quỹ
          </Link>
        </div>

        <TransactionForm
          nextTransactionCode={nextTransactionCode}
          projects={projects}
          customers={customers}
          initialError={params.error}
        />
      </div>
    </div>
  );
}