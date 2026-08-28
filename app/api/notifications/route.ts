import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatActivityText } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { organizationId } = await requireCurrentUser();

    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const [projects, products, recentLogs] = await Promise.all([
      // 1. Projects for deadlines & debt checking
      prisma.projects.findMany({
        where: {
          organization_id: organizationId,
          status: {
            not: "cancelled",
          },
        },
        select: {
          id: true,
          project_code: true,
          project_name: true,
          status: true,
          due_date: true,
          actual_value: true,
          paid_amount: true,
          customers: {
            select: {
              id: true,
              full_name: true,
              company_name: true,
            },
          },
        },
        orderBy: {
          due_date: "asc",
        },
      }),

      // 2. Products for stock warnings
      prisma.products.findMany({
        where: {
          organization_id: organizationId,
          is_active: true,
        },
        select: {
          id: true,
          product_code: true,
          name: true,
          stock_quantity: true,
          minimum_stock: true,
          unit: true,
        },
      }),

      // 3. Activity logs
      prisma.activity_logs.findMany({
        where: {
          organization_id: organizationId,
        },
        orderBy: {
          created_at: "desc",
        },
        take: 15,
      }),
    ]);

    // Process Deadlines (Overdue & Due in <= 48h)
    const deadlineAlerts = projects
      .filter((p) => {
        if (p.status === "completed" || !p.due_date) return false;
        const due = new Date(p.due_date);
        return due < in48Hours;
      })
      .map((p) => {
        const due = new Date(p.due_date!);
        const diffMs = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isOverdue = diffMs < 0;

        return {
          id: p.id,
          project_code: p.project_code,
          project_name: p.project_name,
          customer_name: p.customers?.full_name || p.customers?.company_name || "Chưa gắn khách",
          due_date: p.due_date,
          isOverdue,
          diffDays: Math.abs(diffDays),
          text: isOverdue ? `Đã quá hạn ${Math.abs(diffDays)} ngày` : diffDays === 0 ? "Hạn chót hôm nay" : `Còn ${diffDays} ngày`,
        };
      });

    // Process Low Stock & Out of Stock
    const stockAlerts = products
      .filter((prod) => {
        const stock = Number(prod.stock_quantity ?? 0);
        const min = Number(prod.minimum_stock ?? 0);
        return stock <= 0 || (min > 0 && stock <= min);
      })
      .map((prod) => {
        const stock = Number(prod.stock_quantity ?? 0);
        const min = Number(prod.minimum_stock ?? 0);
        const isOutOfStock = stock <= 0;

        return {
          id: prod.id,
          product_code: prod.product_code,
          name: prod.name,
          stock_quantity: stock,
          minimum_stock: min,
          unit: prod.unit,
          isOutOfStock,
          text: isOutOfStock
            ? "Đã hết hàng (0 tồn kho)"
            : `Sắp hết (Còn ${stock} / Định mức ${min} ${prod.unit})`,
        };
      });

    // Process Outstanding Debts
    const debtAlerts = projects
      .map((p) => {
        const actual = Number(p.actual_value ?? 0);
        const paid = Number(p.paid_amount ?? 0);
        const debt = Math.max(0, actual - paid);
        return {
          id: p.id,
          project_code: p.project_code,
          project_name: p.project_name,
          customer_name: p.customers?.full_name || p.customers?.company_name || "Chưa gắn khách",
          actual_value: actual,
          paid_amount: paid,
          debt_amount: debt,
        };
      })
      .filter((p) => p.debt_amount > 0 && p.actual_value > 0)
      .sort((a, b) => b.debt_amount - a.debt_amount);

    // Process Activity logs
    const activities = recentLogs.map((log) => ({
      id: String(log.id),
      text: formatActivityText(log),
      action: log.action,
      entity_type: log.entity_type,
      created_at: log.created_at,
    }));

    const totalAlerts = deadlineAlerts.length + stockAlerts.length + debtAlerts.length;

    return NextResponse.json({
      deadlines: deadlineAlerts,
      inventory: stockAlerts,
      debts: debtAlerts,
      activities,
      totalAlerts,
    });
  } catch (error) {
    console.error("Lỗi khi tải thông báo:", error);
    return NextResponse.json({ error: "Không thể tải thông báo" }, { status: 500 });
  }
}
