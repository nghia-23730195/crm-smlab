"use client";

import type { FormEvent } from "react";

import { toggleProductActive } from "@/app/products/actions";

type ProductStatusToggleProps = {
  productId: string;
  productName: string;
  isActive: boolean;
};

export default function ProductStatusToggle({
  productId,
  productName,
  isActive,
}: ProductStatusToggleProps) {
  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    const message = isActive
      ? `Bạn có chắc muốn ngừng bán sản phẩm "${productName}" không?`
      : `Bạn có chắc muốn kinh doanh lại sản phẩm "${productName}" không?`;

    if (!window.confirm(message)) {
      event.preventDefault();
    }
  }

  const toggleAction = toggleProductActive.bind(
    null,
    productId,
  );

  return (
    <form
      action={toggleAction}
      onSubmit={handleSubmit}
    >
      <button
        type="submit"
        className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition ${
          isActive
            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        {isActive ? "Ngừng bán" : "Kinh doanh lại"}
      </button>
    </form>
  );
}