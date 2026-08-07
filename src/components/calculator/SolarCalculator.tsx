"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import {
  CalculatorForm,
  type CalculatorEnergyMethod,
  type CalculatorFieldName,
  type CalculatorFormErrors,
  type CalculatorFormValues,
  type CalculatorStep,
  type EnergyObservationFormValue,
} from "@/components/calculator/CalculatorForm";
import { CalculationPreview } from "@/components/calculator/CalculationPreview";
import {
  calculateBackupDeviceWatts,
  type BackupDeviceId,
} from "@/config/backup-devices";
import { CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION } from "@/config/customer-reference-packages";
import { TRIAL_PACKAGE_DATA_VERSION_PREFIX } from "@/config/trial-market-data";
import { ApiClientError, requestJson } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import {
  getCurrentBillingPeriod,
  MIN_SUPPORTED_BILLING_PERIOD,
} from "@/lib/billing-period";
import { customerCalculationRequestV2Schema } from "@/lib/validations";
import {
  CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION,
  type CustomerCalculationRequestV2,
} from "@/types/customer-input";
import type { CalculationResponse, ProvinceFactor, SolarPackage } from "@/types/solar";

const EMPTY_OBSERVATION: EnergyObservationFormValue = { period: "", value: "" };

const INITIAL_VALUES: CalculatorFormValues = {
  energyMethod: "",
  energyObservations: [{ ...EMPTY_OBSERVATION }],
  moneyBillingContext: "",
  moneyHouseholdCount: "",
  moneyOtherChargesVnd: "",
  moneyPeriodAdjustment: "",
  moneyBillingDays: "",
  moneyReferenceDays: "",
  province: "",
  daytimeBehavior: "",
  electricalPhase: "",
  roofKnown: "",
  roofAreaM2: "",
  backupRequired: "",
  backupDeviceIds: [],
  backupInputMode: "devices",
  essentialLoadWatts: "",
  backupHours: "",
};

function firstErrorField(errors: CalculatorFormErrors): string | null {
  return Object.keys(errors).find((field) => Boolean(errors[field])) ?? null;
}

function focusField(field: string | null): void {
  if (!field) return;
  window.requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  });
}

