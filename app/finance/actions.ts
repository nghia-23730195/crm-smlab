"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

type TransactionType = "income" | "expense";

const VALID_TRANSACTION_TYPES: TransactionType[] = [
  "income",
  "expense",
];

function getText(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
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

function parseAmount(value: string) {
  const normalized = value.replace(/[.,\s]/g, "");

  if (!normalized) {
    throw new Error("Vui lòng nhập số tiền.");
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Số tiền phải lớn hơn 0.");
  }

  return new Prisma.Decimal(amount);
}

function getTransactionData(formData: FormData) {
  const transactionCode = getText(
    formData,
    "transaction_code",
  );

  const transactionType = getText(
    formData,
    "transaction_type",
  ) as TransactionType;

  const category = getText(formData, "category");

  const amount = parseAmount(
    getText(formData, "amount"),
  );

  const paymentMethod = getText(
    formData,
    "payment_method",
  );

  const transactionDate = parseTransactionDate(
    getText(formData, "transaction_date"),
  );

  const projectId = getText(formData, "project_id");
  const customerId = getText(formData, "customer_id");

  const description = getText(
    formData,
    "description",
  );

  const attachmentUrl = getText(
    formData,
    "attachment_url",
  );

  if (!transactionCode) {
    throw new Error("Vui lòng nhập mã giao dịch.");
  }

  if (
    !VALID_TRANSACTION_TYPES.includes(
      transactionType,
    )
  ) {
    throw new Error("Loại giao dịch không hợp lệ.");
  }

  if (!category) {
    throw new Error("Vui lòng nhập danh mục.");
  }

  if (!paymentMethod) {
    throw new Error(
      "Vui lòng chọn phương thức thanh toán.",
    );
  }

  return {
    transactionCode,
    transactionType,
    category,
    amount,
    paymentMethod,
    transactionDate,
    projectId,
    customerId,
    description,
    attachmentUrl,
  };
}

async function validateRelations(
  projectId: string,
  customerId: string,
) {
  if (projectId) {
    const project = await prisma.projects.findFirst({
      where: {
        id: projectId,
        organization_id: ORGANIZATION_ID,
      },
      select: {
        id: true,
        customer_id: true,
      },
    });

    if (!project) {
      throw new Error(
        "Dự án được chọn không tồn tại.",
      );
    }

    if (
      customerId &&
      project.customer_id &&
      project.customer_id !== customerId
    ) {
      throw new Error(
        "Khách hàng được chọn không khớp với khách hàng của dự án.",
      );
    }
  }

  if (customerId) {
    const customer =
      await prisma.customers.findFirst({
        where: {
          id: customerId,
          organization_id: ORGANIZATION_ID,
        },
        select: {
          id: true,
        },
      });

    if (!customer) {
      throw new Error(
        "Khách hàng được chọn không tồn tại.",
      );
    }
  }
}

export async function createTransaction(
  formData: FormData,
) {
  const data = getTransactionData(formData);

  const duplicate =
    await prisma.transactions.findFirst({
      where: {
        organization_id: ORGANIZATION_ID,
        transaction_code: data.transactionCode,
      },
      select: {
        id: true,
      },
    });

  if (duplicate) {
    throw new Error(
      `Mã giao dịch ${data.transactionCode} đã tồn tại.`,
    );
  }

  await validateRelations(
    data.projectId,
    data.customerId,
  );

  await prisma.transactions.create({
    data: {
      organization_id: ORGANIZATION_ID,
      transaction_code: data.transactionCode,
      project_id: data.projectId || null,
      customer_id: data.customerId || null,
      transaction_type: data.transactionType,
      category: data.category,
      amount: data.amount,
      payment_method: data.paymentMethod,
      transaction_date: data.transactionDate,
      description: data.description || null,
      attachment_url: data.attachmentUrl || null,
      created_by: null,
    },
  });

  revalidatePath("/finance");
  revalidatePath("/");
  revalidatePath("/projects");

  redirect("/finance");
}

export async function updateTransaction(
  transactionId: string,
  formData: FormData,
) {
  const data = getTransactionData(formData);

  const currentTransaction =
    await prisma.transactions.findFirst({
      where: {
        id: transactionId,
        organization_id: ORGANIZATION_ID,
      },
      select: {
        id: true,
      },
    });

  if (!currentTransaction) {
    throw new Error(
      "Không tìm thấy giao dịch cần cập nhật.",
    );
  }

  const duplicate =
    await prisma.transactions.findFirst({
      where: {
        organization_id: ORGANIZATION_ID,
        transaction_code: data.transactionCode,
        NOT: {
          id: transactionId,
        },
      },
      select: {
        id: true,
      },
    });

  if (duplicate) {
    throw new Error(
      `Mã giao dịch ${data.transactionCode} đã được sử dụng.`,
    );
  }

  await validateRelations(
    data.projectId,
    data.customerId,
  );

  await prisma.transactions.update({
    where: {
      id: transactionId,
    },
    data: {
      transaction_code: data.transactionCode,
      project_id: data.projectId || null,
      customer_id: data.customerId || null,
      transaction_type: data.transactionType,
      category: data.category,
      amount: data.amount,
      payment_method: data.paymentMethod,
      transaction_date: data.transactionDate,
      description: data.description || null,
      attachment_url: data.attachmentUrl || null,
      updated_at: new Date(),
    },
  });

  revalidatePath("/finance");
  revalidatePath(`/finance/${transactionId}/edit`);
  revalidatePath("/");
  revalidatePath("/projects");

  redirect("/finance");
}
