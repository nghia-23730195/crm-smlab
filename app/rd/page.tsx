import Link from "next/link";

import DeleteRdTopicButton from "@/components/DeleteRdTopicButton";
import ExportCsvButton from "@/components/ExportCsvButton";
import RdStatusDropdown from "@/components/RdStatusDropdown";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RdPageProps = {
  searchParams: Promise<{
    q?: string;
    audience?: string;
    field?: string;
    status?: string;
    success?: string;
    error?: string;
  }>;
};

function getAudienceBadge(audience: string | null) {
  if (!audience) return null;
  const upper = audience.toUpperCase().trim();

  if (upper.includes("THCS") && upper.includes("THPT")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
        THCS,THPT
      </span>
    );
  }

  if (upper === "THPT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 border border-rose-200">
        THPT
      </span>
    );
  }

  if (upper === "THCS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 border border-sky-200">
        THCS
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200">
      {audience}
    </span>
  );
}

function renderDocumentLinks(text: string | null) {
  if (!text) return <span className="text-slate-400 text-xs italic">Chưa có tài liệu</span>;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div className="space-y-1.5 max-w-xs">
      {lines.map((line, idx) => {
        const isUrl = line.startsWith("http://") || line.startsWith("https://");

        if (isUrl) {
          let label = line;
          let icon = "🔗";

          if (line.includes("github.com")) {
            label = "GitHub Repository";
            icon = "🐙";
          } else if (line.includes("youtube.com") || line.includes("youtu.be")) {
            label = "YouTube Video";
            icon = "▶️";
          } else if (line.includes("hackster.io")) {
            label = "Hackster.io Guide";
            icon = "⚡";
          } else if (line.includes("instructables.com")) {
            label = "Instructables Project";
            icon = "🛠️";
          } else if (line.includes("google.com")) {
            label = "Tài liệu Google Search";
            icon = "🔍";
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
              <span className="truncate max-w-[200px]" title={line}>
                {label}
              </span>
            </a>
          );
        }

        return (
          <div key={idx} className="flex items-start gap-1 text-xs text-slate-700 font-medium">
            <span className="text-blue-500">📄</span>
            <span>{line}</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function RdPage({ searchParams }: RdPageProps) {
  const currentUser = await requireCurrentUser();
  const organizationId = currentUser.organizationId;
  const params = await searchParams;

  const keyword = (params.q ?? "").trim();
  const selectedAudience = params.audience ?? "all";
  const selectedField = params.field ?? "all";
  const selectedStatus = params.status ?? "all";

  // Fetch all topics for organization
  const allTopics = await prisma.rd_topics.findMany({
    where: {
      organization_id: organizationId,
    },
    orderBy: {
      order_index: "asc",
    },
  });

  // Extract distinct fields and audiences for filters
  const audienceList = Array.from(
    new Set(allTopics.map((t) => t.target_audience).filter(Boolean) as string[])
  );
  const fieldList = Array.from(
    new Set(allTopics.map((t) => t.field_category).filter(Boolean) as string[])
  );

  // Filter topics
  const filteredTopics = allTopics.filter((topic) => {
    if (keyword) {
      const lower = keyword.toLowerCase();
      const matchName = topic.topic_name.toLowerCase().includes(lower);
      const matchDesc = (topic.description ?? "").toLowerCase().includes(lower);
      const matchKw = (topic.keywords ?? "").toLowerCase().includes(lower);
      const matchField = (topic.field_category ?? "").toLowerCase().includes(lower);
      if (!matchName && !matchDesc && !matchKw && !matchField) {
        return false;
      }
    }

    if (selectedAudience !== "all" && topic.target_audience !== selectedAudience) {
      return false;
    }

    if (selectedField !== "all" && topic.field_category !== selectedField) {
      return false;
    }

    if (selectedStatus !== "all") {
      if (selectedStatus === "completed" && topic.status !== "completed") return false;
      if (selectedStatus === "pending" && topic.status !== "pending") return false;
      if (selectedStatus === "in_progress" && topic.status !== "in_progress") return false;
    }

    return true;
  });

  // Calculate Metrics
  const totalCount = allTopics.length;
  const completedCount = allTopics.filter((t) => t.status === "completed").length;
  const inProgressCount = allTopics.filter((t) => t.status === "in_progress").length;
  const pendingCount = allTopics.filter((t) => t.status === "pending").length;

  const hasFilters =
    keyword.length > 0 ||
    selectedAudience !== "all" ||
    selectedField !== "all" ||
    selectedStatus !== "all";

  // CSV Export Data
  const csvHeaders = [
    "STT",
    "Tên đề tài",
    "Mô tả",
    "Đối tượng",
    "Lĩnh vực",
    "Link tài liệu",
    "Trạng thái",
    "Keywords",
  ];

  const csvRows = filteredTopics.map((t) => [
    t.order_index,
    t.topic_name,
    t.description ?? "",
    t.target_audience ?? "",
    t.field_category ?? "",
    t.document_links ?? "",
    t.status === "completed"
      ? "Đã thực hiện"
      : t.status === "in_progress"
      ? "Đang thực hiện"
      : "Chưa thực hiện",
    t.keywords ?? "",
  ]);

  return (
    <div className="p-5 md:p-8 space-y-6">
      {/* Success / Error Alerts */}
      {params.success === "created" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Tạo đề tài R&D mới thành công.
        </div>
      )}

      {params.success === "updated" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Cập nhật thông tin đề tài thành công.
        </div>
      )}

      {params.success === "deleted" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Đã xóa đề tài thành công.
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
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-base shadow-2xs">
                💡
              </span>
              <h1 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-wide">
                DANH SÁCH ĐỀ TÀI LÀM TIỀM NĂNG (R&D)
              </h1>
              <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-xs font-bold text-slate-700">
                {allTopics.length} đề tài
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Kho lưu trữ ý tưởng nghiên cứu, giải pháp sáng tạo khoa học kỹ thuật và sản phẩm công nghệ tiềm năng
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ExportCsvButton
              filename="danh-sach-de-tai-rd-tiem-nang"
              headers={csvHeaders}
              rows={csvRows}
            />

            <Link
              href="/rd/new"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 px-4 py-2 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              <span>➕</span>
              <span>Thêm đề tài mới</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tổng số đề tài
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {totalCount}
          </p>
          <span className="text-[11px] text-slate-400">
            Toàn bộ ý tưởng R&D
          </span>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 shadow-xs">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
            Đã thực hiện
          </span>
          <p className="text-2xl font-black text-blue-700 mt-1">
            {completedCount}
          </p>
          <span className="text-[11px] text-blue-600 font-medium">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}% tổng đề tài
          </span>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-xs">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
            Đang thực hiện
          </span>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {inProgressCount}
          </p>
          <span className="text-[11px] text-amber-600 font-medium">
            Đang nghiên cứu & test
          </span>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
            Chưa thực hiện
          </span>
          <p className="text-2xl font-black text-rose-700 mt-1">
            {pendingCount}
          </p>
          <span className="text-[11px] text-rose-600 font-medium">
            Đang chờ triển khai
          </span>
        </div>
      </div>

      {/* Main Table Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Filter Toolbar */}
        <div className="border-b border-slate-100 p-4 md:p-5">
          <form
            action="/rd"
            method="GET"
            className="flex flex-wrap items-center gap-2.5"
          >
            {/* Search Input */}
            <div className="min-w-[240px] flex-1">
              <input
                name="q"
                type="text"
                defaultValue={keyword}
                placeholder="Tìm theo tên đề tài, từ khóa, mô tả, lĩnh vực..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Audience Filter */}
            <select
              name="audience"
              defaultValue={selectedAudience}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả đối tượng</option>
              {audienceList.map((aud) => (
                <option key={aud} value={aud}>
                  {aud}
                </option>
              ))}
            </select>

            {/* Field Filter */}
            <select
              name="field"
              defaultValue={selectedField}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả lĩnh vực</option>
              {fieldList.map((fld) => (
                <option key={fld} value={fld}>
                  {fld}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Đã thực hiện</option>
              <option value="in_progress">Đang thực hiện</option>
              <option value="pending">Chưa thực hiện</option>
            </select>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-50 text-blue-700 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 px-4 py-2 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
            >
              Lọc đề tài
            </button>

            {hasFilters && (
              <Link
                href="/rd"
                className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-50 shadow-2xs"
              >
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Table Header: styled cleanly with natural slate tones */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12 border-r border-slate-100 text-slate-400">
                  STT
                </th>
                <th className="py-3 px-4 min-w-[200px] border-r border-slate-100">
                  TÊN ĐỀ TÀI
                </th>
                <th className="py-3 px-4 min-w-[240px] border-r border-slate-100">
                  MÔ TẢ
                </th>
                <th className="py-3 px-3 text-center min-w-[110px] border-r border-slate-100">
                  ĐỐI TƯỢNG
                </th>
                <th className="py-3 px-3 text-center min-w-[130px] border-r border-slate-100">
                  LĨNH VỰC
                </th>
                <th className="py-3 px-4 min-w-[220px] border-r border-slate-100">
                  LINK TÀI LIỆU
                </th>
                <th className="py-3 px-3 text-center min-w-[140px] border-r border-slate-100">
                  TRẠNG THÁI
                </th>
                <th className="py-3 px-3 min-w-[120px] border-r border-slate-100">
                  KEYWORD
                </th>
                <th className="py-3 px-3 text-center w-20">
                  THAO TÁC
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredTopics.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Không tìm thấy đề tài nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredTopics.map((topic) => (
                  <tr
                    key={topic.id}
                    className="hover:bg-amber-50/20 transition group"
                  >
                    {/* STT */}
                    <td className="py-3.5 px-3 text-center font-bold text-slate-800 border-r border-slate-100">
                      {topic.order_index}
                    </td>

                    {/* Tên đề tài */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-100 leading-snug">
                      <Link
                        href={`/rd/${topic.id}/edit`}
                        className="hover:text-blue-600 transition"
                      >
                        {topic.topic_name}
                      </Link>
                    </td>

                    {/* Mô tả */}
                    <td className="py-3.5 px-4 text-slate-600 border-r border-slate-100 leading-relaxed">
                      {topic.description || (
                        <span className="text-slate-300 italic">Chưa có mô tả</span>
                      )}
                    </td>

                    {/* Đối tượng */}
                    <td className="py-3.5 px-3 text-center border-r border-slate-100">
                      {getAudienceBadge(topic.target_audience)}
                    </td>

                    {/* Lĩnh vực */}
                    <td className="py-3.5 px-3 text-center font-semibold text-slate-700 border-r border-slate-100">
                      {topic.field_category || (
                        <span className="text-slate-300 italic">-</span>
                      )}
                    </td>

                    {/* Link tài liệu */}
                    <td className="py-3.5 px-4 border-r border-slate-100">
                      {renderDocumentLinks(topic.document_links)}
                    </td>

                    {/* Trạng thái (Interactive dropdown like screenshot) */}
                    <td className="py-3.5 px-3 text-center border-r border-slate-100">
                      <RdStatusDropdown
                        id={topic.id}
                        initialStatus={topic.status}
                      />
                    </td>

                    {/* Keywords */}
                    <td className="py-3.5 px-3 border-r border-slate-100">
                      {topic.keywords ? (
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {topic.keywords.split(",").map((kw, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              {kw.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">-</span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/rd/${topic.id}/edit`}
                          title="Chỉnh sửa đề tài"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>

                        <DeleteRdTopicButton
                          id={topic.id}
                          topicName={topic.topic_name}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
          <span>
            Hiển thị <strong>{filteredTopics.length}</strong> / {allTopics.length} đề tài tiềm năng
          </span>
          <span className="italic">
            * Bấm vào trạng thái để thay đổi trực tiếp (Đã thực hiện / Đang thực hiện / Chưa thực hiện)
          </span>
        </div>
      </section>
    </div>
  );
}