function validateEnergyStep(values: CalculatorFormValues): CalculatorFormErrors {
  const errors: CalculatorFormErrors = {};

  if (!values.energyMethod) {
    errors.energyMethod = "Vui lòng chọn cách cung cấp mức dùng điện.";
    return errors;
  }

  if (values.energyMethod === "invoice_ocr") {
    errors.energyMethod = "Đọc hóa đơn tự động chưa sẵn sàng. Vui lòng nhập kWh hoặc tổng tiền.";
    return errors;
  }

  const usedPeriods = new Set<string>();
  values.energyObservations.forEach((observation, index) => {
    const value = Number(observation.value);
    const valuePath = `energyObservations.${index}.value`;
    const periodPath = `energyObservations.${index}.period`;

    if (!observation.value.trim()) {
      errors[valuePath] =
        values.energyMethod === "kwh"
          ? "Vui lòng nhập số kWh của tháng này."
          : "Vui lòng nhập tổng tiền thanh toán của tháng này.";
    } else if (!Number.isFinite(value) || value <= 0) {
      errors[valuePath] = "Giá trị phải là một số lớn hơn 0.";
    } else if (values.energyMethod === "kwh" && value > 100_000) {
      errors[valuePath] = "Sản lượng điện vượt quá phạm vi hỗ trợ.";
    } else if (values.energyMethod === "money" && value > 500_000_000) {
      errors[valuePath] = "Tổng tiền thanh toán vượt quá phạm vi hỗ trợ.";
    }

    if (values.energyMethod === "money" && !observation.period) {
      errors[periodPath] = "Vui lòng chọn kỳ hóa đơn để áp dụng đúng biểu giá và VAT.";
    } else if (observation.period) {
      if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(observation.period)) {
        errors[periodPath] = "Tháng không hợp lệ.";
      } else if (observation.period < MIN_SUPPORTED_BILLING_PERIOD) {
        errors[periodPath] = `Kỳ hóa đơn phải từ ${MIN_SUPPORTED_BILLING_PERIOD} trở đi.`;
      } else if (observation.period > getCurrentBillingPeriod()) {
        errors[periodPath] = "Kỳ hóa đơn không được nằm trong tương lai.";
      } else if (usedPeriods.has(observation.period)) {
        errors[periodPath] = "Tháng này đã được nhập ở dòng khác.";
      }
      usedPeriods.add(observation.period);
    }
  });

  if (values.energyMethod === "money") {
    if (!values.moneyBillingContext) {
      errors.moneyBillingContext = "Vui lòng chọn trường hợp phù hợp với hóa đơn.";
    } else if (values.moneyBillingContext === "known") {
      const householdCount = Number(values.moneyHouseholdCount);
      const otherChargesVnd = Number(values.moneyOtherChargesVnd);

      if (!values.moneyHouseholdCount.trim()) {
        errors.moneyHouseholdCount = "Vui lòng nhập số hộ dùng chung công tơ.";
      } else if (
        !Number.isInteger(householdCount) ||
        householdCount < 1 ||
        householdCount > 100
      ) {
        errors.moneyHouseholdCount = "Số hộ phải là số nguyên từ 1 đến 100.";
      }

      if (!values.moneyOtherChargesVnd.trim()) {
        errors.moneyOtherChargesVnd = "Vui lòng nhập khoản khác; có thể nhập 0 nếu không có.";
      } else if (
        !Number.isInteger(otherChargesVnd) ||
        otherChargesVnd < 0 ||
        otherChargesVnd > 500_000_000
      ) {
        errors.moneyOtherChargesVnd = "Khoản khác phải là số nguyên từ 0 đến 500.000.000 đồng.";
      } else {
        const minimumTotalPayment = Math.min(
          ...values.energyObservations.map((observation) => Number(observation.value)),
        );
        if (
          Number.isFinite(minimumTotalPayment) &&
          otherChargesVnd >= minimumTotalPayment
        ) {
          errors.moneyOtherChargesVnd = "Khoản khác phải nhỏ hơn tổng tiền thanh toán.";
        }
      }

      if (!values.moneyPeriodAdjustment) {
        errors.moneyPeriodAdjustment = "Vui lòng chọn kỳ bình thường hoặc số ngày thay đổi.";
      } else if (values.moneyPeriodAdjustment === "custom") {
        const billingDays = Number(values.moneyBillingDays);
        const referenceDays = Number(values.moneyReferenceDays);

        if (!values.moneyBillingDays.trim()) {
          errors.moneyBillingDays = "Vui lòng nhập số ngày thực tế trên hóa đơn.";
        } else if (
          !Number.isInteger(billingDays) ||
          billingDays < 1 ||
          billingDays > 366
        ) {
          errors.moneyBillingDays = "Số ngày thực tế phải là số nguyên từ 1 đến 366.";
        }

        if (!values.moneyReferenceDays.trim()) {
          errors.moneyReferenceDays = "Vui lòng nhập số ngày kỳ chuẩn tham chiếu.";
        } else if (
          !Number.isInteger(referenceDays) ||
          referenceDays < 1 ||
          referenceDays > 366
        ) {
          errors.moneyReferenceDays = "Số ngày tham chiếu phải là số nguyên từ 1 đến 366.";
        }
      }
    }
  }

  return errors;
}

