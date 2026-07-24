import type { FormEvent } from "react";

import { formatVnd } from "@/lib/formatters";
import {
  getCurrentBillingPeriod,
  MIN_SUPPORTED_BILLING_PERIOD,
} from "@/lib/billing-period";
import type { DaytimeBehavior } from "@/types/customer-input";
import type { ProvinceFactor } from "@/types/solar";

export type CalculatorStep = 1 | 2 | 3;
export type CalculatorEnergyMethod = "" | "kwh" | "money" | "invoice_ocr";
export type MoneyBillingContextKind =
  | ""
  | "standard_single_household"
  | "known"
  | "unknown";
export type MoneyPeriodAdjustmentKind = "" | "standard" | "custom";

export interface EnergyObservationFormValue {
  period: string;
  value: string;
}

export interface CalculatorFormValues {
  energyMethod: CalculatorEnergyMethod;
  energyObservations: EnergyObservationFormValue[];
  moneyBillingContext: MoneyBillingContextKind;
  moneyHouseholdCount: string;
  moneyOtherChargesVnd: string;
  moneyPeriodAdjustment: MoneyPeriodAdjustmentKind;
  moneyBillingDays: string;
  moneyReferenceDays: string;
  province: string;
  daytimeBehavior: "" | DaytimeBehavior;
  roofKnown: "" | "true" | "false";
  roofAreaM2: string;
  backupRequired: "" | "true" | "false";
  essentialLoadWatts: string;
  backupHours: string;
}

export type CalculatorFieldName = Exclude<
  keyof CalculatorFormValues,
  "energyObservations"
>;
export type CalculatorFormErrors = Record<string, string | undefined>;

interface CalculatorFormProps {
  currentStep: CalculatorStep;
  values: CalculatorFormValues;
  errors: CalculatorFormErrors;
  provinces: ProvinceFactor[];
  isSubmitting: boolean;
  onChange: (field: CalculatorFieldName, value: string) => void;
  onEnergyMethodChange: (method: Exclude<CalculatorEnergyMethod, "">) => void;
  onObservationChange: (
    index: number,
    field: keyof EnergyObservationFormValue,
    value: string,
  ) => void;
  onAddObservation: () => void;
  onRemoveObservation: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
  onGoToStep: (step: 1 | 2) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-base text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-dark)] focus:ring-offset-2 focus:ring-offset-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-60";
const choiceClassName =
  "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 transition has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand-soft)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand-dark)] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[var(--paper)]";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} className="mt-2 text-sm font-medium text-[var(--danger)]" role="alert">
      {message}
    </p>
  );
}

function StepHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
      {children}
    </h3>
  );
}

function StepDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{children}</p>;
}

