import Link from "next/link";
import ExportCsvButton from "@/components/ExportCsvButton";
import StemStatusDropdown from "@/components/StemStatusDropdown";
import DeleteStemModelButton from "@/components/DeleteStemModelButton";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StemPageProps = {
  searchParams: Promise<{
    q?: string;
    grade?: string;
    subject?: string;
    difficulty?: string;
    status?: string;
    success?: string;
    error?: string;
  }>;
};

function getGradeBadge(grade: string | null) {
  if (!grade) return null;
  const upper = grade.toUpperCase().trim();

  if (upper.includes("TIỂU HỌC") || upper.includes("TIEU HOC")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
        {grade}
      </span>
    );
  }

  if (upper.includes("THCS") && upper.includes("THPT")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
        THCS,THPT
      </span>
    );
  }

  if (upper.includes("THPT")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
        THPT
      </span>
    );
  }

  if (upper.includes("THCS")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-200">
        THCS
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
      {grade}
    </span>
  );
}

function getDifficultyBadge(diff: string | null) {
  if (!diff) return null;
  switch (diff) {
    case "Dễ":
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
          Dễ
        </span>
      );
    case "Nâng cao":
      return (
        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
          Nâng cao
        </span>
      );
    case "Trung bình":
    default:
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
          Trung bình
        </span>
      );
  }
}

