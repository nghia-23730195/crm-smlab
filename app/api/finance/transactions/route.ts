import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getNextTransactionCode } from "@/lib/finance";

export const dynamic = "force-dynamic";

function getText(val: unknown) {
  return String(val ?? "").trim();
}

function parseAmount(value: string) {
  const normalized = value.replace(/[^\d]/g, "");

  if (!normalized) {
    throw new Error("Vui lòng nhập số tiền hợp lệ.");
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Số tiền phải lớn hơn 0.");
  }

  return new Prisma.Decimal(amount);
}

function parseTransactionDate(value: string) {
  if (!value) {
    throw new Error("Vui lòng chọn ngày giao dịch.");
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("Ngày giao dịch không hợp lệ.");
  }

  return new Date(Date.UTC(year, month - 1, day));
}

export async function POST(req: Request) {
  try {
    const { organizationId, userId } = await requireCurrentUser();

    let body: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      formData.forEach((val, key) => {
        body[key] = String(val);
      });
    }

    const transactionType = getText(body.transaction_type);
    if (transactionType !== "income" && transactionType !== "expense") {
      return NextResponse.json(
        { error: "Loại giao dịch không hợp lệ." },
        { status: 400 },
      );
    }

    const category = getText(body.category);
    if (!category) {
      return NextResponse.json(
        { error: "Vui lòng nhập danh mục." },
        { status: 400 },
      );
    }

    const amount = parseAmount(getText(body.amount));
    const paymentMethod = getText(body.payment_method) || "cash";
    const transactionDate = parseTransactionDate(
      getText(body.transaction_date),
    );
    const projectId = getText(body.project_id) || null;
    const customerId = getText(body.customer_id) || null;
    const description = getText(body.description) || null;
    const attachmentUrl = getText(body.attachment_url) || null;

    let transactionCode = getText(body.transaction_code);
    if (!transactionCode) {
      transactionCode = await getNextTransactionCode(organizationId);
    } else {
      const duplicate = await prisma.transactions.findFirst({
        where: {
          organization_id: organizationId,
          transaction_code: transactionCode,
        },
        select: { id: true },
      });
      if (duplicate) {
        transactionCode = await getNextTransactionCode(organizationId);
      }
    }

    // Validate Project
    if (projectId) {
      const project = await prisma.projects.findFirst({
        where: { id: projectId, organization_id: organizationId },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json(
          { error: "Dự án được chọn không tồn tại." },
          { status: 400 },
        );
      }
    }

    // Validate Customer
    if (customerId) {
      const customer = await prisma.customers.findFirst({
        where: { id: customerId, organization_id: organizationId },
        select: { id: true },
      });
      if (!customer) {
        return NextResponse.json(
          { error: "Khách hàng / đối tác được chọn không tồn tại." },
          { status: 400 },
        );
      }
    }

    let createdTx;
    try {
      createdTx = await prisma.transactions.create({
        data: {
          organization_id: organizationId,
          transaction_code: transactionCode,
          project_id: projectId,
          customer_id: customerId,
          transaction_type: transactionType,
          category,
          amount,
          payment_method: paymentMethod,
          transaction_date: transactionDate,
          description,
          attachment_url: attachmentUrl,
          created_by: userId,
        },
      });
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const fallbackCode =
          await getNextTransactionCode(organizationId);
        createdTx = await prisma.transactions.create({
          data: {
            organization_id: organizationId,
            transaction_code: fallbackCode,
            project_id: projectId,
            customer_id: customerId,
            transaction_type: transactionType,
            category,
            amount,
            payment_method: paymentMethod,
            transaction_date: transactionDate,
            description,
            attachment_url: attachmentUrl,
            created_by: userId,
          },
        });
      } else {
        throw err;
      }
    }

    revalidatePath("/finance");
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/reports");

    return NextResponse.json({
      success: true,
      transaction: {
        id: createdTx.id,
        code: createdTx.transaction_code,
      },
    });
  } catch (err: unknown) {
    console.error("API error creating transaction:", err);
    const msg =
      err instanceof Error
        ? err.message
        : "Lỗi xử lý giao dịch trên máy chủ.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