function averageObservation(values: CalculatorFormValues): number | null {
  const numbers = values.energyObservations
    .map((observation) => Number(observation.value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (numbers.length === 0) return null;
  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

function daytimeBehaviorLabel(value: CalculatorFormValues["daytimeBehavior"]): string {
  switch (value) {
    case "rarely_home_daytime":
      return "Hầu như không có người ở nhà, ít thiết bị chạy từ 8:00–17:00";
    case "some_daytime_use":
      return "Có người ở nhà một phần ngày hoặc một số thiết bị vẫn chạy";
    case "usually_home_daytime":
      return "Thường có người ở nhà hoặc nhiều thiết bị chạy từ 8:00–17:00";
    default:
      return "Chưa chọn";
  }
}

function moneyBillingContextLabel(values: CalculatorFormValues): string {
  switch (values.moneyBillingContext) {
    case "standard_single_household":
      return "Một hộ, kỳ bình thường, chỉ gồm tiền điện và VAT";
    case "known":
      return `Có thông tin khác · ${values.moneyHouseholdCount} hộ · khoản khác ${formatVnd(Number(values.moneyOtherChargesVnd))} · ${
        values.moneyPeriodAdjustment === "custom"
          ? `${values.moneyBillingDays}/${values.moneyReferenceDays} ngày`
          : "kỳ bình thường"
      }`;
    case "unknown":
      return "Không chắc — hệ thống sẽ dùng khoảng thận trọng";
    default:
      return "Chưa xác nhận";
  }
}

function Progress({ currentStep }: { currentStep: CalculatorStep }) {
  const steps = [
    [1, "Điện năng"],
    [2, "Ngôi nhà"],
    [3, "Xác nhận"],
  ] as const;

  return (
    <ol aria-label="Tiến trình nhập thông tin" className="mb-8 grid grid-cols-3 gap-2">
      {steps.map(([step, label]) => (
        <li
          aria-current={currentStep === step ? "step" : undefined}
          className={`rounded-lg border px-2 py-3 text-center text-xs font-semibold sm:text-sm ${
            currentStep === step
              ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-dark)]"
              : currentStep > step
                ? "border-[var(--success)] bg-[var(--paper)] text-[var(--success)]"
                : "border-[var(--line)] text-[var(--muted)]"
          }`}
          key={step}
        >
          <span className="block text-[0.65rem] uppercase tracking-[0.08em]">Bước {step}</span>
          <span className="mt-1 block">{label}</span>
        </li>
      ))}
    </ol>
  );
}

function NavigationButtons({
  isSubmitting,
  onBack,
  onNext,
  showBack = true,
}: {
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  showBack?: boolean;
}) {
  return (
    <div className={`flex gap-3 ${showBack ? "justify-between" : "justify-end"}`}>
      {showBack ? (
        <button
          className="min-h-12 rounded-xl border border-[var(--line-strong)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--admin-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2"
          disabled={isSubmitting}
          onClick={onBack}
          type="button"
        >
          Quay lại
        </button>
      ) : null}
      <button
        className="min-h-12 rounded-xl bg-[var(--brand-dark)] px-6 py-3 text-sm font-semibold text-[var(--paper)] transition hover:bg-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 disabled:opacity-60"
        disabled={isSubmitting}
        onClick={onNext}
        type="button"
      >
        Tiếp tục
      </button>
    </div>
  );
}

export function CalculatorForm({
  currentStep,
  values,
  errors,
  provinces,
  isSubmitting,
  onChange,
  onEnergyMethodChange,
  onObservationChange,
  onAddObservation,
  onRemoveObservation,
  onNext,
  onBack,
  onGoToStep,
  onSubmit,
}: CalculatorFormProps) {
  const energyAverage = averageObservation(values);
  const selectedProvince = provinces.find((province) => province.code === values.province);
  const isMoneyMethod = values.energyMethod === "money";

  return (
    <form className="space-y-8" noValidate onSubmit={onSubmit}>
      <Progress currentStep={currentStep} />

      {currentStep === 1 ? (
        <section aria-labelledby="energy-step-title" className="space-y-7">
          <div>
            <StepHeading>
              <span id="energy-step-title">Bạn có thông tin nào dễ nhập nhất?</span>
            </StepHeading>
            <StepDescription>
              Chọn một cách. Bạn có thể nhập 1 tháng hoặc thêm tối đa 12 tháng để lấy trung bình.
            </StepDescription>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--admin-panel)] p-4 text-sm leading-6 text-[var(--muted)]">
            Công cụ hiện chỉ dành cho <strong className="text-[var(--ink)]">điện sinh hoạt hộ gia đình</strong>. Bạn không cần chọn loại điện.
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-[var(--ink)]">Cách cung cấp mức dùng điện</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                ["kwh", "Nhập số điện (kWh)", "Chính xác nhất nếu có trên hóa đơn."],
                ["money", "Nhập tổng tiền", "Dễ nhập nhưng cần dữ liệu VAT, phụ phí chuẩn."],
                ["invoice_ocr", "Tải hóa đơn", "Vị trí tích hợp đọc hóa đơn tự động."],
              ].map(([value, label, description]) => (
                <label className={choiceClassName} key={value}>
                  <input
                    aria-describedby={errors.energyMethod ? "energyMethod-error" : undefined}
                    checked={values.energyMethod === value}
                    className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                    disabled={isSubmitting}
                    name="energyMethod"
                    onChange={() =>
                      onEnergyMethodChange(value as Exclude<CalculatorEnergyMethod, "">)
                    }
                    type="radio"
                    value={value}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--ink)]">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError id="energyMethod-error" message={errors.energyMethod} />
          </fieldset>

          {values.energyMethod === "invoice_ocr" ? (
            <div className="rounded-xl border border-[var(--warning-line)] bg-[var(--warning-soft)] p-5">
              <p className="font-semibold text-[var(--warning-ink)]">Đọc hóa đơn tự động chưa sẵn sàng</p>
              <p className="mt-2 text-sm leading-6 text-[var(--warning-ink)]">
                Hệ thống chưa có bộ OCR thật và bước để bạn xác nhận dữ liệu đọc được, nên chúng tôi không tải lên hoặc tự điền số liệu giả.
              </p>
              <button
                aria-disabled="true"
                className="mt-4 min-h-12 w-full cursor-not-allowed rounded-lg border border-dashed border-[var(--line-strong)] px-4 py-3 text-sm font-semibold text-[var(--muted)] opacity-70"
                disabled
                type="button"
              >
                Tải ảnh hoặc PDF — chưa khả dụng
              </button>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="min-h-11 rounded-lg bg-[var(--brand-dark)] px-4 py-2 text-sm font-semibold text-[var(--paper)]"
                  onClick={() => onEnergyMethodChange("kwh")}
                  type="button"
                >
                  Chuyển sang nhập kWh
                </button>
                <button
                  className="min-h-11 rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
                  onClick={() => onEnergyMethodChange("money")}
                  type="button"
                >
                  Chuyển sang nhập tổng tiền
                </button>
              </div>
            </div>
          ) : null}

          {values.energyMethod === "kwh" || values.energyMethod === "money" ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-[var(--ink)]">
                  {values.energyMethod === "kwh" ? "Số điện từng tháng" : "Tổng tiền thanh toán từng tháng"}
                </h4>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  {values.energyMethod === "kwh"
                    ? "Nhập số kWh trên hóa đơn. Số này được dùng trực tiếp, không suy ngược từ tiền."
                    : "Nhập số tiền cuối cùng phải thanh toán, gồm VAT và các khoản khác nếu có."}
                </p>
              </div>

              {values.energyObservations.map((observation, index) => {
                const valueName = `energyObservations.${index}.value`;
                const periodName = `energyObservations.${index}.period`;
                const valueErrorId = `energy-value-${index}-error`;
                const periodErrorId = `energy-period-${index}-error`;

                return (
                  <div className="rounded-xl border border-[var(--line)] p-4" key={index}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--ink)]">Tháng {index + 1}</p>
                      {values.energyObservations.length > 1 ? (
                        <button
                          aria-label={`Xóa dữ liệu tháng ${index + 1}`}
                          className="min-h-11 px-2 text-sm font-semibold text-[var(--danger)] underline underline-offset-4"
                          disabled={isSubmitting}
                          onClick={() => onRemoveObservation(index)}
                          type="button"
                        >
                          Xóa
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
                      <div>
                        <label className="text-sm font-semibold text-[var(--ink)]" htmlFor={`energy-period-${index}`}>
                          Kỳ hóa đơn{" "}
                          {values.energyMethod === "money" ? (
                            <span className="text-[var(--danger)]">(bắt buộc)</span>
                          ) : (
                            <span className="font-normal text-[var(--muted)]">(không bắt buộc)</span>
                          )}
                        </label>
                        <input
                          aria-describedby={errors[periodName] ? periodErrorId : undefined}
                          aria-invalid={Boolean(errors[periodName])}
                          className={fieldClassName}
                          disabled={isSubmitting}
                          id={`energy-period-${index}`}
                          max={getCurrentBillingPeriod()}
                          min={MIN_SUPPORTED_BILLING_PERIOD}
                          name={periodName}
                          onChange={(event) => onObservationChange(index, "period", event.target.value)}
                          type="month"
                          value={observation.period}
                        />
                        <FieldError id={periodErrorId} message={errors[periodName]} />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-[var(--ink)]" htmlFor={`energy-value-${index}`}>
                          {values.energyMethod === "kwh" ? "Số điện trên hóa đơn" : "Tổng tiền đã thanh toán"}
                        </label>
                        <div className="relative">
                          <input
                            aria-describedby={errors[valueName] ? valueErrorId : undefined}
                            aria-invalid={Boolean(errors[valueName])}
                            className={`${fieldClassName} pr-20`}
                            disabled={isSubmitting}
                            id={`energy-value-${index}`}
                            inputMode={values.energyMethod === "kwh" ? "decimal" : "numeric"}
                            min="1"
                            name={valueName}
                            onChange={(event) => onObservationChange(index, "value", event.target.value)}
                            placeholder={values.energyMethod === "kwh" ? "Ví dụ: 450" : "Ví dụ: 2000000"}
                            step={values.energyMethod === "kwh" ? "0.1" : "1000"}
                            type="number"
                            value={observation.value}
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[var(--muted)]">
                            {values.energyMethod === "kwh" ? "kWh" : "VNĐ"}
                          </span>
                        </div>
                        <FieldError id={valueErrorId} message={errors[valueName]} />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  className="min-h-11 rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting || values.energyObservations.length >= 12}
                  onClick={onAddObservation}
                  type="button"
                >
                  + Thêm một tháng
                </button>
                <p className="text-sm text-[var(--muted)]">
                  {values.energyObservations.length}/12 tháng
                  {energyAverage !== null
                    ? ` · Trung bình ${
                        values.energyMethod === "kwh"
                          ? `${energyAverage.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} kWh`
                          : formatVnd(Math.round(energyAverage))
                      }`
                    : ""}
                </p>
              </div>

              {isMoneyMethod ? (
                <fieldset className="rounded-xl border border-[var(--line-strong)] p-5">
                  <legend className="px-1 text-sm font-semibold text-[var(--ink)]">
                    Hóa đơn này thuộc trường hợp nào?
                  </legend>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]" id="moneyBillingContext-help">
                    Câu trả lời giúp tách tiền điện, VAT và khoản khác mà không biến phần chưa biết thành số 0.
                  </p>
                  <div className="mt-4 grid gap-3">
                    {[
                      [
                        "standard_single_household",
                        "Một hộ, kỳ bình thường, chỉ gồm tiền điện và VAT",
                        "Không có nợ cũ, dịch vụ hoặc khoản thu khác.",
                      ],
                      [
                        "known",
                        "Có thông tin khác trên hóa đơn",
                        "Tôi biết số hộ, khoản khác hoặc kỳ ghi điện thay đổi.",
                      ],
                      [
                        "unknown",
                        "Tôi không chắc",
                        "Hệ thống sẽ trả khoảng thận trọng và có thể chưa đề xuất được một gói.",
                      ],
                    ].map(([value, label, description]) => (
                      <label className={choiceClassName} key={value}>
                        <input
                          aria-describedby={
                            errors.moneyBillingContext
                              ? "moneyBillingContext-error moneyBillingContext-help"
                              : "moneyBillingContext-help"
                          }
                          checked={values.moneyBillingContext === value}
                          className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                          disabled={isSubmitting}
                          name="moneyBillingContext"
                          onChange={(event) => onChange("moneyBillingContext", event.target.value)}
                          type="radio"
                          value={value}
                        />
                        <span>
                          <span className="block text-sm font-semibold text-[var(--ink)]">{label}</span>
                          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <FieldError id="moneyBillingContext-error" message={errors.moneyBillingContext} />

                  {values.moneyBillingContext === "known" ? (
                    <div className="mt-5 space-y-5 border-t border-[var(--line)] pt-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="moneyHouseholdCount">
                            Số hộ dùng chung công tơ
                          </label>
                          <input
                            aria-describedby={errors.moneyHouseholdCount ? "moneyHouseholdCount-error" : undefined}
                            aria-invalid={Boolean(errors.moneyHouseholdCount)}
                            className={fieldClassName}
                            disabled={isSubmitting}
                            id="moneyHouseholdCount"
                            inputMode="numeric"
                            min="1"
                            name="moneyHouseholdCount"
                            onChange={(event) => onChange("moneyHouseholdCount", event.target.value)}
                            placeholder="Ví dụ: 1"
                            step="1"
                            type="number"
                            value={values.moneyHouseholdCount}
                          />
                          <FieldError id="moneyHouseholdCount-error" message={errors.moneyHouseholdCount} />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="moneyOtherChargesVnd">
                            Khoản khác ngoài tiền điện và VAT
                          </label>
                          <div className="relative">
                            <input
                              aria-describedby={errors.moneyOtherChargesVnd ? "moneyOtherChargesVnd-error moneyOtherChargesVnd-help" : "moneyOtherChargesVnd-help"}
                              aria-invalid={Boolean(errors.moneyOtherChargesVnd)}
                              className={`${fieldClassName} pr-20`}
                              disabled={isSubmitting}
                              id="moneyOtherChargesVnd"
                              inputMode="numeric"
                              min="0"
                              name="moneyOtherChargesVnd"
                              onChange={(event) => onChange("moneyOtherChargesVnd", event.target.value)}
                              placeholder="Nhập 0 nếu không có"
                              step="1"
                              type="number"
                              value={values.moneyOtherChargesVnd}
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[var(--muted)]">VNĐ</span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[var(--muted)]" id="moneyOtherChargesVnd-help">
                            Có thể nhập 0; để trống nghĩa là chưa cung cấp.
                          </p>
                          <FieldError id="moneyOtherChargesVnd-error" message={errors.moneyOtherChargesVnd} />
                        </div>
                      </div>

                      <fieldset>
                        <legend className="text-sm font-semibold text-[var(--ink)]">Độ dài kỳ ghi điện</legend>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {[
                            ["standard", "Kỳ bình thường"],
                            ["custom", "Số ngày thay đổi"],
                          ].map(([value, label]) => (
                            <label className={choiceClassName} key={value}>
                              <input
                                aria-describedby={errors.moneyPeriodAdjustment ? "moneyPeriodAdjustment-error" : undefined}
                                checked={values.moneyPeriodAdjustment === value}
                                className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                                disabled={isSubmitting}
                                name="moneyPeriodAdjustment"
                                onChange={(event) => onChange("moneyPeriodAdjustment", event.target.value)}
                                type="radio"
                                value={value}
                              />
                              <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
                            </label>
                          ))}
                        </div>
                        <FieldError id="moneyPeriodAdjustment-error" message={errors.moneyPeriodAdjustment} />
                      </fieldset>

                      {values.moneyPeriodAdjustment === "custom" ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="moneyBillingDays">Số ngày thực tế trên hóa đơn</label>
                            <input
                              aria-describedby={errors.moneyBillingDays ? "moneyBillingDays-error" : undefined}
                              aria-invalid={Boolean(errors.moneyBillingDays)}
                              className={fieldClassName}
                              disabled={isSubmitting}
                              id="moneyBillingDays"
                              inputMode="numeric"
                              min="1"
                              name="moneyBillingDays"
                              onChange={(event) => onChange("moneyBillingDays", event.target.value)}
                              placeholder="Ví dụ: 35"
                              step="1"
                              type="number"
                              value={values.moneyBillingDays}
                            />
                            <FieldError id="moneyBillingDays-error" message={errors.moneyBillingDays} />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="moneyReferenceDays">Số ngày kỳ chuẩn tham chiếu</label>
                            <input
                              aria-describedby={errors.moneyReferenceDays ? "moneyReferenceDays-error" : undefined}
                              aria-invalid={Boolean(errors.moneyReferenceDays)}
                              className={fieldClassName}
                              disabled={isSubmitting}
                              id="moneyReferenceDays"
                              inputMode="numeric"
                              min="1"
                              name="moneyReferenceDays"
                              onChange={(event) => onChange("moneyReferenceDays", event.target.value)}
                              placeholder="Ví dụ: 30"
                              step="1"
                              type="number"
                              value={values.moneyReferenceDays}
                            />
                            <FieldError id="moneyReferenceDays-error" message={errors.moneyReferenceDays} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {values.moneyBillingContext === "unknown" ? (
                    <p className="mt-5 rounded-lg border border-[var(--warning-line)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-ink)]">
                      Kết quả sẽ hiển thị khoảng kWh rộng hơn. Nếu khoảng đó làm thay đổi gói phù hợp, hệ thống sẽ yêu cầu thêm kWh thay vì chọn một gói thiếu chắc chắn.
                    </p>
                  ) : null}
                </fieldset>
              ) : null}
            </div>
          ) : null}

          {values.energyMethod === "money" ? (
            <p className="rounded-lg border border-[var(--line)] bg-[var(--admin-panel)] p-4 text-sm leading-6 text-[var(--muted)]">
              Hệ thống chọn biểu giá và VAT theo từng kỳ hóa đơn. Phiên bản, ngày hiệu lực và nguồn dữ liệu dùng cho phép tính sẽ được hiển thị trong kết quả.
            </p>
          ) : null}

          <NavigationButtons isSubmitting={isSubmitting} onBack={onBack} onNext={onNext} showBack={false} />
        </section>
      ) : null}

      {currentStep === 2 ? (
        <section aria-labelledby="home-step-title" className="space-y-7">
          <div>
            <StepHeading>
              <span id="home-step-title">Một vài thông tin về ngôi nhà</span>
            </StepHeading>
            <StepDescription>
              Chỉ hỏi những gì ảnh hưởng trực tiếp đến phương án. Bạn có thể chọn “Không biết” với diện tích mái.
            </StepDescription>
          </div>

          <div>
            <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="province">
              Tỉnh hoặc thành phố lắp đặt
            </label>
            <select
              aria-describedby={errors.province ? "province-error province-help" : "province-help"}
              aria-invalid={Boolean(errors.province)}
              className={fieldClassName}
              disabled={isSubmitting}
              id="province"
              name="province"
              onChange={(event) => onChange("province", event.target.value)}
              value={values.province}
            >
              <option value="">Chọn khu vực lắp đặt</option>
              {provinces.map((province) => (
                <option key={province.id} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]" id="province-help">
              Khu vực được dùng để chọn dữ liệu bức xạ mặt trời phù hợp.
            </p>
            <FieldError id="province-error" message={errors.province} />
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-[var(--ink)]">
              Từ 8:00–17:00, nhà bạn thường như thế nào?
            </legend>
            <div className="mt-3 grid gap-3">
              {[
                ["rarely_home_daytime", "Hầu như không có người ở nhà", "Ít thiết bị điện chạy liên tục vào ban ngày."],
                ["some_daytime_use", "Có người ở nhà một phần ngày", "Hoặc có một số thiết bị vẫn chạy khi vắng nhà."],
                ["usually_home_daytime", "Thường có người ở nhà", "Hoặc nhiều thiết bị sử dụng điện vào ban ngày."],
              ].map(([value, label, description]) => (
                <label className={choiceClassName} key={value}>
                  <input
                    aria-describedby={errors.daytimeBehavior ? "daytimeBehavior-error" : undefined}
                    checked={values.daytimeBehavior === value}
                    className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                    disabled={isSubmitting}
                    name="daytimeBehavior"
                    onChange={(event) => onChange("daytimeBehavior", event.target.value)}
                    type="radio"
                    value={value}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--ink)]">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError id="daytimeBehavior-error" message={errors.daytimeBehavior} />
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-[var(--ink)]">Bạn có biết diện tích mái có thể lắp không?</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["true", "Có, tôi biết"],
                ["false", "Không biết diện tích mái"],
              ].map(([value, label]) => (
                <label className={choiceClassName} key={value}>
                  <input
                    aria-describedby={errors.roofKnown ? "roofKnown-error" : undefined}
                    checked={values.roofKnown === value}
                    className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                    disabled={isSubmitting}
                    name="roofKnown"
                    onChange={(event) => onChange("roofKnown", event.target.value)}
                    type="radio"
                    value={value}
                  />
                  <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
                </label>
              ))}
            </div>
            <FieldError id="roofKnown-error" message={errors.roofKnown} />
          </fieldset>

          {values.roofKnown === "true" ? (
            <div>
              <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="roofAreaM2">
                Diện tích mái có thể lắp
              </label>
              <div className="relative max-w-md">
                <input
                  aria-describedby={errors.roofAreaM2 ? "roofAreaM2-error roofAreaM2-help" : "roofAreaM2-help"}
                  aria-invalid={Boolean(errors.roofAreaM2)}
                  className={`${fieldClassName} pr-16`}
                  disabled={isSubmitting}
                  id="roofAreaM2"
                  inputMode="decimal"
                  min="0.1"
                  name="roofAreaM2"
                  onChange={(event) => onChange("roofAreaM2", event.target.value)}
                  placeholder="Ví dụ: 30"
                  step="0.1"
                  type="number"
                  value={values.roofAreaM2}
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[var(--muted)]">m²</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]" id="roofAreaM2-help">
                Chỉ tính phần mái ít bị che bóng và có thể thi công.
              </p>
              <FieldError id="roofAreaM2-error" message={errors.roofAreaM2} />
            </div>
          ) : null}

          {values.roofKnown === "false" ? (
            <p className="rounded-xl border border-[var(--warning-line)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-ink)]">
              Vẫn có thể xếp gói theo nhu cầu điện, nhưng kết quả sẽ không khẳng định mái đủ diện tích hoặc có thể thi công. Cần khảo sát để xác nhận.
            </p>
          ) : null}

          <fieldset>
            <legend className="text-sm font-semibold text-[var(--ink)]">Bạn có cần điện dự phòng khi mất điện không?</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["false", "Không cần"],
                ["true", "Có, cần dự phòng"],
              ].map(([value, label]) => (
                <label className={choiceClassName} key={value}>
                  <input
                    aria-describedby={errors.backupRequired ? "backupRequired-error" : undefined}
                    checked={values.backupRequired === value}
                    className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                    disabled={isSubmitting}
                    name="backupRequired"
                    onChange={(event) => onChange("backupRequired", event.target.value)}
                    type="radio"
                    value={value}
                  />
                  <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
                </label>
              ))}
            </div>
            <FieldError id="backupRequired-error" message={errors.backupRequired} />
          </fieldset>

          {values.backupRequired === "true" ? (
            <div className="rounded-xl border border-[var(--line)] p-4">
              <h4 className="text-sm font-semibold text-[var(--ink)]">Nếu biết, hãy bổ sung nhu cầu dự phòng</h4>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Hai ô này không bắt buộc. Để trống sẽ được lưu là “chưa biết”, không tự điền một con số giả định.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="essentialLoadWatts">Tổng công suất thiết bị thiết yếu</label>
                  <div className="relative">
                    <input
                      aria-describedby={errors.essentialLoadWatts ? "essentialLoadWatts-error" : undefined}
                      aria-invalid={Boolean(errors.essentialLoadWatts)}
                      className={`${fieldClassName} pr-16`}
                      disabled={isSubmitting}
                      id="essentialLoadWatts"
                      inputMode="numeric"
                      min="1"
                      name="essentialLoadWatts"
                      onChange={(event) => onChange("essentialLoadWatts", event.target.value)}
                      placeholder="Ví dụ: 1200"
                      step="1"
                      type="number"
                      value={values.essentialLoadWatts}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[var(--muted)]">W</span>
                  </div>
                  <FieldError id="essentialLoadWatts-error" message={errors.essentialLoadWatts} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="backupHours">Muốn duy trì trong bao lâu</label>
                  <div className="relative">
                    <input
                      aria-describedby={errors.backupHours ? "backupHours-error" : undefined}
                      aria-invalid={Boolean(errors.backupHours)}
                      className={`${fieldClassName} pr-16`}
                      disabled={isSubmitting}
                      id="backupHours"
                      inputMode="decimal"
                      min="0.1"
                      name="backupHours"
                      onChange={(event) => onChange("backupHours", event.target.value)}
                      placeholder="Ví dụ: 4"
                      step="0.5"
                      type="number"
                      value={values.backupHours}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[var(--muted)]">giờ</span>
                  </div>
                  <FieldError id="backupHours-error" message={errors.backupHours} />
                </div>
              </div>
            </div>
          ) : null}

          <NavigationButtons isSubmitting={isSubmitting} onBack={onBack} onNext={onNext} />
        </section>
      ) : null}

      {currentStep === 3 ? (
        <section aria-labelledby="review-step-title" className="space-y-7">
          <div>
            <StepHeading>
              <span id="review-step-title">Kiểm tra trước khi tính</span>
            </StepHeading>
            <StepDescription>
              Xác nhận lại các dữ liệu ảnh hưởng đến đề xuất. Bạn có thể quay lại sửa mà không mất thông tin.
            </StepDescription>
          </div>

          <div className="space-y-4">
            <article className="rounded-xl border border-[var(--line)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">Mức dùng điện</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                    {values.energyMethod === "kwh" ? "Nhập trực tiếp kWh" : "Nhập tổng tiền thanh toán"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {values.energyObservations.length} tháng
                    {energyAverage !== null
                      ? ` · Trung bình ${
                          values.energyMethod === "kwh"
                            ? `${energyAverage.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} kWh/tháng`
                            : `${formatVnd(Math.round(energyAverage))}/tháng`
                        }`
                      : ""}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Giả định loại điện: sinh hoạt hộ gia đình.</p>
                  {isMoneyMethod ? (
                    <div className="mt-3 space-y-1 rounded-lg bg-[var(--admin-panel)] p-3 text-sm leading-6 text-[var(--ink)]">
                      <p>
                        <strong>Kỳ hóa đơn:</strong>{" "}
                        {values.energyObservations.map((observation) => observation.period).join(", ")}
                      </p>
                      <p><strong>Bối cảnh hóa đơn:</strong> {moneyBillingContextLabel(values)}</p>
                      <p className="text-xs text-[var(--muted)]">
                        Biểu giá, VAT, hiệu lực và nguồn được chọn theo kỳ và sẽ xuất hiện trong kết quả.
                      </p>
                    </div>
                  ) : null}
                </div>
                <button className="min-h-11 px-2 text-sm font-semibold text-[var(--brand-dark)] underline underline-offset-4" onClick={() => onGoToStep(1)} type="button">Sửa</button>
              </div>
            </article>

            <article className="rounded-xl border border-[var(--line)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 text-sm leading-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">Ngôi nhà</p>
                  <p><strong>Khu vực:</strong> {selectedProvince?.name ?? values.province}</p>
                  <p><strong>Ban ngày:</strong> {daytimeBehaviorLabel(values.daytimeBehavior)}</p>
                  <p><strong>Diện tích mái:</strong> {values.roofKnown === "true" ? `${values.roofAreaM2} m²` : "Chưa biết — cần khảo sát"}</p>
                  <p><strong>Điện dự phòng:</strong> {values.backupRequired === "true" ? "Có" : "Không"}</p>
                  {values.backupRequired === "true" ? (
                    <p className="text-[var(--muted)]">
                      Tải thiết yếu: {values.essentialLoadWatts ? `${values.essentialLoadWatts} W` : "chưa biết"} · Thời gian: {values.backupHours ? `${values.backupHours} giờ` : "chưa biết"}
                    </p>
                  ) : null}
                </div>
                <button className="min-h-11 px-2 text-sm font-semibold text-[var(--brand-dark)] underline underline-offset-4" onClick={() => onGoToStep(2)} type="button">Sửa</button>
              </div>
            </article>
          </div>

          {values.roofKnown === "false" ? (
            <p className="rounded-xl border border-[var(--warning-line)] bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning-ink)]">
              Vì chưa có diện tích mái, kết quả chỉ xếp gói theo nhu cầu điện và không xác nhận khả năng lắp đặt.
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              className="min-h-12 rounded-xl border border-[var(--line-strong)] px-5 py-3 text-sm font-semibold text-[var(--ink)]"
              disabled={isSubmitting}
              onClick={onBack}
              type="button"
            >
              Quay lại
            </button>
            <button
              className="group flex min-h-14 items-center justify-between rounded-xl bg-[var(--brand-dark)] px-6 py-4 text-left text-base font-semibold text-[var(--paper)] transition hover:bg-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-72"
              disabled={
                isSubmitting ||
                (values.energyMethod !== "kwh" && values.energyMethod !== "money")
              }
              type="submit"
            >
              <span>{isSubmitting ? "Đang tính phương án..." : "Xác nhận và tính phương án"}</span>
              <span aria-hidden="true" className={isSubmitting ? "animate-spin" : "transition group-hover:translate-x-1"}>{isSubmitting ? "↻" : "→"}</span>
            </button>
          </div>
        </section>
      ) : null}
    </form>
  );
}
