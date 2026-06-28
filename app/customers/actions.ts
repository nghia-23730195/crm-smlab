"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const ORGANIZATION_ID =
  "01aa8406-8a40-4228-8005-84d8ef986922";

type CustomerStatus =
  | "lead"
  | "contacted"
  | "active"
  | "inactive";

const VALID_STATUSES: CustomerStatus[] = [
  "lead",
  "contacted",
  "active",
  "inactive",
];

function getText(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function getCustomerData(formData: FormData) {
  const customerCode = getText(
    formData,
    "customer_code",
  );

  const customerType = getText(
    formData,
    "customer_type",
  );

  const fullName = getText(
    formData,
    "full_name",
  );

  const companyName = getText(
    formData,
    "company_name",
  );

  const phone = getText(formData, "phone");
  const email = getText(formData, "email");
  const address = getText(formData, "address");
  const source = getText(formData, "source");
  const notes = getText(formData, "notes");

  const status = getText(
    formData,
    "status",
  ) as CustomerStatus;

  if (!customerCode) {
    throw new Error("Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p mÃƒÂ£ khÃƒÂ¡ch hÃƒÂ ng.");
  }

  if (!fullName) {
    throw new Error("Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p hÃ¡Â» tÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng.");
  }

  if (!customerType) {
    throw new Error("Vui lÃƒÂ²ng chÃ¡Â»n loÃ¡ÂºÂ¡i khÃƒÂ¡ch hÃƒÂ ng.");
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new Error(
      "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i khÃƒÂ¡ch hÃƒÂ ng khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡.",
    );
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(
      "Ã„Ã¡Â»â€¹a chÃ¡Â»â€° email khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡.",
    );
  }

  return {
    customerCode,
    customerType,
    fullName,
    companyName,
    phone,
    email,
    address,
    source,
    notes,
    status,
  };
}

export async function createCustomer(
  formData: FormData,
) {
  const data = getCustomerData(formData);

  const existingCustomer =
    await prisma.customers.findFirst({
      where: {
        organization_id: ORGANIZATION_ID,
        customer_code: data.customerCode,
      },
      select: {
        id: true,
      },
    });

  if (existingCustomer) {
    throw new Error(
      `MÃƒÂ£ khÃƒÂ¡ch hÃƒÂ ng ${data.customerCode} Ã„â€˜ÃƒÂ£ tÃ¡Â»â€œn tÃ¡ÂºÂ¡i.`,
    );
  }

  await prisma.customers.create({
    data: {
      organization_id: ORGANIZATION_ID,
      customer_code: data.customerCode,
      customer_type: data.customerType,
      full_name: data.fullName,
      company_name: data.companyName || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      source: data.source || null,
      status: data.status,
      notes: data.notes || null,
      assigned_to: null,
      created_by: null,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/");

  redirect("/customers");
}

export async function updateCustomer(
  customerId: string,
  formData: FormData,
) {
  const data = getCustomerData(formData);

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
      "KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y khÃƒÂ¡ch hÃƒÂ ng.",
    );
  }

  const duplicateCustomer =
    await prisma.customers.findFirst({
      where: {
        organization_id: ORGANIZATION_ID,
        customer_code: data.customerCode,
        NOT: {
          id: customerId,
        },
      },
      select: {
        id: true,
      },
    });

  if (duplicateCustomer) {
    throw new Error(
      `MÃƒÂ£ khÃƒÂ¡ch hÃƒÂ ng ${data.customerCode} Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c sÃ¡Â»Â­ dÃ¡Â»Â¥ng.`,
    );
  }

  await prisma.customers.update({
    where: {
      id: customerId,
    },
    data: {
      customer_code: data.customerCode,
      customer_type: data.customerType,
      full_name: data.fullName,
      company_name: data.companyName || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      source: data.source || null,
      status: data.status,
      notes: data.notes || null,
      updated_at: new Date(),
    },
  });

  revalidatePath("/customers");
  revalidatePath(
    `/customers/${customerId}/edit`,
  );
  revalidatePath("/");

  redirect("/customers");
}

export async function toggleCustomerActive(
  customerId: string,
) {
  const customer =
    await prisma.customers.findFirst({
      where: {
        id: customerId,
        organization_id: ORGANIZATION_ID,
      },
      select: {
        id: true,
        status: true,
      },
    });

  if (!customer) {
    throw new Error(
      "KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y khÃƒÂ¡ch hÃƒÂ ng.",
    );
  }

  const nextStatus: CustomerStatus =
    customer.status === "inactive"
      ? "active"
      : "inactive";

  await prisma.customers.update({
    where: {
      id: customerId,
    },
    data: {
      status: nextStatus,
      updated_at: new Date(),
    },
  });

  revalidatePath("/customers");
  revalidatePath("/");
}
