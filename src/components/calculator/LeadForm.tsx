"use client";

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
} from "react";

import { trackEvent } from "@/lib/analytics";
import { ApiClientError, requestJson } from "@/lib/api-client";
import { leadInputSchema } from "@/lib/validations";
import type { CalculationSettings } from "@/types/solar";

interface LeadFormProps {
  calculationId: string;
  packageId?: string | null;
  packageName?: string | null;
  settings: CalculationSettings;
}

interface LeadFormValues {
  fullName: string;
  phone: string;
  address: string;
  preferredContactTime: string;
  note: string;
}

type LeadFieldName = keyof LeadFormValues;
type LeadFormErrors = Partial<Record<LeadFieldName, string>>;

const INITIAL_VALUES: LeadFormValues = {
  fullName: "",
  phone: "",
  address: "",
  preferredContactTime: "anytime",
  note: "",
};

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-base text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-dark)] focus:ring-offset-2 focus:ring-offset-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-60";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-2 text-sm font-medium text-[var(--danger)]" id={id}>
      {message}
    </p>
  );
}

export function LeadForm({
  calculationId,
  packageId = null,
  packageName = null,
  settings,
}: LeadFormProps) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const openedTracked = useRef(false);

  useEffect(() => {
    if (openedTracked.current) return;
    openedTracked.current = true;
    trackEvent("survey_form_opened", {
      calculationId,
      packageId,
    });
  }, [calculationId, packageId]);

  function updateField(field: LeadFieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(null);
  }

  function validateField(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const field = event.target.name as LeadFieldName;
    const parsed = leadInputSchema.safeParse({ ...values, calculationId });
    const fieldIssue = parsed.success
      ? undefined
      : parsed.error.issues.find((issue) => issue.path[0] === field);

    setErrors((current) => ({
      ...current,
      [field]: fieldIssue?.message,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const parsed = leadInputSchema.safeParse({ ...values, calculationId });
    if (!parsed.success) {
      const nextErrors: LeadFormErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as LeadFieldName | undefined;
        if (field && field in values && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }
      setErrors(nextErrors);

      const firstField = parsed.error.issues.find(
        (issue) => typeof issue.path[0] === "string" && issue.path[0] in values,
      )?.path[0];
      if (typeof firstField === "string") {
        document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
      }
      return;
    }

    setErrors({});
    setStatus("submitting");

    try {
      const createdLead = await requestJson<{ id: string }>("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      setLeadId(createdLead.id);
      setStatus("success");
      trackEvent("survey_submitted", {
        calculationId,
        leadId: createdLead.id,
        packageId,
      });
      window.requestAnimationFrame(() => {
        document.getElementById("survey-success")?.focus();
      });
    } catch (error: unknown) {
      setStatus("idle");
      if (error instanceof ApiClientError) {
        setServerError(error.message);
        if (error.issues.length > 0) {
          const nextErrors: LeadFormErrors = {};
          for (const issue of error.issues) {
            const field = issue.path.split(".")[0] as LeadFieldName;
            if (field in values && !nextErrors[field]) {
              nextErrors[field] = issue.message;
            }
          }
          setErrors(nextErrors);
        }
      } else {
        setServerError("Không thể gửi yêu cầu lúc này. Vui lòng thử lại hoặc liên hệ trực tiếp.");
      }
    }
  }

  const isSubmitting = status === "submitting";
  const phoneHref = `tel:${settings.hotline.replace(/[^\d+]/g, "")}`;

  return (
    <section aria-labelledby="survey-title" className="mt-14 overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[var(--paper)]">
      <div className="bg-[var(--ink)] p-6 sm:p-8 text-[var(--paper)]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--focus)]">Phiếu khảo sát mái</p>
        <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl" id="survey-title">
          Chuyển ước tính thành phương án thi công
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--line)]">
          Đăng ký để xác nhận hiện trạng mái, cấu hình thiết bị và báo giá chính thức.
        </p>
        {packageName ? (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--admin-rail)] bg-[var(--admin-rail)] px-3 py-1 text-sm">
            <span className="text-[var(--focus)]">Kết quả tham chiếu:</span>
            <span className="font-semibold">{packageName}</span>
          </div>
        ) : null}
        <p className="mt-5 break-all text-xs font-semibold uppercase tracking-[0.1em] text-[var(--line)]">
          Hồ sơ · {calculationId}
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {status === "success" ? (
          <div className="flex min-h-[20rem] flex-col justify-center" id="survey-success" role="status" tabIndex={-1}>
            <span aria-hidden="true" className="status-dot" />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--success)]">Đã ghi nhận yêu cầu</p>
            <h4 className="mt-3 font-display text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
              Cảm ơn {values.fullName.trim()}.
            </h4>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
              Thông tin đã được gắn với kết quả tính toán này. Tư vấn viên sẽ dùng thời gian bạn chọn để sắp xếp liên hệ.
            </p>
            <div className="mt-6 inline-block w-fit rounded-lg bg-[var(--brand-soft)] px-4 py-3 text-sm font-semibold text-[var(--brand-dark)]">
              Mã yêu cầu: {leadId}
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="lead-fullName">
                  Họ và tên
                </label>
                <input
                  aria-describedby={errors.fullName ? "lead-fullName-error" : undefined}
                  aria-invalid={Boolean(errors.fullName)}
                  autoComplete="name"
                  className={fieldClassName}
                  disabled={isSubmitting}
                  id="lead-fullName"
                  maxLength={100}
                  name="fullName"
                  placeholder="Ví dụ: Nguyễn Minh An"
                  type="text"
                  value={values.fullName}
                  onBlur={validateField}
                  onChange={(event) => updateField("fullName", event.target.value)}
                />
                <FieldError id="lead-fullName-error" message={errors.fullName} />
              </div>

              <div>
                <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="lead-phone">
                  Số điện thoại
                </label>
                <input
                  aria-describedby={errors.phone ? "lead-phone-error lead-phone-help" : "lead-phone-help"}
                  aria-invalid={Boolean(errors.phone)}
                  autoComplete="tel"
                  className={fieldClassName}
                  disabled={isSubmitting}
                  id="lead-phone"
                  inputMode="tel"
                  name="phone"
                  placeholder="Ví dụ: 0901 234 567"
                  type="tel"
                  value={values.phone}
                  onBlur={validateField}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]" id="lead-phone-help">
                  Chỉ dùng để liên hệ về yêu cầu khảo sát này.
                </p>
                <FieldError id="lead-phone-error" message={errors.phone} />
              </div>

              <div className="lg:col-span-2">
                <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="lead-address">
                  Địa chỉ công trình <span className="font-normal text-[var(--muted)]">(không bắt buộc)</span>
                </label>
                <input
                  aria-describedby={errors.address ? "lead-address-error" : undefined}
                  aria-invalid={Boolean(errors.address)}
                  autoComplete="street-address"
                  className={fieldClassName}
                  disabled={isSubmitting}
                  id="lead-address"
                  maxLength={255}
                  name="address"
                  placeholder="Số nhà, đường, phường/xã"
                  type="text"
                  value={values.address}
                  onBlur={validateField}
                  onChange={(event) => updateField("address", event.target.value)}
                />
                <FieldError id="lead-address-error" message={errors.address} />
              </div>

              <fieldset className="lg:col-span-2">
                <legend className="text-sm font-semibold text-[var(--ink)]">Thời gian muốn được liên hệ</legend>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["morning", "Buổi sáng"],
                    ["afternoon", "Buổi chiều"],
                    ["evening", "Buổi tối"],
                    ["anytime", "Bất kỳ lúc nào"],
                  ].map(([value, label]) => (
                    <label
                      className="cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-center text-sm font-semibold text-[var(--ink)] transition has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand-soft)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand-dark)] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[var(--paper)]"
                      key={value}
                    >
                      <input
                        checked={values.preferredContactTime === value}
                        className="sr-only"
                        disabled={isSubmitting}
                        name="preferredContactTime"
                        onChange={(event) => updateField("preferredContactTime", event.target.value)}
                        type="radio"
                        value={value}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <FieldError id="lead-preferredContactTime-error" message={errors.preferredContactTime} />
              </fieldset>

              <div className="lg:col-span-2">
                <div className="flex items-end justify-between gap-3">
                  <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="lead-note">
                    Ghi chú <span className="font-normal text-[var(--muted)]">(không bắt buộc)</span>
                  </label>
                  <span className="text-xs text-[var(--muted)]">{values.note.length}/1000</span>
                </div>
                <textarea
                  aria-describedby={errors.note ? "lead-note-error" : undefined}
                  aria-invalid={Boolean(errors.note)}
                  className={`${fieldClassName} min-h-24 resize-y`}
                  disabled={isSubmitting}
                  id="lead-note"
                  maxLength={1000}
                  name="note"
                  placeholder="Ví dụ: Mái tôn, ưu tiên khảo sát cuối tuần"
                  rows={3}
                  value={values.note}
                  onBlur={validateField}
                  onChange={(event) => updateField("note", event.target.value)}
                />
                <FieldError id="lead-note-error" message={errors.note} />
              </div>
            </div>

            {serverError ? (
              <div className="mt-5 rounded-lg border border-[var(--danger-line)] bg-[var(--danger-soft)] p-4 text-sm leading-6 text-[var(--danger)]" role="alert">
                {serverError}
              </div>
            ) : null}

            <button
              className="mt-6 flex min-h-14 w-full items-center justify-between rounded-xl bg-[var(--brand-dark)] px-6 py-4 text-left text-base font-semibold text-[var(--paper)] transition hover:bg-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] disabled:cursor-wait disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              <span>{isSubmitting ? "Đang gửi yêu cầu..." : "Đăng ký khảo sát công trình"}</span>
              <span aria-hidden="true" className={isSubmitting ? "animate-spin" : "transition group-hover:translate-x-1"}>
                {isSubmitting ? "↻" : "→"}
              </span>
            </button>
            <p className="mt-3 text-center text-sm leading-5 text-[var(--muted)]">
              Không yêu cầu thanh toán. Bạn có thể trao đổi lại phạm vi trước khi hẹn khảo sát.
            </p>
          </form>
        )}

        <div className="mt-7 grid gap-3 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
          <a
            className="flex min-h-12 items-center justify-between rounded-lg border border-[var(--line-strong)] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
            href={settings.zaloUrl}
            rel="noopener noreferrer"
            target="_blank"
            onClick={() => trackEvent("zalo_clicked", { calculationId, packageId })}
          >
            <span>Tư vấn qua Zalo</span>
            <span aria-hidden="true">↗</span>
          </a>
          <a
            className="flex min-h-12 items-center justify-between rounded-lg border border-[var(--line-strong)] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--sun)] hover:bg-[var(--warning-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
            href={phoneHref}
          >
            <span>{settings.hotline}</span>
            <span aria-hidden="true">☎</span>
          </a>
        </div>
        <p className="mt-3 text-center text-sm leading-5 text-[var(--muted)]">
          Kênh liên hệ của {settings.businessName}
        </p>
      </div>
    </section>
  );
}