function validateHomeStep(values: CalculatorFormValues): CalculatorFormErrors {
  const errors: CalculatorFormErrors = {};

  if (!values.province) errors.province = "Vui lòng chọn tỉnh hoặc thành phố.";
  if (!values.daytimeBehavior) {
    errors.daytimeBehavior = "Vui lòng chọn thói quen sử dụng điện ban ngày.";
  }
  if (!values.electricalPhase) {
    errors.electricalPhase = "Vui lòng chọn điện 1 pha hoặc điện 3 pha.";
  }
  if (!values.roofKnown) {
    errors.roofKnown = "Vui lòng chọn có biết diện tích mái hay không.";
  }
  if (values.roofKnown === "true") {
    const roofAreaM2 = Number(values.roofAreaM2);
    if (!values.roofAreaM2.trim()) {
      errors.roofAreaM2 = "Vui lòng nhập diện tích mái hoặc chọn “Không biết”.";
    } else if (!Number.isFinite(roofAreaM2) || roofAreaM2 <= 0) {
      errors.roofAreaM2 = "Diện tích mái phải lớn hơn 0 m².";
    } else if (roofAreaM2 > 10_000) {
      errors.roofAreaM2 = "Diện tích mái không được vượt quá 10.000 m².";
    }
  }
  if (!values.backupRequired) {
    errors.backupRequired = "Vui lòng chọn nhu cầu điện dự phòng.";
  }
  if (values.backupRequired === "true") {
    if (values.essentialLoadWatts.trim()) {
      const load = Number(values.essentialLoadWatts);
      if (!Number.isFinite(load) || !Number.isInteger(load) || load <= 0 || load > 1_000_000) {
        errors.essentialLoadWatts = "Công suất thiết yếu phải là số nguyên lớn hơn 0 và không vượt quá 1.000.000 W.";
      }
    }
    if (values.backupHours.trim()) {
      const hours = Number(values.backupHours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
        errors.backupHours = "Thời gian dự phòng phải lớn hơn 0 và không vượt quá 168 giờ.";
      }
    }
  }

  return errors;
}

function toRequest(values: CalculatorFormValues): CustomerCalculationRequestV2 | null {
  if (
    (values.energyMethod !== "kwh" && values.energyMethod !== "money") ||
    (values.energyMethod === "money" && !values.moneyBillingContext) ||
    (values.energyMethod === "money" &&
      values.energyObservations.some((observation) => !observation.period)) ||
    !values.daytimeBehavior ||
    !values.electricalPhase ||
    !values.roofKnown ||
    !values.backupRequired
  ) {
    return null;
  }

  const observations = values.energyObservations.map((observation) => ({
    ...(observation.period ? { period: observation.period } : {}),
    value: Number(observation.value),
  }));

  const moneyBillingContext =
    values.moneyBillingContext === "standard_single_household"
      ? { kind: "standard_single_household" as const }
      : values.moneyBillingContext === "known"
        ? {
            kind: "known" as const,
            householdCount: Number(values.moneyHouseholdCount),
            otherChargesVnd: Number(values.moneyOtherChargesVnd),
            periodAdjustment:
              values.moneyPeriodAdjustment === "custom"
                ? {
                    kind: "custom" as const,
                    billingDays: Number(values.moneyBillingDays),
                    referenceDays: Number(values.moneyReferenceDays),
                  }
                : { kind: "standard" as const },
          }
        : { kind: "unknown" as const };

  const energy: CustomerCalculationRequestV2["energy"] =
    values.energyMethod === "kwh"
      ? {
          method: "kwh",
          observations: observations.map(({ period, value }) => ({
            ...(period ? { period } : {}),
            valueKwh: value,
          })),
        }
      : {
          method: "money",
          amountBasis: "total_payment",
          billingContext: moneyBillingContext,
          observations: observations.map(({ period, value }) => ({
            period: period as string,
            totalPaymentVnd: value,
          })),
        };

  return {
    schemaVersion: CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION,
    energy,
    site: {
      province: values.province,
      daytimeBehavior: values.daytimeBehavior,
      electricalPhase: values.electricalPhase,
      roof:
        values.roofKnown === "true"
          ? { known: true, areaM2: Number(values.roofAreaM2) }
          : { known: false },
      backup:
        values.backupRequired === "true"
          ? {
              required: true,
              essentialLoadWatts: values.essentialLoadWatts.trim()
                ? Number(values.essentialLoadWatts)
                : null,
              backupHours: values.backupHours.trim()
                ? Number(values.backupHours)
                : null,
            }
          : { required: false },
    },
  };
}

