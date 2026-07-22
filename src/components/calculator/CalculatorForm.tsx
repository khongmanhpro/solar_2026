import type { FormEvent } from "react";

import {
  ELECTRICITY_TYPE_OPTIONS,
  RESIDENTIAL_ELECTRICITY_TARIFF,
} from "@/config/electricity-tariffs";
import { formatVnd } from "@/lib/formatters";
import type { ProvinceFactor } from "@/types/solar";

export interface CalculatorFormValues {
  electricityType: string;
  monthlyBill: string;
  province: string;
  daytimeUsageLevel: string;
  roofAreaM2: string;
  backupRequired: string;
}

export type CalculatorFieldName = keyof CalculatorFormValues;
export type CalculatorFormErrors = Partial<Record<CalculatorFieldName, string>>;

interface CalculatorFormProps {
  values: CalculatorFormValues;
  errors: CalculatorFormErrors;
  provinces: ProvinceFactor[];
  isSubmitting: boolean;
  onChange: (field: CalculatorFieldName, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-base text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-dark)] focus:ring-offset-2 focus:ring-offset-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-60";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} className="mt-2 text-sm font-medium text-[var(--danger)]">
      {message}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-[var(--line)] pb-3 text-base font-semibold text-[var(--ink)]">
      {children}
    </h3>
  );
}

function SectionDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{children}</p>;
}

