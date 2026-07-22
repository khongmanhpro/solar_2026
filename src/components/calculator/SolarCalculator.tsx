"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import {
  CalculatorForm,
  type CalculatorFieldName,
  type CalculatorFormErrors,
  type CalculatorFormValues,
} from "@/components/calculator/CalculatorForm";
import { CalculationPreview } from "@/components/calculator/CalculationPreview";
import { solarCalculationInputSchema } from "@/lib/validations";
import { ApiClientError, requestJson } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import type { CalculationResponse, ProvinceFactor, SolarPackage } from "@/types/solar";

const INITIAL_VALUES: CalculatorFormValues = {
  electricityType: "residential",
  monthlyBill: "",
  province: "",
  daytimeUsageLevel: "",
  roofAreaM2: "",
  backupRequired: "",
};

export function SolarCalculator() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState<CalculatorFormErrors>({});
  const [provinces, setProvinces] = useState<ProvinceFactor[]>([]);
  const [packages, setPackages] = useState<SolarPackage[]>([]);
  const [resourceState, setResourceState] = useState<"loading" | "ready" | "error">("loading");
  const [resourceAttempt, setResourceAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const startedTracked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      requestJson<ProvinceFactor[]>("/api/provinces", { signal: controller.signal }),
      requestJson<SolarPackage[]>("/api/packages", { signal: controller.signal }),
    ])
      .then(([provinceData, packageData]) => {
        setProvinces(provinceData);
        setPackages(packageData);
        setResourceState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setResourceState("error");
      });

    return () => controller.abort();
  }, [resourceAttempt]);

  const handleChange = useCallback((field: CalculatorFieldName, value: string) => {
    if (!startedTracked.current) {
      startedTracked.current = true;
      trackEvent("calculator_started");
    }

    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(null);
    setResult(null);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const parsedInput = solarCalculationInputSchema.safeParse(values);

    if (!parsedInput.success) {
      const nextErrors: CalculatorFormErrors = {};
      for (const issue of parsedInput.error.issues) {
        const field = issue.path[0] as CalculatorFieldName | undefined;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);

      const firstInvalidField = parsedInput.error.issues[0]?.path[0];
      if (typeof firstInvalidField === "string") {
        document.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)?.focus();
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const calculation = await requestJson<CalculationResponse>("/api/calculations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      });
      setResult(calculation);
      trackEvent("calculation_completed", {
        calculationId: calculation.calculationId,
        packageId: calculation.recommendedPackage?.packageId ?? null,
      });

      window.requestAnimationFrame(() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.getElementById("ket-qua")?.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    } catch (error: unknown) {
      if (error instanceof ApiClientError) {
        setServerError(error.message);

        if (error.issues.length > 0) {
          const nextErrors: CalculatorFormErrors = {};
          for (const issue of error.issues) {
            const field = issue.path.split(".")[0] as CalculatorFieldName;
            if (field in values && !nextErrors[field]) nextErrors[field] = issue.message;
          }
          setErrors(nextErrors);
        }
      } else {
        setServerError("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-12 lg:mt-16" aria-label="Công cụ tính toán điện mặt trời">
      {resourceState === "error" ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--danger-line)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)] sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>Chưa tải được danh sách khu vực và gói điện mặt trời.</span>
          <button
            className="w-fit font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
            type="button"
            onClick={() => {
              setResourceState("loading");
              setResourceAttempt((attempt) => attempt + 1);
            }}
          >
            Thử tải lại
          </button>
        </div>
      ) : null}

      <div className="calculator-shell overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[var(--paper)] shadow-[0_20px_60px_var(--shadow)]">
        <div className="mx-auto max-w-4xl p-6 sm:p-10 lg:p-14">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">Nhập thông tin</p>
              <h2 id="calculator-form-title" className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
                Dữ liệu ngôi nhà
              </h2>
            </div>
            <span className="rounded-full border border-[var(--line)] px-3 py-1 text-sm font-medium text-[var(--muted)]">~ 2 phút</span>
          </div>

          {resourceState === "loading" ? (
            <div aria-label="Đang tải biểu mẫu" className="space-y-5" role="status">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div className="h-20 animate-pulse rounded-xl bg-[var(--skeleton)]" key={item} />
              ))}
            </div>
          ) : resourceState === "ready" ? (
            <CalculatorForm
              errors={errors}
              isSubmitting={isSubmitting}
              provinces={provinces}
              values={values}
              onChange={handleChange}
              onSubmit={handleSubmit}
            />
          ) : (
            <div className="min-h-44 rounded-xl border border-dashed border-[var(--line-strong)] p-6 text-sm leading-6 text-[var(--muted)]">
              Biểu mẫu sẽ xuất hiện sau khi dữ liệu được tải lại thành công.
            </div>
          )}

          {serverError ? (
            <div className="mt-5 rounded-xl border border-[var(--danger-line)] bg-[var(--danger-soft)] p-4 text-sm leading-6 text-[var(--danger)]" role="alert">
              {serverError}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8" id="ket-qua-preview" aria-live="polite">
        <CalculationPreview isSubmitting={isSubmitting} packages={packages} result={result} />
      </div>
    </section>
  );
}