function apiPathToFormField(path: string): string | null {
  const observationMatch = path.match(/^energy\.observations\.(\d+)\.(?:valueKwh|totalPaymentVnd|period)$/);
  if (observationMatch) {
    const field = path.endsWith(".period") ? "period" : "value";
    return `energyObservations.${observationMatch[1]}.${field}`;
  }
  if (path === "energy.method" || path === "energy") return "energyMethod";
  if (path === "energy.billingContext" || path === "energy.billingContext.kind") {
    return "moneyBillingContext";
  }
  if (path === "energy.billingContext.householdCount") return "moneyHouseholdCount";
  if (path === "energy.billingContext.otherChargesVnd") return "moneyOtherChargesVnd";
  if (
    path === "energy.billingContext.periodAdjustment" ||
    path === "energy.billingContext.periodAdjustment.kind"
  ) {
    return "moneyPeriodAdjustment";
  }
  if (path === "energy.billingContext.periodAdjustment.billingDays") {
    return "moneyBillingDays";
  }
  if (path === "energy.billingContext.periodAdjustment.referenceDays") {
    return "moneyReferenceDays";
  }
  if (path === "site.province") return "province";
  if (path === "site.daytimeBehavior") return "daytimeBehavior";
  if (path === "site.electricalPhase") return "electricalPhase";
  if (path === "site.roof" || path === "site.roof.known") return "roofKnown";
  if (path === "site.roof.areaM2") return "roofAreaM2";
  if (path === "site.backup" || path === "site.backup.required") return "backupRequired";
  if (path === "site.backup.essentialLoadWatts") return "essentialLoadWatts";
  if (path === "site.backup.backupHours") return "backupHours";
  return null;
}

