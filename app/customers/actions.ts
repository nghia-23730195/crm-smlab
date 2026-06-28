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
    throw new Error("Vui lòng nhập mã khách hàng.");
  }

  if (!fullName) {
    throw new Error("Vui lòng nhập họ tên khách hàng.");
  }

  if (!customerType) {
    throw new Error("Vui lòng chọn loại khách hàng.");
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new Error(
      "Trạng thái khách hàng không hợp lệ.",
    );
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(
      "Địa chỉ email không hợp lệ.",
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
      `Mã khách hàng ${data.customerCode} đã tồn tại.`,
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
      "Không tìm thấy khách hàng.",
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
      `Mã khách hàng ${data.customerCode} đã được sử dụng.`,
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
      "Không tìm thấy khách hàng.",
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