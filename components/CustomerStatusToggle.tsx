"use client";

import type { FormEvent } from "react";

import { toggleCustomerActive } from "@/app/customers/actions";

type CustomerStatusToggleProps = {
  customerId: string;
  customerName: string;
  isInactive: boolean;
};

export default function CustomerStatusToggle({
  customerId,
  customerName,
  isInactive,
}: CustomerStatusToggleProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const message = isInactive
      ? `Bạn có chắc muốn kích hoạt lại khách hàng "${customerName}" không?`
      : `Bạn có chắc muốn ngừng hoạt động khách hàng "${customerName}" không?`;

    if (!window.confirm(message)) {
      event.preventDefault();
    }
  }

  const toggleAction = toggleCustomerActive.bind(null, customerId);

  return (
    <form action={toggleAction} onSubmit={handleSubmit}>
      <button
        type="submit"
        className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition ${
          isInactive
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        }`}
      >
        {isInactive ? "Kích hoạt lại" : "Ngừng hoạt động"}
      </button>
    </form>
  );
}