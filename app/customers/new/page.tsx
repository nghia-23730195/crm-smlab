import Link from "next/link";

import { createCustomer } from "../actions";

export default function NewCustomerPage() {
  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-5xl">
        <form
          action={createCustomer}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Mã khách hàng"
              name="customer_code"
              placeholder="Ví dụ: KH-001"
              required
            />

            <FormField
              label="Họ tên/Người liên hệ"
              name="full_name"
              placeholder="Nhập họ tên"
              required
            />

            <SelectField
              label="Loại khách hàng"
              name="customer_type"
              defaultValue="individual"
              required
              options={[
                { value: "individual", label: "Cá nhân" },
                { value: "school", label: "Trường học" },
                { value: "business", label: "Doanh nghiệp" },
                { value: "dealer", label: "Đại lý" },
                { value: "other", label: "Khác" },
              ]}
            />

            <FormField
              label="Tên công ty/Đơn vị"
              name="company_name"
              placeholder="Không bắt buộc"
            />

            <FormField
              label="Số điện thoại"
              name="phone"
              type="tel"
              placeholder="Nhập số điện thoại"
            />

            <FormField
              label="Email"
              name="email"
              type="email"
              placeholder="example@email.com"
            />

            <SelectField
              label="Nguồn khách hàng"
              name="source"
              defaultValue=""
              options={[
                { value: "", label: "Chưa xác định" },
                { value: "Facebook", label: "Facebook" },
                { value: "Website", label: "Website" },
                { value: "Zalo", label: "Zalo" },
                { value: "Giới thiệu", label: "Giới thiệu" },
                { value: "Khách cũ", label: "Khách cũ" },
                { value: "Trực tiếp", label: "Trực tiếp" },
                { value: "Khác", label: "Khác" },
              ]}
            />

            <SelectField
              label="Trạng thái"
              name="status"
              defaultValue="lead"
              required
              options={[
                { value: "lead", label: "Tiềm năng" },
                { value: "contacted", label: "Đã liên hệ" },
                { value: "active", label: "Đang hoạt động" },
                { value: "inactive", label: "Ngừng hoạt động" },
              ]}
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="address"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Địa chỉ
            </label>

            <textarea
              id="address"
              name="address"
              rows={2}
              placeholder="Nhập địa chỉ khách hàng"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Ghi chú
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Nhập ghi chú về khách hàng"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/customers"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Thêm khách hàng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
};

function FormField({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required = false,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  label: string;
  name: string;
  defaultValue: string;
  options: SelectOption[];
  required?: boolean;
};

function SelectField({
  label,
  name,
  defaultValue,
  options,
  required = false,
}: SelectFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option
            key={option.value || "empty"}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}