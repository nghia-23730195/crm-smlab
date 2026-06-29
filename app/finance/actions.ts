"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

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
    throw new Error("Vui lÃ²ng chá»n ngÃ y giao dá»‹ch.");
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("NgÃ y giao dá»‹ch khÃ´ng há»£p lá»‡.");
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function parseAmount(value: string) {
  const normalized = value.replace(/[.,\s]/g, "");

  if (!normalized) {
    throw new Error("Vui lÃ²ng nháº­p sá»‘ tiá»n.");
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Sá»‘ tiá»n pháº£i lá»›n hÆ¡n 0.");
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
    throw new Error("Vui lÃ²ng nháº­p mÃ£ giao dá»‹ch.");
  }

  if (
    !VALID_TRANSACTION_TYPES.includes(
      transactionType,
    )
  ) {
    throw new Error("Loáº¡i giao dá»‹ch khÃ´ng há»£p lá»‡.");
  }

  if (!category) {
    throw new Error("Vui lÃ²ng nháº­p danh má»¥c.");
  }

  if (!paymentMethod) {
    throw new Error(
      "Vui lÃ²ng chá»n phÆ°Æ¡ng thá»©c thanh toÃ¡n.",
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
  organizationId: string,
) {
  if (projectId) {
    const project = await prisma.projects.findFirst({
      where: {
        id: projectId,
        organization_id:
          organizationId,
      },
      select: {
        id: true,
        customer_id: true,
      },
    });

    if (!project) {
      throw new Error(
        "Dá»± Ã¡n Ä‘Æ°á»£c chá»n khÃ´ng tá»“n táº¡i.",
      );
    }

    if (
      customerId &&
      project.customer_id &&
      project.customer_id !== customerId
    ) {
      throw new Error(
        "KhÃ¡ch hÃ ng Ä‘Æ°á»£c chá»n khÃ´ng khá»›p vá»›i khÃ¡ch hÃ ng cá»§a dá»± Ã¡n.",
      );
    }
  }

  if (customerId) {
    const customer =
      await prisma.customers.findFirst({
        where: {
          id: customerId,
          organization_id:
            organizationId,
        },
        select: {
          id: true,
        },
      });

    if (!customer) {
      throw new Error(
        "KhÃ¡ch hÃ ng Ä‘Æ°á»£c chá»n khÃ´ng tá»“n táº¡i.",
      );
    }
  }
}

export async function createTransaction(
  formData: FormData,
) {
  const { organizationId } =
    await requireCurrentUser();

  const data =
    getTransactionData(formData);

  const duplicate =
    await prisma.transactions.findFirst({
      where: {
        organization_id:
          organizationId,
        transaction_code: data.transactionCode,
      },
      select: {
        id: true,
      },
    });

  if (duplicate) {
    throw new Error(
      `MÃ£ giao dá»‹ch ${data.transactionCode} Ä‘Ã£ tá»“n táº¡i.`,
    );
  }

  await validateRelations(
    data.projectId,
    data.customerId,
    organizationId,
);

 await prisma.transactions.create({
  data: {
    organization_id:
      organizationId,

    transaction_code:
      data.transactionCode,

    project_id:
      data.projectId || null,

    customer_id:
      data.customerId || null,

    transaction_type:
      data.transactionType,

    category:
      data.category,

    amount:
      data.amount,

    payment_method:
      data.paymentMethod,

    transaction_date:
      data.transactionDate,

    description:
      data.description || null,

    attachment_url:
      data.attachmentUrl || null,

    created_by:
      null,
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
  const { organizationId } =
    await requireCurrentUser();

  const data =
    getTransactionData(formData);

  const currentTransaction =
    await prisma.transactions.findFirst({
      where: {
        id: transactionId,
        organization_id: organizationId,
      },
      select: {
        id: true,
      },
    });

  if (!currentTransaction) {
    throw new Error(
      "KhÃ´ng tÃ¬m tháº¥y giao dá»‹ch cáº§n cáº­p nháº­t.",
    );
  }

  const duplicate =
    await prisma.transactions.findFirst({
      where: {
        organization_id: organizationId,
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
    `MÃ£ giao dá»‹ch ${data.transactionCode} Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng.`,
  );
}

await validateRelations(
  data.projectId,
  data.customerId,
  organizationId,
);

await prisma.transactions.update({
  where: {
    id: currentTransaction.id,
  },
  data: {
    transaction_code:
      data.transactionCode,

    project_id:
      data.projectId || null,

    customer_id:
      data.customerId || null,

    transaction_type:
      data.transactionType,

    category:
      data.category,

    amount:
      data.amount,

    payment_method:
      data.paymentMethod,

    transaction_date:
      data.transactionDate,

    description:
      data.description || null,

    attachment_url:
      data.attachmentUrl || null,

    updated_at:
      new Date(),
  },
});

revalidatePath("/finance");
revalidatePath(
  `/finance/${transactionId}/edit`,
);
revalidatePath("/");
revalidatePath("/projects");

redirect("/finance");
}
