"use client";

import { useState, type FormEvent } from "react";

import { ApiClientError, requestJson } from "@/lib/api-client";
import {
  calculationSettingsSchema,
  provinceFactorSchema,
} from "@/lib/validations";
import type { CalculationSettings, ProvinceFactor } from "@/types/solar";

type Errors = Record<string, string>;
type ProvinceEditor = { mode: "new" } | { mode: "edit"; id: string } | null;

const settingNumberFields = [
  "averageElectricityPriceVndPerKwh",
  "batteryRoundTripEfficiency",
  "batteryDailyCycleFactor",
  "lowEstimateFactor",
  "highEstimateFactor",
  "systemLifetimeYears",
  "maintenanceRatePerYear",
  "daytimeLowRatio",
  "daytimeMediumRatio",
  "daytimeHighRatio",
] as const;

function issueMap(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const mapped: Errors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "form");
    if (!mapped[field]) mapped[field] = issue.message;
  }
  return mapped;
}

function ConfigField({
  label,
  name,
  value,
  error,
  type = "number",
  step = "0.01",
  hint,
}: {
  label: string;
  name: string;
  value: string | number;
  error?: string;
  type?: "number" | "text" | "url";
  step?: string;
  hint?: string;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
      {label}
      <input className="admin-field normal-case tracking-normal" defaultValue={value} name={name} step={type === "number" ? step : undefined} type={type} />
      {hint ? <span className="mt-1 block text-xs font-normal normal-case leading-5 tracking-normal">{hint}</span> : null}
      {error ? <span className="mt-1 block normal-case tracking-normal text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}

function sortProvinces(items: ProvinceFactor[]) {
  return [...items].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export function SettingsManager({
  initialSettings,
  initialProvinces,
}: {
  initialSettings: CalculationSettings;
  initialProvinces: ProvinceFactor[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [provinces, setProvinces] = useState(() => sortProvinces(initialProvinces));
  const [settingErrors, setSettingErrors] = useState<Errors>({});
  const [provinceErrors, setProvinceErrors] = useState<Errors>({});
  const [provinceEditor, setProvinceEditor] = useState<ProvinceEditor>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const province = provinceEditor?.mode === "edit"
    ? provinces.find((item) => item.id === provinceEditor.id)
    : undefined;

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, unknown>;
    for (const field of settingNumberFields) raw[field] = Number(raw[field]);
    const parsed = calculationSettingsSchema.safeParse(raw);

    if (!parsed.success) {
      setSettingErrors(issueMap(parsed.error.issues));
      setNotice("Cấu hình chưa hợp lệ. Vui lòng kiểm tra các giá trị.");
      return;
    }

    setBusy(true);
    setSettingErrors({});
    setNotice(null);
    try {
      const saved = await requestJson<CalculationSettings>("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      setSettings(saved);
      setNotice("Đã lưu giả định tính toán. Phép tính kế tiếp sẽ dùng cấu hình mới.");
    } catch (error) {
      const apiError = error instanceof ApiClientError ? error : null;
      setNotice(apiError?.message ?? "Không thể lưu cấu hình lúc này.");
      if (apiError) setSettingErrors(issueMap(apiError.issues.map((item) => ({ path: [item.path], message: item.message }))));
    } finally {
      setBusy(false);
    }
  }

  async function saveProvince(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = provinceFactorSchema.safeParse({
      code: formData.get("code"),
      name: formData.get("name"),
      factor: Number(formData.get("factor")),
      displayOrder: Number(formData.get("displayOrder")),
      active: formData.get("active") === "on",
    });

    if (!parsed.success) {
      setProvinceErrors(issueMap(parsed.error.issues));
      setNotice("Hệ số khu vực chưa hợp lệ.");
      return;
    }

    setBusy(true);
    setProvinceErrors({});
    setNotice(null);
    try {
      const isNew = provinceEditor?.mode === "new";
      const id = provinceEditor?.mode === "edit" ? provinceEditor.id : "";
      const saved = await requestJson<ProvinceFactor>(isNew ? "/api/admin/provinces" : `/api/admin/provinces/${id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      setProvinces((items) => sortProvinces(isNew ? [...items, saved] : items.map((item) => item.id === saved.id ? saved : item)));
      setProvinceEditor({ mode: "edit", id: saved.id });
      setNotice(isNew ? "Đã thêm khu vực mới." : "Đã lưu hệ số khu vực.");
    } catch (error) {
      const apiError = error instanceof ApiClientError ? error : null;
      setNotice(apiError?.message ?? "Không thể lưu khu vực lúc này.");
      if (apiError) setProvinceErrors(issueMap(apiError.issues.map((item) => ({ path: [item.path], message: item.message }))));
    } finally {
      setBusy(false);
    }
  }

  async function toggleProvince(item: ProvinceFactor) {
    setBusy(true);
    setNotice(null);
    try {
      const saved = await requestJson<ProvinceFactor>(`/api/admin/provinces/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      setProvinces((items) => items.map((candidate) => candidate.id === saved.id ? saved : candidate));
      setNotice(`${saved.name} ${saved.active ? "đã được bật" : "đã tạm ngừng"}.`);
    } catch (error) {
      setNotice(error instanceof ApiClientError ? error.message : "Không thể đổi trạng thái khu vực.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {notice ? <p className="rounded-lg border border-[var(--line-strong)] bg-[var(--admin-panel)] p-3 text-sm" role="status">{notice}</p> : null}

      <section className="admin-panel overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[var(--admin-panel)] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand)]">01 / Engine</p>
          <h2 className="mt-1 font-display text-3xl font-semibold">Giả định tính toán</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Tỷ lệ và hiệu suất nhập ở dạng thập phân: 0,5 tương đương 50%.</p>
        </div>
        <form className="space-y-8 p-5 sm:p-7" key={JSON.stringify(settings)} noValidate onSubmit={saveSettings}>
          <fieldset className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><legend className="mb-4 font-display text-xl font-semibold">Kinh tế & vòng đời</legend>
            <ConfigField error={settingErrors.averageElectricityPriceVndPerKwh} hint="Giá dự phòng cho phép tính legacy; điện sinh hoạt hiện dùng registry 6 bậc QD1279 có phiên bản." label="Giá điện quy đổi dự phòng" name="averageElectricityPriceVndPerKwh" step="1" value={settings.averageElectricityPriceVndPerKwh} />
            <ConfigField error={settingErrors.systemLifetimeYears} label="Vòng đời hệ thống (năm)" name="systemLifetimeYears" step="1" value={settings.systemLifetimeYears} />
            <ConfigField error={settingErrors.maintenanceRatePerYear} label="Chi phí bảo trì/năm" name="maintenanceRatePerYear" value={settings.maintenanceRatePerYear} />
            <ConfigField error={settingErrors.batteryDailyCycleFactor} label="Hệ số chu kỳ pin/ngày" name="batteryDailyCycleFactor" value={settings.batteryDailyCycleFactor} />
          </fieldset>
          <fieldset className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><legend className="mb-4 font-display text-xl font-semibold">Sản lượng & sử dụng</legend>
            <ConfigField error={settingErrors.batteryRoundTripEfficiency} label="Hiệu suất pin" name="batteryRoundTripEfficiency" value={settings.batteryRoundTripEfficiency} />
            <ConfigField error={settingErrors.lowEstimateFactor} label="Hệ số ước tính thấp" name="lowEstimateFactor" value={settings.lowEstimateFactor} />
            <ConfigField error={settingErrors.highEstimateFactor} label="Hệ số ước tính cao" name="highEstimateFactor" value={settings.highEstimateFactor} />
            <div className="hidden xl:block" />
            <ConfigField error={settingErrors.daytimeLowRatio} label="Tỷ lệ ban ngày · Thấp" name="daytimeLowRatio" value={settings.daytimeLowRatio} />
            <ConfigField error={settingErrors.daytimeMediumRatio} label="Tỷ lệ ban ngày · Trung bình" name="daytimeMediumRatio" value={settings.daytimeMediumRatio} />
            <ConfigField error={settingErrors.daytimeHighRatio} label="Tỷ lệ ban ngày · Cao" name="daytimeHighRatio" value={settings.daytimeHighRatio} />
          </fieldset>
          <fieldset className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"><legend className="mb-4 font-display text-xl font-semibold">Liên hệ & thương hiệu</legend>
            <ConfigField error={settingErrors.businessName} label="Tên doanh nghiệp" name="businessName" type="text" value={settings.businessName} />
            <ConfigField error={settingErrors.hotline} label="Hotline" name="hotline" type="text" value={settings.hotline} />
            <ConfigField error={settingErrors.zaloUrl} label="Link Zalo" name="zaloUrl" type="url" value={settings.zaloUrl} />
          </fieldset>
          <div className="flex justify-end border-t border-[var(--line)] pt-6"><button className="admin-primary-button" disabled={busy} type="submit">{busy ? "Đang lưu…" : "Lưu cấu hình tính toán"}</button></div>
        </form>
      </section>

      <section className="admin-panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] bg-[var(--admin-panel)] p-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand)]">02 / Province factors</p><h2 className="mt-1 font-display text-3xl font-semibold">Hệ số tỉnh thành</h2><p className="mt-2 text-sm text-[var(--muted)]">{provinces.filter((item) => item.active).length}/{provinces.length} khu vực đang phục vụ.</p></div>
          <button className="admin-primary-button" onClick={() => { setProvinceEditor({ mode: "new" }); setProvinceErrors({}); }} type="button">+ Thêm khu vực</button>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {provinces.map((item) => (
            <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center" key={item.id}>
              <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.name}</p><span className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{item.code}</span></div><p className="mt-1 text-xs text-[var(--muted)]">Thứ tự {item.displayOrder}</p></div>
              <div className="sm:text-right"><p className="font-display text-2xl font-semibold">× {item.factor}</p><p className={`text-xs font-bold ${item.active ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{item.active ? "Đang bật" : "Tạm ngừng"}</p></div>
              <div className="flex gap-2"><button className="admin-secondary-button" disabled={busy} onClick={() => { setProvinceEditor({ mode: "edit", id: item.id }); setProvinceErrors({}); }} type="button">Sửa</button><button className="admin-secondary-button" disabled={busy} onClick={() => toggleProvince(item)} type="button">{item.active ? "Tắt" : "Bật"}</button></div>
            </div>
          ))}
        </div>

        {provinceEditor ? (
          <form className="grid gap-5 border-t-2 border-[var(--sun)] bg-[var(--admin-panel)] p-5 md:grid-cols-2 xl:grid-cols-5" key={provinceEditor.mode === "new" ? "new" : provinceEditor.id} noValidate onSubmit={saveProvince}>
            <ConfigField error={provinceErrors.code} label="Mã không dấu" name="code" type="text" value={province?.code ?? ""} />
            <ConfigField error={provinceErrors.name} label="Tên tỉnh/thành" name="name" type="text" value={province?.name ?? ""} />
            <ConfigField error={provinceErrors.factor} label="Hệ số sản lượng" name="factor" value={province?.factor ?? 1} />
            <ConfigField error={provinceErrors.displayOrder} label="Thứ tự" name="displayOrder" step="1" value={province?.displayOrder ?? provinces.length + 1} />
            <div className="flex items-end gap-2"><label className="flex min-h-12 items-center gap-2 text-sm font-semibold"><input className="size-5 accent-[var(--brand)] focus:rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand-dark)] focus:ring-offset-2 focus:ring-offset-[var(--paper)]" defaultChecked={province?.active ?? true} name="active" type="checkbox" /> Bật</label></div>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5 xl:justify-end"><button className="admin-secondary-button" onClick={() => setProvinceEditor(null)} type="button">Hủy</button><button className="admin-primary-button" disabled={busy} type="submit">{busy ? "Đang lưu…" : "Lưu khu vực"}</button></div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
