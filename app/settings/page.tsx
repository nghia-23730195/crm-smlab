import SubmitButton from "@/components/SubmitButton";
import { prisma } from "@/lib/prisma";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { updateOrganization } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const { organizationId } =
    await requireCurrentUser();

  const params = await searchParams;

  const organization =
    await prisma.organizations.findUnique({
      where: {
        id: organizationId,
      },
    });

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-5xl">
        {params.success === "updated" && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Cập nhật thông tin doanh nghiệp thành công.
          </div>
        )}

        {params.error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {params.error}
          </div>
        )}

        {!organization ? (
          <section className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Không tìm thấy doanh nghiệp
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Không thể tải dữ liệu tổ chức hiện tại.
            </p>
          </section>
        ) : (
          <form
            action={updateOrganization}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="border-b border-slate-200 pb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Thông tin doanh nghiệp
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Cập nhật thông tin workshop hiển thị trong hệ thống.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <FormField
                label="Tên doanh nghiệp"
                name="name"
                defaultValue={organization.name}
                placeholder="Ví dụ: SM-LAB"
                required
              />

              <FormField
                label="Số điện thoại"
                name="phone"
                type="tel"
                defaultValue={
                  organization.phone ?? ""
                }
                placeholder="Nhập số điện thoại"
              />

              <FormField
                label="Email"
                name="email"
                type="email"
                defaultValue={
                  organization.email ?? ""
                }
                placeholder="contact@smlab.vn"
              />

              <FormField
                label="Mã số thuế"
                name="tax_code"
                defaultValue={
                  organization.tax_code ?? ""
                }
                placeholder="Nhập mã số thuế"
              />

              <div className="md:col-span-2">
                <FormField
                  label="Đường dẫn logo"
                  name="logo_url"
                  type="url"
                  defaultValue={
                    organization.logo_url ?? ""
                  }
                  placeholder="https://..."
                />
              </div>
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
                rows={3}
                defaultValue={
                  organization.address ?? ""
                }
                placeholder="Nhập địa chỉ doanh nghiệp"
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-8 flex justify-end">
              <SubmitButton
                idleText="Lưu cài đặt"
                pendingText="Đang lưu..."
              />
            </div>
          </form>
        )}

        {organization && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Thông tin hệ thống
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoRow
                label="Mã tổ chức"
                value={organization.id}
              />

              <InfoRow
                label="Ngày tạo"
                value={formatDate(
                  organization.created_at,
                )}
              />

              <InfoRow
                label="Cập nhật gần nhất"
                value={formatDate(
                  organization.updated_at,
                )}
              />

              <InfoRow
                label="Trạng thái"
                value="Đang hoạt động"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
};

function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required = false,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-all text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}