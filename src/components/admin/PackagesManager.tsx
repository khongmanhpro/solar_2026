"use client";

import { useMemo, useState, type FormEvent } from "react";

import { SYSTEM_TYPE_LABELS } from "@/config/admin";
import { ApiClientError, requestJson } from "@/lib/api-client";
import { formatVnd } from "@/lib/formatters";
import { solarPackageCreateSchema } from "@/lib/validations";
import type { SolarPackageCreateData } from "@/lib/validations";
import type { SolarPackage } from "@/types/solar";

type EditorState = { mode: "new" } | { mode: "edit"; id: string } | null;
type FieldErrors = Record<string, string>;

const EMPTY_PACKAGE: SolarPackageCreateData = {
  code: "",
  name: "",
  description: "",
  priceVnd: 0,
  capacityKwp: 0,
  baseMonthlyGenerationKwh: 0,
  requiredRoofAreaM2: 5,
  systemType: "grid-tied",
  electricalPhase: "single-phase",
  batteryCapacityKwh: 0,
  equipmentSummary: "",
  panelBrand: "",
  panelModel: "",
  inverterBrand: "",
  inverterModel: "",
  panelWarrantyYears: 12,
  inverterWarrantyYears: 5,
  active: true,
  displayOrder: 0,
};

const numericFields = [
  "priceVnd",
  "capacityKwp",
  "baseMonthlyGenerationKwh",
  "requiredRoofAreaM2",
  "batteryCapacityKwh",
  "panelWarrantyYears",
  "inverterWarrantyYears",
  "displayOrder",
] as const;

function sortedPackages(items: SolarPackage[]) {
  return [...items].sort(
    (first, second) =>
      first.displayOrder - second.displayOrder || first.name.localeCompare(second.name),
  );
}

