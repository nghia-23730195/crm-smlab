import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { updateRdTopic } from "../../actions";

export const runtime = "nodejs";

type EditRdTopicPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditRdTopicPage({
  params,
  searchParams,
}: EditRdTopicPageProps) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;
  const { id } = await params;
  const { error } = await searchParams;

  const topic = await prisma.rd_topics.findFirst({
    where: {
      id,
      organization_id: organizationId,
    },
  });

  if (!topic) {
    notFound();
  }

  const updateTopicWithId = updateRdTopic.bind(null, topic.id);

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/rd" className="hover:text-blue-600 transition">
                R&D - Đề tài tiềm năng
              </Link>
              <span>/</span>
              <span className="text-slate-900">Chỉnh sửa đề tài</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Cập nhật đề tài: {topic.topic_name}
            </h1>
          </div>

          <Link
            href="/rd"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs"
          >
            Quay lại danh sách
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form
          action={updateTopicWithId}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs"
        >
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-base font-bold text-slate-900">
              Thông tin đề tài nghiên cứu & phát triển
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Cập nhật nội dung, đối tượng áp dụng, link tài liệu hoặc trạng thái tiến độ thực hiện.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Tên đề tài */}
            <div className="md:col-span-2">
              <label
                htmlFor="topic_name"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Tên đề tài <span className="text-red-500">*</span>
              </label>
              <input
                id="topic_name"
                name="topic_name"
                type="text"
                required
                defaultValue={topic.topic_name}
                placeholder="Ví dụ: Máy phân thuốc thông minh, Hệ thống giám sát rác..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-medium"
              />
            </div>

            {/* STT */}
            <div>
              <label
                htmlFor="order_index"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Số thứ tự (STT)
              </label>
              <input
                id="order_index"
                name="order_index"
                type="number"
                min="1"
                defaultValue={topic.order_index}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Trạng thái */}
            <div>
              <label
                htmlFor="status"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Trạng thái thực hiện
              </label>
              <select
                id="status"
                name="status"
                defaultValue={topic.status}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="pending">🔴 Chưa thực hiện</option>
                <option value="in_progress">🟡 Đang thực hiện</option>
                <option value="completed">🔵 Đã thực hiện</option>
              </select>
            </div>

            {/* Đối tượng */}
            <div>
              <label
                htmlFor="target_audience"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Đối tượng
              </label>
              <input
                id="target_audience"
                name="target_audience"
                type="text"
                list="audience-options"
                placeholder="Ví dụ: THCS, THPT, THCS,THPT..."
                defaultValue={topic.target_audience ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
              <datalist id="audience-options">
                <option value="THCS" />
                <option value="THPT" />
                <option value="THCS,THPT" />
                <option value="Đại học" />
                <option value="Cộng đồng" />
              </datalist>
            </div>

            {/* Lĩnh vực */}
            <div>
              <label
                htmlFor="field_category"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Lĩnh vực
              </label>
              <input
                id="field_category"
                name="field_category"
                type="text"
                list="field-options"
                placeholder="Ví dụ: Hệ thống nhúng, Hệ thống phần mềm, Năng lượng vật lý..."
                defaultValue={topic.field_category ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
              <datalist id="field-options">
                <option value="Hệ thống nhúng" />
                <option value="Hệ thống phần mềm" />
                <option value="Năng lượng vật lý" />
                <option value="Trí tuệ nhân tạo (AI)" />
                <option value="Internet vạn vật (IoT)" />
                <option value="Cơ điện tử & Robot" />
              </datalist>
            </div>

            {/* Keywords */}
            <div className="md:col-span-2">
              <label
                htmlFor="keywords"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Từ khóa (Keywords / Tags)
              </label>
              <input
                id="keywords"
                name="keywords"
                type="text"
                defaultValue={topic.keywords ?? ""}
                placeholder="Ví dụ: esp32, iot, tự động hóa, cảm biến, y tế (phân cách bằng dấu phẩy)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Link tài liệu */}
            <div className="md:col-span-2">
              <label
                htmlFor="document_links"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Link tài liệu & tham khảo
              </label>
              <textarea
                id="document_links"
                name="document_links"
                rows={4}
                defaultValue={topic.document_links ?? ""}
                placeholder="Nhập link tài liệu hoặc tên bài viết tham khảo, mỗi tài liệu trên 1 dòng. Ví dụ:&#10;Smart Pill Dispenser - Hackster.io&#10;https://github.com/...&#10;https://youtube.com/..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-mono text-xs"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Hỗ trợ tự động nhận diện liên kết GitHub, YouTube, Hackster, Instructables...
              </span>
            </div>

            {/* Mô tả */}
            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Mô tả chi tiết đề tài
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={topic.description ?? ""}
                placeholder="Mô tả mục đích, nguyên lý hoạt động, phạm vi áp dụng của đề tài..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 leading-relaxed"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end border-t border-slate-100 pt-6">
            <Link
              href="/rd"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs cursor-pointer"
            >
              Hủy
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 px-6 py-2.5 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              💾 Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}