export function SolarCalculator() {
  const [values, setValues] = useState<CalculatorFormValues>(INITIAL_VALUES);
  const [currentStep, setCurrentStep] = useState<CalculatorStep>(1);
  const [errors, setErrors] = useState<CalculatorFormErrors>({});
  const [provinces, setProvinces] = useState<ProvinceFactor[]>([]);
  const [packages, setPackages] = useState<SolarPackage[]>([]);
  const [resourceState, setResourceState] = useState<"loading" | "ready" | "error">("loading");
  const [resourceAttempt, setResourceAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [hasChangesSinceResult, setHasChangesSinceResult] = useState(false);
  const startedTracked = useRef(false);
  const staleChangeTracked = useRef(false);
  const trialCatalogVersion = packages.find((item) =>
    item.dataVersion.startsWith(TRIAL_PACKAGE_DATA_VERSION_PREFIX),
  )?.dataVersion;
  const referenceCatalogLoaded = packages.some(
    (item) => item.dataVersion === CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION,
  );

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

  const registerInteraction = useCallback(
    (method?: CalculatorEnergyMethod) => {
      if (!startedTracked.current) {
        startedTracked.current = true;
        trackEvent("calculator_started", {
          energyMethod: method || values.energyMethod || null,
        });
      }
      if (result) {
        setHasChangesSinceResult(true);
        if (!staleChangeTracked.current) {
          staleChangeTracked.current = true;
          trackEvent("calculator_input_changed_after_result", {
            energyMethod: method || values.energyMethod || null,
          });
        }
      }
    },
    [result, values.energyMethod],
  );

  const handleChange = useCallback(
    (field: CalculatorFieldName, value: string) => {
      registerInteraction();
      setValues((current) => {
        const next = { ...current, [field]: value } as CalculatorFormValues;
        if (field === "roofKnown" && value === "false") next.roofAreaM2 = "";
        if (field === "backupRequired" && value === "false") {
          next.backupDeviceIds = [];
          next.backupInputMode = "devices";
          next.essentialLoadWatts = "";
          next.backupHours = "";
        }
        if (field === "moneyBillingContext" && value !== "known") {
          next.moneyHouseholdCount = "";
          next.moneyOtherChargesVnd = "";
          next.moneyPeriodAdjustment = "";
          next.moneyBillingDays = "";
          next.moneyReferenceDays = "";
        }
        if (field === "moneyPeriodAdjustment" && value !== "custom") {
          next.moneyBillingDays = "";
          next.moneyReferenceDays = "";
        }
        return next;
      });
      setErrors((current) => ({ ...current, [field]: undefined }));
      setServerError(null);
    },
    [registerInteraction],
  );

  const handleBackupDevicesChange = useCallback(
    (deviceIds: BackupDeviceId[]) => {
      registerInteraction();
      setValues((current) => ({
        ...current,
        backupDeviceIds: deviceIds,
        backupInputMode: "devices",
        essentialLoadWatts: calculateBackupDeviceWatts(deviceIds)
          ? String(calculateBackupDeviceWatts(deviceIds))
          : "",
      }));
      setErrors((current) => ({ ...current, essentialLoadWatts: undefined }));
      setServerError(null);
    },
    [registerInteraction],
  );

  const handleBackupInputModeChange = useCallback(
    (mode: "devices" | "manual") => {
      registerInteraction();
      setValues((current) => ({
        ...current,
        backupInputMode: mode,
        essentialLoadWatts:
          mode === "devices"
            ? calculateBackupDeviceWatts(current.backupDeviceIds)
              ? String(calculateBackupDeviceWatts(current.backupDeviceIds))
              : ""
            : current.essentialLoadWatts,
      }));
      setErrors((current) => ({ ...current, essentialLoadWatts: undefined }));
      setServerError(null);
    },
    [registerInteraction],
  );

  const handleEnergyMethodChange = useCallback(
    (method: Exclude<CalculatorEnergyMethod, "">) => {
      registerInteraction(method);
      setValues((current) => ({
        ...current,
        energyMethod: method,
        energyObservations: [{ ...EMPTY_OBSERVATION }],
        moneyBillingContext: "",
        moneyHouseholdCount: "",
        moneyOtherChargesVnd: "",
        moneyPeriodAdjustment: "",
        moneyBillingDays: "",
        moneyReferenceDays: "",
      }));
      setErrors((current) => ({ ...current, energyMethod: undefined }));
      setServerError(null);
      trackEvent("calculator_method_selected", { energyMethod: method });
      if (method === "invoice_ocr") {
        trackEvent("calculation_blocked", {
          energyMethod: method,
          reason: "ocr_pipeline_not_available",
        });
      }
    },
    [registerInteraction],
  );

  const handleObservationChange = useCallback(
    (index: number, field: keyof EnergyObservationFormValue, value: string) => {
      registerInteraction();
      setValues((current) => ({
        ...current,
        energyObservations: current.energyObservations.map((observation, observationIndex) =>
          observationIndex === index ? { ...observation, [field]: value } : observation,
        ),
      }));
      setErrors((current) => ({
        ...current,
        [`energyObservations.${index}.${field}`]: undefined,
      }));
      setServerError(null);
    },
    [registerInteraction],
  );

  const handleAddObservation = useCallback(() => {
    registerInteraction();
    setValues((current) =>
      current.energyObservations.length >= 12
        ? current
        : {
            ...current,
            energyObservations: [...current.energyObservations, { ...EMPTY_OBSERVATION }],
          },
    );
  }, [registerInteraction]);

  const handleRemoveObservation = useCallback(
    (index: number) => {
      registerInteraction();
      setValues((current) => ({
        ...current,
        energyObservations: current.energyObservations.filter((_, observationIndex) => observationIndex !== index),
      }));
      setErrors({});
      setServerError(null);
    },
    [registerInteraction],
  );

  function goToStep(step: CalculatorStep): void {
    setErrors({});
    setServerError(null);
    setCurrentStep(step);
    window.requestAnimationFrame(() => {
      document.getElementById("calculator-form-title")?.focus({ preventScroll: true });
    });
  }

  function handleNext(): void {
    const nextErrors = currentStep === 1 ? validateEnergyStep(values) : validateHomeStep(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      focusField(firstErrorField(nextErrors));
      return;
    }

    trackEvent("calculator_step_completed", {
      step: currentStep,
      energyMethod: values.energyMethod || null,
      observationCount: values.energyObservations.length,
    });
    const nextStep = (currentStep + 1) as CalculatorStep;
    setErrors({});
    setCurrentStep(nextStep);
    trackEvent("calculator_step_viewed", {
      step: nextStep,
      energyMethod: values.energyMethod || null,
    });

    if (nextStep === 3) {
      trackEvent("calculator_review_viewed", {
        energyMethod: values.energyMethod || null,
        observationCount: values.energyObservations.length,
        billingContext:
          values.energyMethod === "money"
            ? values.moneyBillingContext || null
            : null,
        roofKnown: values.roofKnown === "true",
        backupRequired: values.backupRequired === "true",
        electricalPhase: values.electricalPhase || null,
      });
    }
  }

  function reviewUpdatedDraft(): void {
    const energyErrors = validateEnergyStep(values);
    if (Object.keys(energyErrors).length > 0) {
      setCurrentStep(1);
      setErrors(energyErrors);
      focusField(firstErrorField(energyErrors));
      return;
    }

    const homeErrors = validateHomeStep(values);
    if (Object.keys(homeErrors).length > 0) {
      setCurrentStep(2);
      setErrors(homeErrors);
      focusField(firstErrorField(homeErrors));
      return;
    }

    goToStep(3);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const request = toRequest(values);
    const parsedInput = customerCalculationRequestV2Schema.safeParse(request);
    if (!parsedInput.success) {
      const nextErrors: CalculatorFormErrors = {};
      for (const issue of parsedInput.error.issues) {
        const formField = apiPathToFormField(issue.path.map(String).join("."));
        if (formField && !nextErrors[formField]) nextErrors[formField] = issue.message;
      }
      const firstField = firstErrorField(nextErrors);
      if (
        firstField?.startsWith("energyObservations") ||
        firstField?.startsWith("money") ||
        firstField === "energyMethod"
      ) {
        setCurrentStep(1);
      } else if (firstField) {
        setCurrentStep(2);
      }
      setErrors(nextErrors);
      setServerError("Thông tin chưa hợp lệ. Vui lòng kiểm tra lại trước khi tính.");
      focusField(firstField);
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
      setHasChangesSinceResult(false);
      staleChangeTracked.current = false;
      trackEvent("calculation_completed", {
        packageId: calculation.recommendedPackage?.packageId ?? null,
        energyMethod: values.energyMethod,
        observationCount: values.energyObservations.length,
        billingContext:
          values.energyMethod === "money" ? values.moneyBillingContext : null,
        electricalPhase: values.electricalPhase,
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
            const formField = apiPathToFormField(issue.path);
            if (formField && !nextErrors[formField]) nextErrors[formField] = issue.message;
          }
          setErrors(nextErrors);
          const firstField = firstErrorField(nextErrors);
          if (
            firstField?.startsWith("energyObservations") ||
            firstField?.startsWith("money") ||
            firstField === "energyMethod"
          ) {
            setCurrentStep(1);
          } else if (firstField) {
            setCurrentStep(2);
          }
          focusField(firstField);
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
            className="min-h-11 w-fit font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-dark)]"
            onClick={() => {
              setResourceState("loading");
              setResourceAttempt((attempt) => attempt + 1);
            }}
            type="button"
          >
            Thử tải lại
          </button>
        </div>
      ) : null}

      {resourceState === "ready" && (trialCatalogVersion || referenceCatalogLoaded) ? (
        <aside
          className="mb-5 rounded-2xl border border-[var(--warning-line)] bg-[var(--warning-soft)] p-5 text-sm leading-6 text-[var(--warning-ink)]"
          role="note"
        >
          <p className="font-display text-lg font-semibold">
            {referenceCatalogLoaded
              ? `${packages.length} gói tham khảo cho hộ gia đình`
              : `Thông tin giá và cấu hình của ${packages.length} gói điện mặt trời`}
          </p>
          <p className="mt-2">
            {referenceCatalogLoaded
              ? "Các gói được cấu hình sẵn để khách dễ tham khảo. Giá, sản lượng và thiết bị chính thức sẽ được xác nhận lại sau khi khảo sát mái và hệ thống điện tại công trình."
              : "Giá là ước lượng V1 với sai số dự kiến ±15%. Sản lượng và diện tích mái còn dùng giả định có ghi nguồn; kết quả không phải báo giá và bắt buộc được khảo sát kỹ thuật trước khi tư vấn hoặc ký hợp đồng."}
          </p>
        </aside>
      ) : null}

      {resourceState === "ready" && (provinces.length === 0 || packages.length === 0) ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--warning-line)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-ink)] sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>
            Danh sách tỉnh/thành hoặc gói điện mặt trời chưa có dữ liệu. Hãy chạy{' '}
            <code className="rounded bg-[var(--paper)] px-1 py-0.5 font-mono text-xs">docker compose run --rm seed</code>{' '}
            hoặc thêm dữ liệu trong trang quản trị.
          </span>
        </div>
      ) : null}

      <div className="calculator-shell overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[var(--paper)] shadow-[0_20px_60px_var(--shadow)]">
        <div className="mx-auto max-w-4xl p-6 sm:p-10 lg:p-14">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">Nhập thông tin</p>
              <h2 id="calculator-form-title" className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--ink)]" tabIndex={-1}>
                Tìm gói điện mặt trời phù hợp
              </h2>
            </div>
            <span className="rounded-full border border-[var(--line)] px-3 py-1 text-sm font-medium text-[var(--muted)]">~ 1 phút</span>
          </div>

          {result && hasChangesSinceResult ? (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[var(--warning-line)] bg-[var(--warning-soft)] p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
              <p className="text-sm font-semibold text-[var(--warning-ink)]">Thông tin đã thay đổi — Cập nhật kết quả</p>
              <button
                className="min-h-11 rounded-lg bg-[var(--brand-dark)] px-4 py-2 text-sm font-semibold text-[var(--paper)]"
                onClick={reviewUpdatedDraft}
                type="button"
              >
                Xem lại và cập nhật
              </button>
            </div>
          ) : null}

          {resourceState === "loading" ? (
            <div aria-label="Đang tải biểu mẫu" className="space-y-5" role="status">
              {[1, 2, 3, 4].map((item) => (
                <div className="h-20 animate-pulse rounded-xl bg-[var(--skeleton)]" key={item} />
              ))}
            </div>
          ) : resourceState === "ready" ? (
            <CalculatorForm
              currentStep={currentStep}
              errors={errors}
              isSubmitting={isSubmitting}
              provinces={provinces}
              values={values}
              onAddObservation={handleAddObservation}
              onBack={() => goToStep(Math.max(1, currentStep - 1) as CalculatorStep)}
              onBackupDevicesChange={handleBackupDevicesChange}
              onBackupInputModeChange={handleBackupInputModeChange}
              onChange={handleChange}
              onEnergyMethodChange={handleEnergyMethodChange}
              onGoToStep={goToStep}
              onNext={handleNext}
              onObservationChange={handleObservationChange}
              onRemoveObservation={handleRemoveObservation}
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
        <CalculationPreview
          isStale={Boolean(result) && (hasChangesSinceResult || isSubmitting)}
          isSubmitting={isSubmitting}
          packages={packages}
          result={result}
        />
      </div>
    </section>
  );
}