function Field({
  label,
  name,
  value,
  error,
  type = "text",
  step,
}: {
  label: string;
  name: string;
  value: string | number;
  error?: string;
  type?: "text" | "number";
  step?: string;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
      {label}
      <input
        aria-invalid={Boolean(error)}
        className="admin-field normal-case tracking-normal"
        defaultValue={value}
        name={name}
        step={step}
        type={type}
      />
      {error ? <span className="mt-1 block normal-case tracking-normal text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}

export function PackagesManager({ initialPackages }: { initialPackages: SolarPackage[] }) {
  const [packages, setPackages] = useState(() => sortedPackages(initialPackages));
  const [editor, setEditor] = useState<EditorState>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editingPackage = useMemo(() => {
    if (!editor || editor.mode === "new") return EMPTY_PACKAGE;
    return packages.find((item) => item.id === editor.id) ?? EMPTY_PACKAGE;
  }, [editor, packages]);

  function openNew() {
    setEditor({ mode: "new" });
    setErrors({});
    setNotice(null);
    requestAnimationFrame(() => document.getElementById("package-editor")?.scrollIntoView({ behavior: "smooth" }));
  }

  function openEdit(id: string) {
    setEditor({ mode: "edit", id });
    setErrors({});
    setNotice(null);
    requestAnimationFrame(() => document.getElementById("package-editor")?.scrollIntoView({ behavior: "smooth" }));
  }

  async function savePackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const raw = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    for (const field of numericFields) raw[field] = Number(raw[field]);
    raw.active = formData.get("active") === "on";

    const parsed = solarPackageCreateSchema.safeParse(raw);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      setNotice("Vui lòng kiểm tra lại các trường được đánh dấu.");
      return;
    }

    setBusy(true);
    setErrors({});
    setNotice(null);
    try {
      const isNew = editor?.mode === "new";
      const endpoint = isNew ? "/api/admin/packages" : `/api/admin/packages/${editor?.mode === "edit" ? editor.id : ""}`;
      const saved = await requestJson<SolarPackage>(endpoint, {
        method: isNew ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      setPackages((current) => sortedPackages(isNew ? [...current, saved] : current.map((item) => item.id === saved.id ? saved : item)));
      setEditor({ mode: "edit", id: saved.id });
      setNotice(isNew ? "Đã thêm gói mới. Phép tính kế tiếp sẽ đọc dữ liệu này." : "Đã lưu thay đổi gói hệ thống.");
    } catch (caughtError) {
      const apiError = caughtError instanceof ApiClientError ? caughtError : null;
      setNotice(apiError?.message ?? "Không thể lưu gói lúc này.");
      if (apiError) {
        setErrors(Object.fromEntries(apiError.issues.map((issue) => [issue.path, issue.message])));
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: SolarPackage) {
    setBusy(true);
    setNotice(null);
    try {
      const saved = await requestJson<SolarPackage>(`/api/admin/packages/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      setPackages((current) => current.map((candidate) => candidate.id === saved.id ? saved : candidate));
      setNotice(saved.active ? `Đã bật ${saved.name}.` : `Đã tắt ${saved.name}; dữ liệu lịch sử vẫn được giữ nguyên.`);
    } catch (caughtError) {
      setNotice(caughtError instanceof ApiClientError ? caughtError.message : "Không thể đổi trạng thái gói.");
    } finally {
      setBusy(false);
    }
  }

  async function movePackage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    const current = packages[index];
    const target = packages[targetIndex];
    if (!current || !target) return;

    setBusy(true);
    setNotice(null);
    try {
      const [savedCurrent, savedTarget] = await Promise.all([
        requestJson<SolarPackage>(`/api/admin/packages/${current.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ displayOrder: target.displayOrder }),
        }),
        requestJson<SolarPackage>(`/api/admin/packages/${target.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ displayOrder: current.displayOrder }),
        }),
      ]);
      setPackages((items) => sortedPackages(items.map((item) => item.id === savedCurrent.id ? savedCurrent : item.id === savedTarget.id ? savedTarget : item)));
      setNotice("Đã cập nhật thứ tự hiển thị.");
    } catch (caughtError) {
      setNotice(caughtError instanceof ApiClientError ? caughtError.message : "Không thể đổi thứ tự gói.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--muted)]"><strong className="text-[var(--ink)]">{packages.length}</strong> gói · {packages.filter((item) => item.active).length} đang bật</p>
        <button className="admin-primary-button" onClick={openNew} type="button">+ Thêm gói hệ thống</button>
      </div>

      {notice ? <p className="rounded-lg border border-[var(--line-strong)] bg-[var(--admin-panel)] p-3 text-sm text-[var(--ink)]" role="status">{notice}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {packages.map((item, index) => (
          <article className="admin-panel overflow-hidden" key={item.id}>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand)]">{item.code}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.active ? "bg-[var(--brand-soft)] text-[var(--brand-dark)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}`}>{item.active ? "Đang bật" : "Đã tắt"}</span>
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold">{item.name}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
              </div>
              <span className="font-display text-3xl font-semibold text-[var(--line-strong)]">{String(item.displayOrder).padStart(2, "0")}</span>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-[var(--line)] sm:grid-cols-4">
              {[
                ["Giá", formatVnd(item.priceVnd)],
                ["Công suất", `${item.capacityKwp} kWp`],
                ["Sản lượng", `${item.baseMonthlyGenerationKwh} kWh/tháng`],
                ["Loại", SYSTEM_TYPE_LABELS[item.systemType]],
                ["Pha điện", item.electricalPhase === "single-phase" ? "1 pha" : "3 pha"],
              ].map(([label, value]) => (
                <div className="bg-[var(--paper)] p-3" key={label}><dt className="text-xs uppercase tracking-[0.1em] text-[var(--muted)]">{label}</dt><dd className="mt-1 text-xs font-semibold">{value}</dd></div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2 p-4">
              <button className="admin-secondary-button" disabled={busy || index === 0} onClick={() => movePackage(index, -1)} type="button" aria-label={`Đưa ${item.name} lên`}>↑</button>
              <button className="admin-secondary-button" disabled={busy || index === packages.length - 1} onClick={() => movePackage(index, 1)} type="button" aria-label={`Đưa ${item.name} xuống`}>↓</button>
              <button className="admin-secondary-button" disabled={busy} onClick={() => openEdit(item.id)} type="button">Chỉnh sửa</button>
              <button className="admin-secondary-button ml-auto" disabled={busy} onClick={() => toggleActive(item)} type="button">{item.active ? "Tắt gói" : "Bật gói"}</button>
            </div>
          </article>
        ))}
      </div>

      {editor ? (
        <section className="admin-panel scroll-mt-6 overflow-hidden" id="package-editor">
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--admin-panel)] p-5">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand)]">Biểu mẫu cấu hình</p><h2 className="mt-1 font-display text-3xl font-semibold">{editor.mode === "new" ? "Thêm gói mới" : `Sửa ${editingPackage.name}`}</h2></div>
            <button className="admin-secondary-button" onClick={() => setEditor(null)} type="button">Đóng</button>
          </div>
          <form className="space-y-8 p-5 sm:p-7" key={editor.mode === "new" ? "new" : editor.id} noValidate onSubmit={savePackage}>
            <fieldset className="grid gap-5 md:grid-cols-2"><legend className="mb-4 font-display text-xl font-semibold">Nhận diện & thương mại</legend>
              <Field error={errors.code} label="Mã gói" name="code" value={editingPackage.code} />
              <Field error={errors.name} label="Tên gói" name="name" value={editingPackage.name} />
              <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)] md:col-span-2">Mô tả<textarea className="admin-field min-h-28 normal-case tracking-normal" defaultValue={editingPackage.description} name="description" />{errors.description ? <span className="mt-1 block normal-case text-[var(--danger)]">{errors.description}</span> : null}</label>
              <Field error={errors.priceVnd} label="Giá gói (VND)" name="priceVnd" type="number" value={editingPackage.priceVnd} />
              <Field error={errors.displayOrder} label="Thứ tự hiển thị" name="displayOrder" type="number" value={editingPackage.displayOrder} />
            </fieldset>

            <fieldset className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><legend className="mb-4 font-display text-xl font-semibold">Thông số hệ thống</legend>
              <Field error={errors.capacityKwp} label="Công suất (kWp)" name="capacityKwp" step="0.1" type="number" value={editingPackage.capacityKwp} />
              <Field error={errors.baseMonthlyGenerationKwh} label="Sản lượng/tháng (kWh)" name="baseMonthlyGenerationKwh" step="0.1" type="number" value={editingPackage.baseMonthlyGenerationKwh} />
              <Field error={errors.requiredRoofAreaM2} label="Diện tích mái (m²)" name="requiredRoofAreaM2" step="0.1" type="number" value={editingPackage.requiredRoofAreaM2} />
              <Field error={errors.batteryCapacityKwh} label="Dung lượng pin (kWh)" name="batteryCapacityKwh" step="0.1" type="number" value={editingPackage.batteryCapacityKwh} />
              <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Loại hệ thống<select className="admin-field normal-case tracking-normal" defaultValue={editingPackage.systemType} name="systemType"><option value="grid-tied">Hòa lưới</option><option value="hybrid">Hybrid + lưu trữ</option></select></label>
              <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Pha điện inverter<select aria-invalid={Boolean(errors.electricalPhase)} className="admin-field normal-case tracking-normal" defaultValue={editingPackage.electricalPhase} name="electricalPhase"><option value="single-phase">Điện 1 pha</option><option value="three-phase">Điện 3 pha</option></select>{errors.electricalPhase ? <span className="mt-1 block normal-case tracking-normal text-[var(--danger)]">{errors.electricalPhase}</span> : null}</label>
            </fieldset>

            <fieldset className="grid gap-5 md:grid-cols-2"><legend className="mb-4 font-display text-xl font-semibold">Thiết bị & bảo hành</legend>
              <Field error={errors.panelBrand} label="Thương hiệu tấm pin" name="panelBrand" value={editingPackage.panelBrand} />
              <Field error={errors.panelModel} label="Model tấm pin" name="panelModel" value={editingPackage.panelModel} />
              <Field error={errors.inverterBrand} label="Thương hiệu inverter" name="inverterBrand" value={editingPackage.inverterBrand} />
              <Field error={errors.inverterModel} label="Model inverter" name="inverterModel" value={editingPackage.inverterModel} />
              <Field error={errors.panelWarrantyYears} label="Bảo hành tấm pin (năm)" name="panelWarrantyYears" type="number" value={editingPackage.panelWarrantyYears} />
              <Field error={errors.inverterWarrantyYears} label="Bảo hành inverter (năm)" name="inverterWarrantyYears" type="number" value={editingPackage.inverterWarrantyYears} />
              <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)] md:col-span-2">Tóm tắt thiết bị<textarea className="admin-field min-h-28 normal-case tracking-normal" defaultValue={editingPackage.equipmentSummary} name="equipmentSummary" />{errors.equipmentSummary ? <span className="mt-1 block normal-case text-[var(--danger)]">{errors.equipmentSummary}</span> : null}</label>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6">
              <label className="flex min-h-12 items-center gap-3 text-sm font-semibold"><input className="size-5 accent-[var(--brand)] focus:rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand-dark)] focus:ring-offset-2 focus:ring-offset-[var(--paper)]" defaultChecked={editingPackage.active} name="active" type="checkbox" /> Bật gói sau khi lưu</label>
              <button className="admin-primary-button" disabled={busy} type="submit">{busy ? "Đang lưu…" : "Lưu gói hệ thống"}</button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
