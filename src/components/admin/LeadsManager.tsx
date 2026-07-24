"use client";

import { useMemo, useState } from "react";

import {
  CONTACT_TIME_LABELS,
  DAYTIME_USAGE_LABELS,
  ELECTRICITY_TYPE_LABELS,
  LEAD_STATUS_LABELS,
} from "@/config/admin";
import { ApiClientError, requestJson } from "@/lib/api-client";
import { formatKwh, formatPaybackYears, formatPercent, formatVnd } from "@/lib/formatters";
import {
  LEAD_STATUSES,
  type AdminLeadDetail,
  type LeadStatus,
  type PreferredContactTime,
} from "@/types/solar";

export interface AdminLeadListItem {
  id: string;
  fullName: string;
  phone: string;
  address?: string;
  preferredContactTime: PreferredContactTime;
  note?: string;
  calculationId: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  calculation: {
    monthlyBill: number;
    electricityType: AdminLeadDetail["calculation"]["electricityType"];
    province: string;
    recommendedPackageName: string | null;
    createdAt: string;
  };
}

type LeadDetailPayload = Omit<AdminLeadDetail, "createdAt" | "updatedAt" | "calculation"> & {
  createdAt: string;
  updatedAt: string;
  calculation: Omit<AdminLeadDetail["calculation"], "createdAt"> & { createdAt: string };
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

export function LeadsManager({ initialLeads }: { initialLeads: AdminLeadListItem[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<LeadDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visibleLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    return leads.filter((lead) => {
      const matchesStatus = filter === "all" || lead.status === filter;
      const matchesQuery = !normalizedQuery || [lead.fullName, lead.phone, lead.address ?? "", lead.calculation.province]
        .join(" ")
        .toLocaleLowerCase("vi-VN")
        .includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [filter, leads, query]);

  async function updateStatus(id: string, status: LeadStatus) {
    setUpdatingId(id);
    setNotice(null);
    try {
      await requestJson(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setLeads((items) => items.map((item) => item.id === id ? { ...item, status } : item));
      setDetail((current) => current?.id === id ? { ...current, status } : current);
      setNotice(`Đã chuyển trạng thái sang “${LEAD_STATUS_LABELS[status]}”.`);
    } catch (error) {
      setNotice(error instanceof ApiClientError ? error.message : "Không thể cập nhật trạng thái.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    setNotice(null);
    try {
      setDetail(await requestJson<LeadDetailPayload>(`/api/admin/leads/${id}`));
      requestAnimationFrame(() => document.getElementById("lead-detail")?.scrollIntoView({ behavior: "smooth" }));
    } catch (error) {
      setNotice(error instanceof ApiClientError ? error.message : "Không thể tải chi tiết lead.");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="admin-panel grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_14rem]">
        <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Tìm khách hàng<input className="admin-field normal-case tracking-normal" onChange={(event) => setQuery(event.target.value)} placeholder="Tên, số điện thoại, khu vực…" type="search" value={query} /></label>
        <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Trạng thái<select className="admin-field normal-case tracking-normal" onChange={(event) => setFilter(event.target.value as LeadStatus | "all")} value={filter}><option value="all">Tất cả trạng thái</option>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{LEAD_STATUS_LABELS[status]}</option>)}</select></label>
      </section>

      {notice ? <p className="rounded-lg border border-[var(--line-strong)] bg-[var(--admin-panel)] p-3 text-sm" role="status">{notice}</p> : null}

      <div className="flex items-center justify-between gap-4"><p className="text-sm text-[var(--muted)]"><strong className="text-[var(--ink)]">{visibleLeads.length}</strong> kết quả</p><p className="text-xs text-[var(--muted)]">Lead mới nhất hiển thị trước</p></div>

      {visibleLeads.length === 0 ? (
        <div className="admin-panel p-10 text-center"><span className="sun-mark" aria-hidden="true" /><h2 className="mt-5 font-display text-2xl font-semibold">Không có lead phù hợp</h2><p className="mt-2 text-sm text-[var(--muted)]">Thử đổi từ khóa hoặc bộ lọc trạng thái.</p></div>
      ) : (
        <section className="admin-panel overflow-hidden" aria-label="Danh sách khách hàng tiềm năng">
          <div className="hidden grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr_auto] gap-4 border-b border-[var(--line)] bg-[var(--admin-panel)] px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)] lg:grid"><span>Khách hàng</span><span>Kết quả tính</span><span>Gói đề xuất</span><span>Trạng thái</span><span>Chi tiết</span></div>
          <div className="divide-y divide-[var(--line)]">
            {visibleLeads.map((lead) => (
              <article className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr_auto] lg:items-center" key={lead.id}>
                <div><p className="font-semibold">{lead.fullName}</p><a className="mt-1 inline-block rounded text-sm font-semibold text-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]" href={`tel:${lead.phone}`}>{lead.phone}</a><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{lead.address || "Chưa có địa chỉ"}</p></div>
                <div><p className="font-semibold">{formatVnd(lead.calculation.monthlyBill)}</p><p className="mt-1 text-xs text-[var(--muted)]">{lead.calculation.province}</p><p className="mt-1 text-xs text-[var(--muted)]">{dateFormatter.format(new Date(lead.createdAt))}</p></div>
                <p className="text-sm font-semibold text-[var(--ink)]">{lead.calculation.recommendedPackageName ?? "Chưa có gói phù hợp"}</p>
                <select aria-label={`Trạng thái của ${lead.fullName}`} className="admin-field mt-0 text-sm" disabled={updatingId === lead.id} onChange={(event) => updateStatus(lead.id, event.target.value as LeadStatus)} value={lead.status}>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{LEAD_STATUS_LABELS[status]}</option>)}</select>
                <button className="admin-secondary-button" disabled={detailLoading} onClick={() => openDetail(lead.id)} type="button">{detailLoading ? "Đang tải…" : "Mở hồ sơ"}</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {detail ? <LeadDetail detail={detail} onClose={() => setDetail(null)} onStatusChange={(status) => updateStatus(detail.id, status)} updating={updatingId === detail.id} /> : null}
    </div>
  );
}

function LeadDetail({ detail, onClose, onStatusChange, updating }: { detail: LeadDetailPayload; onClose: () => void; onStatusChange: (status: LeadStatus) => void; updating: boolean }) {
  const recommendation = detail.calculation.result.recommendedPackage;

  return (
    <section className="admin-panel scroll-mt-6 overflow-hidden" id="lead-detail">
      <div className="flex items-start justify-between gap-5 border-b border-[var(--line)] bg-[var(--ink)] p-5 text-[var(--paper)] sm:p-7">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--focus)]">Hồ sơ khảo sát / {detail.id}</p><h2 className="mt-2 font-display text-3xl font-semibold">{detail.fullName}</h2><p className="mt-2 text-sm text-[var(--line)]">Đăng ký {dateFormatter.format(new Date(detail.createdAt))}</p></div>
        <button className="min-h-11 rounded-lg border border-[var(--admin-rail)] px-3 py-2 text-sm font-semibold transition hover:border-[var(--sun)] hover:text-[var(--sun)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sun)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)]" onClick={onClose} type="button">Đóng</button>
      </div>
      <div className="grid gap-px bg-[var(--line)] xl:grid-cols-3">
        <div className="bg-[var(--paper)] p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand)]">Liên hệ</p><dl className="mt-5 space-y-4 text-sm"><DetailRow label="Điện thoại" value={detail.phone} /><DetailRow label="Địa chỉ" value={detail.address || "Chưa cung cấp"} /><DetailRow label="Thời gian" value={CONTACT_TIME_LABELS[detail.preferredContactTime]} /><DetailRow label="Ghi chú" value={detail.note || "Không có ghi chú"} /></dl></div>
        <div className="bg-[var(--paper)] p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand)]">Đầu vào calculation</p><dl className="mt-5 space-y-4 text-sm"><DetailRow label="Loại điện" value={ELECTRICITY_TYPE_LABELS[detail.calculation.electricityType]} /><DetailRow label="Tiền điện" value={formatVnd(detail.calculation.monthlyBill)} /><DetailRow label="Khu vực" value={detail.calculation.province} /><DetailRow label="Dùng ban ngày" value={DAYTIME_USAGE_LABELS[detail.calculation.daytimeUsageLevel]} /><DetailRow label="Diện tích mái" value={detail.calculation.roofAreaM2 === null ? "Chưa biết — cần khảo sát" : `${detail.calculation.roofAreaM2} m²`} /><DetailRow label="Điện dự phòng" value={detail.calculation.backupRequired ? "Có" : "Không"} /></dl></div>
        <div className="bg-[var(--paper)] p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand)]">Xử lý lead</p><label className="mt-5 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Trạng thái<select className="admin-field normal-case tracking-normal" disabled={updating} onChange={(event) => onStatusChange(event.target.value as LeadStatus)} value={detail.status}>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{LEAD_STATUS_LABELS[status]}</option>)}</select></label><a className="admin-primary-button mt-4 w-full no-underline" href={`tel:${detail.phone}`}>Gọi khách hàng</a></div>
      </div>
      <div className="p-5 sm:p-7"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand)]">Snapshot kết quả</p><h3 className="mt-2 font-display text-2xl font-semibold">{detail.calculation.recommendedPackageName ?? "Chưa có gói phù hợp"}</h3></div><p className="text-xs text-[var(--muted)]">Calculation · {detail.calculationId}</p></div>
        {recommendation ? <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-4">{[["Sản lượng", formatKwh(recommendation.adjustedGenerationKwh)], ["Tiết kiệm/tháng", formatVnd(recommendation.monthlySavingsVnd)], ["Giảm hóa đơn", formatPercent(recommendation.reductionPercent)], ["Hoàn vốn", formatPaybackYears(recommendation.paybackYears)]].map(([label, value]) => <div className="bg-[var(--admin-panel)] p-4" key={label}><dt className="text-xs uppercase tracking-[0.1em] text-[var(--muted)]">{label}</dt><dd className="mt-2 font-display text-xl font-semibold">{value}</dd></div>)}</dl> : <p className="mt-5 rounded-lg bg-[var(--admin-panel)] p-4 text-sm text-[var(--muted)]">Kết quả này không có package phù hợp với đầu vào.</p>}
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words font-semibold leading-6 text-[var(--ink)]">{value}</dd></div>;
}
