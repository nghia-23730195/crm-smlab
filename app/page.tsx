import Link from "next/link";

const statistics = [
  {
    title: "Tổng khách hàng",
    value: "128",
    description: "+12 khách hàng trong tháng",
  },
  {
    title: "Tổng sản phẩm",
    value: "356",
    description: "18 sản phẩm sắp hết",
  },
  {
    title: "Dự án đang thực hiện",
    value: "24",
    description: "6 dự án sắp đến hạn",
  },
  {
    title: "Doanh thu tháng",
    value: "42.500.000 ₫",
    description: "+8,4% so với tháng trước",
  },
];

const chartData = [
  { month: "T1", revenue: 45, expense: 28 },
  { month: "T2", revenue: 65, expense: 40 },
  { month: "T3", revenue: 52, expense: 34 },
  { month: "T4", revenue: 78, expense: 48 },
  { month: "T5", revenue: 68, expense: 42 },
  { month: "T6", revenue: 90, expense: 55 },
];

const projects = [
  {
    name: "Robot dò đường",
    customer: "THPT Nguyễn Hữu Thọ",
    deadline: "05/07/2026",
    status: "Đang thực hiện",
  },
  {
    name: "Hệ thống cảnh báo té ngã",
    customer: "Nguyễn Văn Minh",
    deadline: "12/07/2026",
    status: "Chờ khách hàng",
  },
  {
    name: "Mô hình IoT nhà thông minh",
    customer: "THCS Trần Phú",
    deadline: "18/07/2026",
    status: "Đang chuẩn bị",
  },
];

export default function DashboardPage() {
  return (
    <div className="p-5 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statistics.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">
              {item.title}
            </p>

            <p className="mt-4 text-2xl font-bold tracking-tight">
              {item.value}
            </p>

            <p className="mt-3 text-xs text-slate-500">
              {item.description}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">
                Doanh thu và chi phí
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Thống kê 6 tháng gần nhất
              </p>
            </div>

            <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none">
              <option>6 tháng</option>
              <option>12 tháng</option>
            </select>
          </div>

          <div className="mt-8 flex h-64 items-end gap-4 border-b border-l border-slate-200 px-4 pb-4">
            {chartData.map((item) => (
              <div
                key={item.month}
                className="flex flex-1 flex-col items-center justify-end gap-3"
              >
                <div className="flex w-full items-end justify-center gap-1">
                  <div
                    className="w-5 rounded-t-md bg-blue-600"
                    style={{
                      height: `${item.revenue * 2}px`,
                    }}
                  />

                  <div
                    className="w-5 rounded-t-md bg-slate-300"
                    style={{
                      height: `${item.expense * 2}px`,
                    }}
                  />
                </div>

                <span className="text-xs text-slate-500">
                  {item.month}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-blue-600" />
              <span>Doanh thu</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-slate-300" />
              <span>Chi phí</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">
            Tổng quan tài chính
          </h3>

          <div className="mt-6 space-y-5">
            <FinancialRow
              label="Doanh thu"
              value="42.500.000 ₫"
            />

            <FinancialRow
              label="Chi phí"
              value="27.300.000 ₫"
            />

            <FinancialRow
              label="Lợi nhuận"
              value="15.200.000 ₫"
            />

            <FinancialRow
              label="Công nợ"
              value="8.750.000 ₫"
            />
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold">
              Dự án gần đây
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Theo dõi các dự án đang thực hiện
            </p>
          </div>

          <Link
            href="/projects"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Xem tất cả
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">
                  Tên dự án
                </th>

                <th className="px-6 py-4">
                  Khách hàng
                </th>

                <th className="px-6 py-4">
                  Hạn hoàn thành
                </th>

                <th className="px-6 py-4">
                  Trạng thái
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {projects.map((project) => (
                <tr
                  key={project.name}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-semibold">
                    {project.name}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-600">
                    {project.customer}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-600">
                    {project.deadline}
                  </td>

                  <td className="px-6 py-4">
                    <StatusBadge
                      status={project.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type FinancialRowProps = {
  label: string;
  value: string;
};

function FinancialRow({
  label,
  value,
}: FinancialRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="font-bold">
        {value}
      </span>
    </div>
  );
}

type StatusBadgeProps = {
  status: string;
};

function StatusBadge({
  status,
}: StatusBadgeProps) {
  const styles: Record<string, string> = {
    "Đang thực hiện":
      "bg-blue-100 text-blue-700",
    "Chờ khách hàng":
      "bg-amber-100 text-amber-700",
    "Đang chuẩn bị":
      "bg-violet-100 text-violet-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}