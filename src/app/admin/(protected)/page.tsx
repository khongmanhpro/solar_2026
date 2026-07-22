import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LEAD_STATUS_LABELS } from "@/config/admin";
import { formatVnd } from "@/lib/formatters";
import { services } from "@/server/container";

export const metadata = { title: "Tổng quan quản trị | Solar" };

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function AdminDashboardPage() {
  const [packages, leads] = await Promise.all([
    services.packages.list(),
    services.leads.list(),
  ]);
  const activePackages = packages.filter((item) => item.active).length;
  const newLeads = leads.filter((item) => item.status === "new").length;
  const progressingLeads = leads.filter((item) =>
    ["contacted", "survey_scheduled", "quoted"].includes(item.status),
  ).length;

  return (
    <>
      <AdminPageHeader
        description="Một ảnh chụp nhanh về cấu hình đang được công cụ tính toán sử dụng và luồng yêu cầu khảo sát mới nhất."
        eyebrow="Trạm điều khiển / Tổng quan"
        title="Dữ liệu đang vận hành"
      />

      <section aria-label="Chỉ số vận hành" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Gói đang bật", activePackages, `${packages.length} gói tổng cộng`],
          ["Lead mới", newLeads, "Cần ưu tiên liên hệ"],
          ["Đang xử lý", progressingLeads, "Từ liên hệ đến báo giá"],
          ["Tổng lead", leads.length, "Tất cả trạng thái"],
        ].map(([label, value, note], index) => (
          <article className="admin-panel relative overflow-hidden p-5" key={String(label)}>
            <span className="absolute right-4 top-4 text-xs font-bold tracking-[0.14em] text-[var(--line-strong)]">
              0{index + 1}
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              {label}
            </p>
            <p className="mt-5 break-words font-display text-5xl font-semibold text-[var(--ink)]">
              {value}
            </p>
            <p className="mt-3 text-xs text-[var(--muted)]">{note}</p>
          </article>
        ))}
      </section>

      <section className="mt-7 grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand)]">Tín hiệu vào</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">Lead gần nhất</h2>
            </div>
            <Link className="text-sm font-bold text-[var(--brand-dark)] underline decoration-[var(--sun)] decoration-2 underline-offset-4 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]" href="/admin/leads">
              Xem tất cả
            </Link>
          </div>
          {leads.length === 0 ? (
            <p className="p-8 text-sm text-[var(--muted)]">Chưa có yêu cầu khảo sát nào.</p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {leads.slice(0, 5).map((lead) => (
                <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center" key={lead.id}>
                  <div>
                    <p className="font-semibold text-[var(--ink)]">{lead.fullName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatVnd(lead.calculation.monthlyBill)} · {lead.calculation.province}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-bold text-[var(--brand-dark)]">{LEAD_STATUS_LABELS[lead.status]}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{dateFormatter.format(lead.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="admin-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand)]">Đường dữ liệu</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">Cấu hình đang cấp điện</h2>
          <div className="mt-6 space-y-4">
            <Link className="block border-l-2 border-[var(--sun)] bg-[var(--admin-panel)] p-4 transition hover:bg-[var(--warning-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]" href="/admin/packages">
              <p className="font-semibold">Gói hệ thống</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Giá, công suất, sản lượng, thiết bị và thứ tự đề xuất.</p>
            </Link>
            <Link className="block border-l-2 border-[var(--brand)] bg-[var(--admin-panel)] p-4 transition hover:bg-[var(--brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]" href="/admin/settings">
              <p className="font-semibold">Công thức & khu vực</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Giá điện, tỷ lệ sử dụng và hệ số sản lượng tỉnh.</p>
            </Link>
          </div>
          <p className="mt-6 rounded-lg border border-[var(--line)] p-3 text-xs leading-5 text-[var(--muted)]">
            Mọi thay đổi đã lưu sẽ được dùng từ phép tính kế tiếp; các snapshot cũ vẫn giữ nguyên.
          </p>
        </article>
      </section>
    </>
  );
}
