import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteStemModelButton from "@/components/DeleteStemModelButton";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { updateStemModel } from "../../actions";

export const runtime = "nodejs";

type EditStemModelPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditStemModelPage({
  params,
  searchParams,
}: EditStemModelPageProps) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;
  const { id } = await params;
  const { error } = await searchParams;

  const model = await prisma.stem_models.findFirst({
    where: {
      id,
      organization_id: organizationId,
    },
  });

  if (!model) {
    notFound();
  }

  const updateModelWithId = updateStemModel.bind(null, model.id);

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/stem" className="hover:text-blue-600 transition">
                R&D - Mô hình STEM
              </Link>
              <span>/</span>
              <span className="text-slate-900">Chỉnh sửa</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Cập nhật mô hình: {model.model_code} - {model.model_name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <DeleteStemModelButton
              id={model.id}
              modelName={model.model_name}
              showText
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
            />

            <Link
              href="/stem"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs"
            >
              Quay lại danh sách
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form
          action={updateModelWithId}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs"
        >
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-base font-bold text-slate-900">
              Thông tin chi tiết mô hình STEM
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Cập nhật tiến độ chế tạo, bảng vật liệu linh kiện và tài liệu hướng dẫn lắp ráp.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Tên mô hình STEM */}
            <div className="md:col-span-2">
              <label
                htmlFor="model_name"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Tên mô hình STEM / Kit giáo dục <span className="text-red-500">*</span>
              </label>
              <input
                id="model_name"
                name="model_name"
                type="text"
                required
                defaultValue={model.model_name}
                placeholder="Ví dụ: Mô hình Cánh tay Robot Thủy lực, Xe thế năng phản lực, Nhà thông minh ESP32..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-medium"
              />
            </div>

            {/* Mã mô hình */}
            <div>
              <label
                htmlFor="model_code"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Mã mô hình
              </label>
              <input
                id="model_code"
                name="model_code"
                type="text"
                defaultValue={model.model_code}
                className="w-full font-mono rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Trạng thái thực hiện */}
            <div>
              <label
                htmlFor="status"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Trạng thái nghiên cứu & chế tạo
              </label>
              <select
                id="status"
                name="status"
                defaultValue={model.status}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="idea">⚪ Ý tưởng thiết kế</option>
                <option value="designing">🟡 Đang thiết kế (Vẽ 3D/Mạch)</option>
                <option value="prototyping">🟣 Mẫu thử (Đang ráp Prototype)</option>
                <option value="completed">🟢 Đã hoàn thiện Kit</option>
              </select>
            </div>

            {/* Cấp học mục tiêu */}
            <div>
              <label
                htmlFor="target_grade"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Đối tượng / Cấp học
              </label>
              <input
                id="target_grade"
                name="target_grade"
                type="text"
                list="grade-options"
                defaultValue={model.target_grade ?? ""}
                placeholder="Ví dụ: Tiểu học, THCS, THPT, THCS,THPT..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
              <datalist id="grade-options">
                <option value="Tiểu học" />
                <option value="THCS" />
                <option value="THPT" />
                <option value="Tiểu học,THCS" />
                <option value="THCS,THPT" />
                <option value="Đại học & Cộng đồng" />
              </datalist>
            </div>

            {/* Lĩnh vực / Môn học */}
            <div>
              <label
                htmlFor="subject"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Lĩnh vực / Môn học
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                list="subject-options"
                defaultValue={model.subject ?? ""}
                placeholder="Ví dụ: Vật lý, IoT, Năng lượng tái tạo, Hóa học..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
              <datalist id="subject-options">
                <option value="Vật lý & Cơ kỹ thuật" />
                <option value="IoT & Tin học" />
                <option value="Khoa học - Tự nhiên" />
                <option value="Quang học & Thiên văn" />
                <option value="Sinh học & Môi trường" />
                <option value="Năng lượng tái tạo" />
                <option value="Robot & Tự động hóa" />
              </datalist>
            </div>

            {/* Mức độ khó */}
            <div>
              <label
                htmlFor="difficulty_level"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Độ khó chế tạo & Lắp ráp
              </label>
              <select
                id="difficulty_level"
                name="difficulty_level"
                defaultValue={model.difficulty_level ?? "Trung bình"}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="Dễ">🟢 Dễ (Lắp ráp cơ bản, phù hợp Tiểu học / mới bắt đầu)</option>
                <option value="Trung bình">🔵 Trung bình (Cần lắp ráp cơ khí hoặc nối mạch đơn giản)</option>
                <option value="Nâng cao">🟣 Nâng cao (Cần lập trình vi điều khiển, hàn mạch hoặc cơ khí phức tạp)</option>
              </select>
            </div>

            {/* Chi phí dự toán (VNĐ) */}
            <div>
              <label
                htmlFor="estimated_cost"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Chi phí linh kiện dự toán (VNĐ)
              </label>
              <input
                id="estimated_cost"
                name="estimated_cost"
                type="number"
                min="0"
                step="5000"
                defaultValue={Number(model.estimated_cost ?? 0)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-medium"
              />
            </div>

            {/* Tóm tắt vật liệu / linh kiện chính */}
            <div className="md:col-span-2">
              <label
                htmlFor="materials_summary"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Danh mục vật liệu & Linh kiện chính
              </label>
              <textarea
                id="materials_summary"
                name="materials_summary"
                rows={3}
                defaultValue={model.materials_summary ?? ""}
                placeholder="Ví dụ: Khung gỗ plywood cắt laser, 4 xilanh thủy lực 10ml, ống silicon, ốc M3, dây thun..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 leading-relaxed"
              />
            </div>

            {/* Link tài liệu, video, file cắt laser / 3D */}
            <div className="md:col-span-2">
              <label
                htmlFor="document_links"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Liên kết tài liệu, file cắt laser / STL 3D, giáo án & video
              </label>
              <textarea
                id="document_links"
                name="document_links"
                rows={3}
                defaultValue={model.document_links ?? ""}
                placeholder="Nhập link tài liệu hoặc ghi chú tham khảo, mỗi dòng 1 link. Ví dụ:&#10;https://www.instructables.com/...&#10;https://youtube.com/...&#10;Bản vẽ laser DXF & Code mẫu Arduino"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-mono text-xs"
              />
            </div>

            {/* Mô tả chi tiết & bài học STEM */}
            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Mô tả nguyên lý hoạt động & Kiến thức bài học STEM
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={model.description ?? ""}
                placeholder="Mô tả nguyên lý khoa học đằng sau mô hình, kiến thức STEM học sinh tiếp thu được khi tự tay chế tạo..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 leading-relaxed"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end border-t border-slate-100 pt-6">
            <Link
              href="/stem"
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
