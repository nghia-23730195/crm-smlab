import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteTaskButton from "@/components/DeleteTaskButton";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { updateTask } from "../../actions";

export const runtime = "nodejs";

type EditTaskPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

function toInputDateFormat(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function EditTaskPage({
  params,
  searchParams,
}: EditTaskPageProps) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;
  const { id } = await params;
  const { error } = await searchParams;

  const [task, projects, profiles] = await Promise.all([
    prisma.tasks.findFirst({
      where: {
        id,
        organization_id: organizationId,
      },
    }),
    prisma.projects.findMany({
      where: { organization_id: organizationId },
      select: { id: true, project_name: true, project_code: true },
      orderBy: { project_name: "asc" },
    }),
    prisma.profiles.findMany({
      where: { organization_id: organizationId },
      select: { id: true, full_name: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  if (!task) {
    notFound();
  }

  const updateTaskWithId = updateTask.bind(null, task.id);

  return (
    <div className="p-5 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/tasks" className="hover:text-blue-600 transition">
                Quản lý công việc
              </Link>
              <span>/</span>
              <span className="text-slate-900">Chỉnh sửa</span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Cập nhật công việc: {task.task_code} - {task.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <DeleteTaskButton
              id={task.id}
              taskTitle={task.title}
              showText
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
            />

            <Link
              href="/tasks"
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
          action={updateTaskWithId}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs"
        >
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-base font-bold text-slate-900">
              Thông tin công việc & Phân công
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Cập nhật tiến độ, mức ưu tiên, dự án hoặc chuyển giao nhân sự thực hiện.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Tên công việc */}
            <div className="md:col-span-2">
              <label
                htmlFor="title"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Tên công việc <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={task.title}
                placeholder="Ví dụ: Lập trình firmware ESP32, Thiết kế mạch in nguồn..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-medium"
              />
            </div>

            {/* Mã công việc */}
            <div>
              <label
                htmlFor="task_code"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Mã công việc
              </label>
              <input
                id="task_code"
                name="task_code"
                type="text"
                defaultValue={task.task_code}
                className="w-full font-mono rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Dự án liên kết */}
            <div>
              <label
                htmlFor="project_id"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Dự án liên quan
              </label>
              <select
                id="project_id"
                name="project_id"
                defaultValue={task.project_id ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="">-- Không thuộc dự án cụ thể --</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.project_code ? `[${proj.project_code}] ` : ""}
                    {proj.project_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Người phụ trách (Hệ thống) */}
            <div>
              <label
                htmlFor="assigned_to"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Nhân sự phụ trách
              </label>
              <select
                id="assigned_to"
                name="assigned_to"
                defaultValue={task.assigned_to ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="">-- Chọn thành viên phụ trách --</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tên người phụ trách (Tùy chỉnh/Bổ sung) */}
            <div>
              <label
                htmlFor="assignee_name"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Hoặc nhập tên người nhận việc
              </label>
              <input
                id="assignee_name"
                name="assignee_name"
                type="text"
                defaultValue={task.assignee_name ?? ""}
                placeholder="Ví dụ: Nguyễn Văn A, CTV Hoàng Nam..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Mức độ ưu tiên */}
            <div>
              <label
                htmlFor="priority"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Mức độ ưu tiên
              </label>
              <select
                id="priority"
                name="priority"
                defaultValue={task.priority}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="urgent">🔴 Khẩn cấp</option>
                <option value="high">🟠 Cao</option>
                <option value="medium">🔵 Vừa (Bình thường)</option>
                <option value="low">⚪ Thấp</option>
              </select>
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
                defaultValue={task.status}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              >
                <option value="todo">⚪ Cần làm</option>
                <option value="in_progress">🟡 Đang làm</option>
                <option value="review">🟣 Chờ duyệt</option>
                <option value="completed">🟢 Hoàn thành</option>
              </select>
            </div>

            {/* Ngày bắt đầu */}
            <div>
              <label
                htmlFor="start_date"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Ngày bắt đầu
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={toInputDateFormat(task.start_date)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Hạn hoàn thành (Deadline) */}
            <div>
              <label
                htmlFor="due_date"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Hạn hoàn thành (Deadline)
              </label>
              <input
                id="due_date"
                name="due_date"
                type="date"
                defaultValue={toInputDateFormat(task.due_date)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Tiến độ (%) */}
            <div>
              <label
                htmlFor="progress"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Tiến độ thực hiện (%)
              </label>
              <input
                id="progress"
                name="progress"
                type="number"
                min="0"
                max="100"
                defaultValue={task.progress}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Mô tả chi tiết */}
            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Mô tả công việc & Yêu cầu cụ thể
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={task.description ?? ""}
                placeholder="Mô tả nội dung công việc, tiêu chí nghiệm thu hoặc ghi chú cho nhân sự phụ trách..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 leading-relaxed"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end border-t border-slate-100 pt-6">
            <Link
              href="/tasks"
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