export function CalculatorForm({
  values,
  errors,
  provinces,
  isSubmitting,
  onChange,
  onSubmit,
}: CalculatorFormProps) {
  return (
    <form className="space-y-10" noValidate onSubmit={onSubmit}>
      <fieldset className="space-y-5">
        <SectionTitle>Thông tin hóa đơn điện</SectionTitle>
        <SectionDescription>
          Dữ liệu này giúp tính mức tiết kiệm theo đúng biểu giá điện hiện hành.
        </SectionDescription>

        <div>
          <legend className="text-sm font-semibold text-[var(--ink)]">Loại điện đang sử dụng</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ELECTRICITY_TYPE_OPTIONS.map((option) => (
              <label
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-4 transition has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand-soft)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand-dark)] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[var(--paper)]"
                key={option.value}
              >
                <input
                  aria-describedby={
                    errors.electricityType
                      ? "electricityType-error electricityType-help"
                      : "electricityType-help"
                  }
                  checked={values.electricityType === option.value}
                  className="mt-0.5 size-5 accent-[var(--brand)]"
                  disabled={isSubmitting}
                  name="electricityType"
                  onChange={(event) => onChange("electricityType", event.target.value)}
                  type="radio"
                  value={option.value}
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--ink)]">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--muted)]" id="electricityType-help">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <FieldError id="electricityType-error" message={errors.electricityType} />

          <details className="mt-4 rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--admin-panel)] px-4 py-3">
            <summary className="cursor-pointer text-xs font-semibold text-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]">
              Xem biểu giá 5 bậc đang áp dụng
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-80 border-collapse text-left text-xs">
                <thead className="text-[var(--muted)]">
                  <tr>
                    <th className="border-b border-[var(--line)] py-2 pr-3">Bậc</th>
                    <th className="border-b border-[var(--line)] py-2 pr-3">Sản lượng</th>
                    <th className="border-b border-[var(--line)] py-2 text-right">Đơn giá</th>
                  </tr>
                </thead>
                <tbody>
                  {RESIDENTIAL_ELECTRICITY_TARIFF.map((tier) => (
                    <tr key={tier.label}>
                      <td className="border-b border-[var(--line)] py-2 pr-3 font-semibold">{tier.label}</td>
                      <td className="border-b border-[var(--line)] py-2 pr-3 text-[var(--muted)]">
                        {tier.toKwh === null
                          ? `${tier.fromKwh + 1} kWh trở lên`
                          : `${tier.fromKwh === 0 ? 0 : tier.fromKwh + 1}–${tier.toKwh} kWh`}
                      </td>
                      <td className="border-b border-[var(--line)] py-2 text-right font-semibold">
                        {formatVnd(tier.unitPriceVndPerKwh)}/kWh
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Đơn giá chưa bao gồm VAT. Hóa đơn được tính lũy tiến theo từng bậc sản lượng.
            </p>
          </details>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="monthlyBill">
              Tiền điện trung bình mỗi tháng
            </label>
            <div className="relative">
              <input
                aria-describedby={errors.monthlyBill ? "monthlyBill-error monthlyBill-help" : "monthlyBill-help"}
                aria-invalid={Boolean(errors.monthlyBill)}
                className={`${fieldClassName} pr-20`}
                disabled={isSubmitting}
                id="monthlyBill"
                inputMode="numeric"
                min="100000"
                name="monthlyBill"
                placeholder="Ví dụ: 2000000"
                type="number"
                value={values.monthlyBill}
                onChange={(event) => onChange("monthlyBill", event.target.value)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[var(--muted)]">
                VNĐ
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]" id="monthlyBill-help">
              Nhập phần tiền điện trước VAT. Có thể lấy trung bình 3 hóa đơn gần nhất để ước tính sát hơn.
            </p>
            <FieldError id="monthlyBill-error" message={errors.monthlyBill} />
          </div>

          <div>
            <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="province">
              Tỉnh hoặc thành phố
            </label>
            <select
              aria-describedby={errors.province ? "province-error province-help" : "province-help"}
              aria-invalid={Boolean(errors.province)}
              className={fieldClassName}
              disabled={isSubmitting}
              id="province"
              name="province"
              value={values.province}
              onChange={(event) => onChange("province", event.target.value)}
            >
              <option value="">Chọn khu vực lắp đặt</option>
              {provinces.map((province) => (
                <option key={province.id} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]" id="province-help">
              Khu vực được dùng để điều chỉnh sản lượng nắng ước tính.
            </p>
            <FieldError id="province-error" message={errors.province} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <SectionTitle>Mái nhà và nhu cầu sử dụng</SectionTitle>
        <SectionDescription>
          Ước tính diện tích khả dụng và tỷ lệ sử dụng điện vào ban ngày.
        </SectionDescription>

        <div>
          <legend className="text-sm font-semibold text-[var(--ink)]">Mức dùng điện ban ngày</legend>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]" id="daytimeUsageLevel-help">
            Khoảng thời gian từ 8:00 đến 17:00.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["low", "Thấp"],
              ["medium", "Vừa"],
              ["high", "Cao"],
            ].map(([value, label]) => (
              <label
                className="cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-3 text-center text-sm font-semibold text-[var(--ink)] transition has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand-soft)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand-dark)] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[var(--paper)]"
                key={value}
              >
                <input
                  aria-describedby={errors.daytimeUsageLevel ? "daytimeUsageLevel-error daytimeUsageLevel-help" : "daytimeUsageLevel-help"}
                  checked={values.daytimeUsageLevel === value}
                  className="sr-only"
                  disabled={isSubmitting}
                  name="daytimeUsageLevel"
                  onChange={(event) => onChange("daytimeUsageLevel", event.target.value)}
                  type="radio"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
          <FieldError id="daytimeUsageLevel-error" message={errors.daytimeUsageLevel} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="roofAreaM2">
              Diện tích mái có thể lắp
            </label>
            <div className="relative">
              <input
                aria-describedby={errors.roofAreaM2 ? "roofAreaM2-error roofAreaM2-help" : "roofAreaM2-help"}
                aria-invalid={Boolean(errors.roofAreaM2)}
                className={`${fieldClassName} pr-16`}
                disabled={isSubmitting}
                id="roofAreaM2"
                inputMode="decimal"
                min="5"
                name="roofAreaM2"
                placeholder="Ví dụ: 30"
                step="0.1"
                type="number"
                value={values.roofAreaM2}
                onChange={(event) => onChange("roofAreaM2", event.target.value)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[var(--muted)]">
                m²
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]" id="roofAreaM2-help">
              Chỉ tính phần mái ít bị che bóng và có thể thi công.
            </p>
            <FieldError id="roofAreaM2-error" message={errors.roofAreaM2} />
          </div>

          <div>
            <legend className="text-sm font-semibold text-[var(--ink)]">Có cần điện dự phòng khi mất điện?</legend>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]" id="backupRequired-help">
              Chọn “Có” để chỉ xem các hệ thống hybrid kèm pin lưu trữ.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                ["false", "Không cần"],
                ["true", "Có, cần dự phòng"],
              ].map(([value, label]) => (
                <label
                  className="cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-center text-sm font-semibold text-[var(--ink)] transition has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand-soft)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand-dark)] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[var(--paper)]"
                  key={value}
                >
                  <input
                    aria-describedby={errors.backupRequired ? "backupRequired-error backupRequired-help" : "backupRequired-help"}
                    checked={values.backupRequired === value}
                    className="sr-only"
                    disabled={isSubmitting}
                    name="backupRequired"
                    onChange={(event) => onChange("backupRequired", event.target.value)}
                    type="radio"
                    value={value}
                  />
                  {label}
                </label>
              ))}
            </div>
            <FieldError id="backupRequired-error" message={errors.backupRequired} />
          </div>
        </div>
      </fieldset>

      <button
        className="group flex min-h-14 w-full items-center justify-between rounded-xl bg-[var(--brand-dark)] px-6 py-4 text-left text-base font-semibold text-[var(--paper)] transition hover:bg-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] disabled:cursor-wait disabled:opacity-70"
        disabled={isSubmitting}
        type="submit"
      >
        <span>{isSubmitting ? "Đang tính phương án..." : "Tính phương án phù hợp"}</span>
        <span aria-hidden="true" className={isSubmitting ? "animate-spin" : "transition group-hover:translate-x-1"}>
          {isSubmitting ? "↻" : "→"}
        </span>
      </button>
    </form>
  );
}