function renderStemDocumentLinks(text: string | null) {
  if (!text) return <span className="text-slate-400 text-xs italic">Chưa có tài liệu</span>;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div className="space-y-1 max-w-xs">
      {lines.map((line, idx) => {
        const isUrl = line.startsWith("http://") || line.startsWith("https://");

        if (isUrl) {
          let label = line;
          let icon = "🔗";

          if (line.includes("github.com")) {
            label = "Mã nguồn GitHub";
            icon = "🐙";
          } else if (line.includes("youtube.com") || line.includes("youtu.be")) {
            label = "Video chế tạo";
            icon = "▶️";
          } else if (line.includes("hackster.io")) {
            label = "Hackster.io Guide";
            icon = "⚡";
          } else if (line.includes("instructables.com")) {
            label = "Instructables Project";
            icon = "🛠️";
          } else if (line.includes("sciencebuddies.org")) {
            label = "ScienceBuddies Guide";
            icon = "🔬";
          } else if (line.includes("how2electronics.com")) {
            label = "How2Electronics Guide";
            icon = "⚡";
          }

          return (
            <a
              key={idx}
              href={line}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline break-all"
            >
              <span>{icon}</span>
              <span className="truncate max-w-[180px]" title={line}>
                {label}
              </span>
            </a>
          );
        }

        return (
          <div key={idx} className="flex items-start gap-1 text-xs text-slate-700 font-medium">
            <span className="text-blue-500">📄</span>
            <span className="truncate max-w-[180px]" title={line}>{line}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function StemPage({ searchParams }: StemPageProps) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;
  const params = await searchParams;

  const keyword = (params.q ?? "").trim();
  const selectedGrade = params.grade ?? "all";
  const selectedSubject = params.subject ?? "all";
  const selectedDifficulty = params.difficulty ?? "all";
  const selectedStatus = params.status ?? "all";

  // Fetch all STEM models for organization
  const allModels = await prisma.stem_models.findMany({
    where: {
      organization_id: organizationId,
    },
    orderBy: {
      model_code: "asc",
    },
  });

  // Extract distinct grades and subjects for filters
  const gradeList = Array.from(
    new Set(allModels.map((m) => m.target_grade).filter(Boolean) as string[])
  );
  const subjectList = Array.from(
    new Set(allModels.map((m) => m.subject).filter(Boolean) as string[])
  );

  // Filter models
  const filteredModels = allModels.filter((model) => {
    if (keyword) {
      const lower = keyword.toLowerCase();
      const matchCode = model.model_code.toLowerCase().includes(lower);
      const matchName = model.model_name.toLowerCase().includes(lower);
      const matchDesc = (model.description ?? "").toLowerCase().includes(lower);
      const matchMat = (model.materials_summary ?? "").toLowerCase().includes(lower);
      const matchSubj = (model.subject ?? "").toLowerCase().includes(lower);

      if (!matchCode && !matchName && !matchDesc && !matchMat && !matchSubj) {
        return false;
      }
    }

    if (selectedGrade !== "all" && model.target_grade !== selectedGrade) {
      return false;
    }

    if (selectedSubject !== "all" && model.subject !== selectedSubject) {
      return false;
    }

    if (selectedDifficulty !== "all" && model.difficulty_level !== selectedDifficulty) {
      return false;
    }

    if (selectedStatus !== "all") {
      if (selectedStatus === "pending") {
        if (model.status !== "pending" && model.status !== "Chưa thực hiện") return false;
      } else if (model.status !== selectedStatus) {
        return false;
      }
    }

    return true;
  });

  // Calculate Metrics
  const totalCount = allModels.length;
  const inProgressCount = allModels.filter(
    (m) => m.status === "designing" || m.status === "prototyping"
  ).length;
  const completedCount = allModels.filter((m) => m.status === "completed").length;

  const totalCost = allModels.reduce(
    (sum, m) => sum + Number(m.estimated_cost ?? 0),
    0
  );
  const avgCost = totalCount > 0 ? Math.round(totalCost / totalCount) : 0;

  const hasFilters =
    keyword.length > 0 ||
    selectedGrade !== "all" ||
    selectedSubject !== "all" ||
    selectedDifficulty !== "all" ||
    selectedStatus !== "all";

  // CSV Export Data
  const csvHeaders = [
    "Mã mô hình",
    "Tên mô hình STEM",
    "Cấp học",
    "Lĩnh vực / Môn học",
    "Độ khó",
    "Chi phí dự toán (VNĐ)",
    "Vật liệu / Linh kiện chính",
    "Trạng thái",
    "Link tài liệu",
    "Mô tả",
  ];

  const csvRows = filteredModels.map((m) => [
    m.model_code,
    m.model_name,
    m.target_grade ?? "",
    m.subject ?? "",
    m.difficulty_level ?? "Trung bình",
    Number(m.estimated_cost ?? 0),
    m.materials_summary ?? "",
    m.status === "completed"
      ? "Đã hoàn thiện"
      : m.status === "prototyping"
      ? "Mẫu thử (Proto)"
      : m.status === "designing"
      ? "Đang thiết kế"
      : m.status === "pending" || m.status === "Chưa thực hiện"
      ? "Chưa thực hiện"
      : "Ý tưởng",
    m.document_links ?? "",
    m.description ?? "",
  ]);

  return (
    <div className="p-5 md:p-8 space-y-6">
      {/* Success / Error Alerts */}
      {params.success === "created" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Tạo mô hình STEM mới thành công!
        </div>
      )}

      {params.success === "updated" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Cập nhật thông tin mô hình STEM thành công!
        </div>
      )}

      {params.success === "deleted" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Đã xóa mô hình STEM thành công!
        </div>
      )}

      {params.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {params.error}
        </div>
      )}

      {/* Top Banner Header */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-base shadow-2xs">
                🔬
              </span>
              <h1 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-wide">
                DANH MỤC MÔ HÌNH & KIT HỌC TẬP STEM (R&D)
              </h1>
              <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-xs font-bold text-slate-700">
                {allModels.length} mô hình
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Nghiên cứu, thiết kế mẫu thử, danh mục vật liệu và giáo án thí nghiệm khoa học kỹ thuật - giáo dục STEM
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ExportCsvButton
              filename="danh-muc-mo-hinh-stem"
              headers={csvHeaders}
              rows={csvRows}
            />

            <Link
              href="/stem/new"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 px-4 py-2 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              <span>➕</span>
              <span>Thêm mô hình STEM mới</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tổng số mô hình
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
          <span className="text-[11px] text-slate-400">Toàn bộ kit & mô hình STEM</span>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 shadow-xs">
          <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
            Đang chế tạo / Prototype
          </span>
          <p className="text-2xl font-black text-purple-700 mt-1">{inProgressCount}</p>
          <span className="text-[11px] text-purple-600 font-medium">
            Đang thiết kế & thử nghiệm mẫu
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
            Đã hoàn thiện Kit
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{completedCount}</p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}% sẵn sàng thương mại / giảng dạy
          </span>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 shadow-xs">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
            Chi phí linh kiện TB
          </span>
          <p className="text-2xl font-black text-blue-700 mt-1">
            {formatVnd(avgCost)}
          </p>
          <span className="text-[11px] text-blue-600 font-medium">
            Dự toán vật liệu trung bình/kit
          </span>
        </div>
      </div>

      {/* Main Table Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Filter Toolbar */}
        <div className="border-b border-slate-100 p-4 md:p-5">
          <form
            action="/stem"
            method="GET"
            className="flex flex-wrap items-center gap-2.5"
          >
            {/* Search Input */}
            <div className="min-w-[240px] flex-1">
              <input
                name="q"
                type="text"
                defaultValue={keyword}
                placeholder="Tìm mã STEM, tên mô hình, linh kiện, môn học..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Grade Filter */}
            <select
              name="grade"
              defaultValue={selectedGrade}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả cấp học</option>
              {gradeList.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {/* Subject Filter */}
            <select
              name="subject"
              defaultValue={selectedSubject}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả lĩnh vực / môn</option>
              {subjectList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              name="difficulty"
              defaultValue={selectedDifficulty}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả độ khó</option>
              <option value="Dễ">Dễ</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Nâng cao">Nâng cao</option>
            </select>

            {/* Status Filter */}
            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chưa thực hiện</option>
              <option value="idea">Ý tưởng</option>
              <option value="designing">Đang thiết kế</option>
              <option value="prototyping">Mẫu thử (Proto)</option>
              <option value="completed">Đã hoàn thiện</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 cursor-pointer"
            >
              Lọc
            </button>

            {hasFilters && (
              <Link
                href="/stem"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                <th className="px-4 py-3 whitespace-nowrap">Mã STEM</th>
                <th className="px-4 py-3">Tên mô hình STEM</th>
                <th className="px-4 py-3 whitespace-nowrap">Cấp học</th>
                <th className="px-4 py-3">Lĩnh vực / Môn</th>
                <th className="px-4 py-3 text-center">Độ khó</th>
                <th className="px-4 py-3 whitespace-nowrap">Chi phí dự toán</th>
                <th className="px-4 py-3">Vật liệu / Linh kiện chính</th>
                <th className="px-4 py-3">Tài liệu & Bản vẽ</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredModels.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-12 text-center text-slate-500 font-medium"
                  >
                    Không tìm thấy mô hình STEM nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredModels.map((model) => (
                  <tr
                    key={model.id}
                    className="hover:bg-slate-50/80 transition group"
                  >
                    {/* Model Code */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                        {model.model_code}
                      </span>
                    </td>

                    {/* Model Name */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <Link
                        href={`/stem/${model.id}/edit`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition block line-clamp-2"
                        title={model.model_name}
                      >
                        {model.model_name}
                      </Link>
                      {model.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {model.description}
                        </p>
                      )}
                    </td>

                    {/* Target Grade */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getGradeBadge(model.target_grade)}
                    </td>

                    {/* Subject */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {model.subject || "Đa môn"}
                      </span>
                    </td>

                    {/* Difficulty Level */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      {getDifficultyBadge(model.difficulty_level)}
                    </td>

                    {/* Estimated Cost */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-800">
                      {formatVnd(Number(model.estimated_cost ?? 0))}
                    </td>

                    {/* Materials Summary */}
                    <td className="px-4 py-3.5 max-w-xs">
                      {model.materials_summary ? (
                        <p
                          className="text-xs text-slate-600 line-clamp-2"
                          title={model.materials_summary}
                        >
                          {model.materials_summary}
                        </p>
                      ) : (
                        <span className="text-slate-400 italic text-xs">
                          Chưa liệt kê
                        </span>
                      )}
                    </td>

                    {/* Document Links */}
                    <td className="px-4 py-3.5">
                      {renderStemDocumentLinks(model.document_links)}
                    </td>

                    {/* Status Dropdown */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <StemStatusDropdown
                        id={model.id}
                        initialStatus={model.status}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/stem/${model.id}/edit`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                          title="Chỉnh sửa mô hình"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </Link>

                        <DeleteStemModelButton
                          id={model.id}
                          modelName={model.model_name}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
