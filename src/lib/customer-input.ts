import { z } from "zod";

import {
  ELECTRICITY_TARIFF_REGISTRY,
} from "@/config/electricity-tariffs";
import {
  BILL_AMOUNT_BASES,
  CONFIDENCE_LEVELS,
  CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION,
  CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION_V2_0,
  ENERGY_OBSERVATION_KINDS,
  ENERGY_INPUT_SOURCES,
  INPUT_FIELD_ORIGINS,
  INPUT_QUALITY_LEVELS,
  NORMALIZED_ENERGY_INPUT_SCHEMA_VERSION,
  type ConfidenceLevel,
  type CustomerCalculationRequest,
  type CustomerCalculationRequestV2,
  type CustomerMoneyBillingContext,
  type DaytimeBehavior,
  type InputConfidenceReport,
  type InputReadinessIssue,
  type InputReadinessIssueCode,
  type InputReadinessReport,
  type NormalizedEnergyInput,
  type NormalizedMoneyConversion,
  type NumericEstimate,
} from "@/types/customer-input";
import {
  calculateElectricityBillBreakdown,
  calculateElectricityEnergyCharge,
  estimateElectricityConsumptionFromEnergyCharge,
  estimateElectricityConsumptionRangeFromTotal,
} from "@/lib/electricity-tariff";
import {
  billingPeriodIndex,
  getCurrentBillingPeriod,
  isRecentBillingPeriod,
} from "@/lib/billing-period";
import {
  selectBillingRules,
  selectElectricityTariff,
  selectElectricityTariffByVersion,
} from "@/lib/tariff-selection";
import type { TariffBillingContext } from "@/types/electricity-tariff";
import type {
  DaytimeUsageLevel,
  PreparedCalculationInput,
  SolarCalculationInput,
} from "@/types/solar";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải theo định dạng YYYY-MM-DD.");

const provenanceFields = {
  origin: z.enum(INPUT_FIELD_ORIGINS),
  confidence: z.enum(CONFIDENCE_LEVELS),
  customerConfirmed: z.boolean(),
  derivedFrom: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  assumptionRef: z.string().trim().min(1).max(200).optional(),
  reasons: z.array(z.string().trim().min(1).max(500)).min(1).max(30),
} as const;

function withProvenance<T extends z.ZodType>(valueSchema: T) {
  return z
    .object({ value: valueSchema, ...provenanceFields })
    .strict()
    .superRefine((field, context) => {
      if (field.origin === "derived" && !field.derivedFrom?.length) {
        context.addIssue({
          code: "custom",
          path: ["derivedFrom"],
          message: "Giá trị suy ra phải khai báo dữ liệu nguồn.",
        });
      }

      if (field.origin === "default" && !field.assumptionRef) {
        context.addIssue({
          code: "custom",
          path: ["assumptionRef"],
          message: "Giá trị mặc định phải tham chiếu giả định đã công bố.",
        });
      }
    });
}

const provenancedNumberSchema = withProvenance(
  z.number().finite().nonnegative(),
);
const provenancedRateSchema = withProvenance(
  z.number().finite().min(0).max(1),
);

const numericEstimateSchema = z
  .object({
    expected: z.number().finite().nonnegative(),
    lowerBound: z.number().finite().nonnegative(),
    upperBound: z.number().finite().nonnegative(),
  })
  .strict()
  .superRefine((estimate, context) => {
    if (
      estimate.lowerBound > estimate.expected ||
      estimate.expected > estimate.upperBound
    ) {
      context.addIssue({
        code: "custom",
        path: ["expected"],
        message:
          "Khoảng kWh phải thỏa lowerBound <= expected <= upperBound.",
      });
    }
  });

const billingPeriodSchema = z
  .object({
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    days: z.number().int().min(1).max(366).optional(),
  })
  .strict()
  .superRefine((period, context) => {
    if (!period.startDate && !period.endDate && !period.days) {
      context.addIssue({
        code: "custom",
        message: "Kỳ hóa đơn phải có ít nhất ngày bắt đầu, ngày kết thúc hoặc số ngày.",
      });
    }

    if (
      period.startDate &&
      period.endDate &&
      period.startDate > period.endDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Ngày kết thúc không được trước ngày bắt đầu.",
      });
    }
  });

const normalizedBillAmountSchema = z
  .object({
    amountBasis: z.enum(BILL_AMOUNT_BASES),
    energyChargeBeforeVatVnd: provenancedNumberSchema.optional(),
    energyChargeBeforeVatEstimateVnd: withProvenance(
      numericEstimateSchema,
    ).optional(),
    vatRate: provenancedRateSchema.optional(),
    vatVnd: provenancedNumberSchema.optional(),
    vatEstimateVnd: withProvenance(numericEstimateSchema).optional(),
    otherChargesVnd: provenancedNumberSchema.optional(),
    otherChargesEstimateVnd: withProvenance(numericEstimateSchema).optional(),
    totalPaymentVnd: provenancedNumberSchema.optional(),
  })
  .strict()
  .superRefine((bill, context) => {
    if (
      bill.amountBasis === "total_payment" &&
      !bill.totalPaymentVnd
    ) {
      context.addIssue({
        code: "custom",
        path: ["totalPaymentVnd"],
        message: "Đầu vào tổng thanh toán phải có totalPaymentVnd.",
      });
    }

    if (
      bill.amountBasis === "energy_charge_before_vat" &&
      !bill.energyChargeBeforeVatVnd
    ) {
      context.addIssue({
        code: "custom",
        path: ["energyChargeBeforeVatVnd"],
        message: "Đầu vào trước VAT phải có energyChargeBeforeVatVnd.",
      });
    }

    const energyCharge = bill.energyChargeBeforeVatVnd?.value;
    const vat = bill.vatVnd?.value;
    const otherCharges = bill.otherChargesVnd?.value;
    const total = bill.totalPaymentVnd?.value;
    const vatRate = bill.vatRate?.value;
    if (
      energyCharge !== undefined &&
      vatRate !== undefined &&
      vat !== undefined &&
      Math.abs(energyCharge * vatRate - vat) > 1
    ) {
      context.addIssue({
        code: "custom",
        path: ["vatVnd"],
        message:
          "Tiền VAT không khớp tiền điện trước VAT và thuế suất (dung sai 1 VND).",
      });
    }

    if (
      energyCharge !== undefined &&
      vat !== undefined &&
      otherCharges !== undefined &&
      total !== undefined &&
      Math.abs(energyCharge + vat + otherCharges - total) > 1
    ) {
      context.addIssue({
        code: "custom",
        path: ["totalPaymentVnd"],
        message:
          "Tổng thanh toán không khớp tiền điện trước VAT, VAT và phụ phí (dung sai 1 VND).",
      });
    }
  });

const normalizedMoneyConversionSchema = z
  .object({
    observationPath: z.string().trim().min(1).max(300),
    period: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/),
    tariffVersion: z.string().trim().min(1).max(200),
    vatRuleVersion: z.string().trim().min(1).max(200),
    vatRate: z.number().finite().min(0).max(1),
    billingContextKind: z.enum([
      "standard_single_household",
      "known",
      "unknown",
    ]),
    householdCount: z.number().finite().positive().max(100).nullable(),
    billingDayScale: z.number().finite().positive().max(36_600).nullable(),
    totalPaymentVnd: z.number().finite().positive(),
    energyChargeBeforeVatVnd: numericEstimateSchema,
    vatVnd: numericEstimateSchema,
    otherChargesVnd: numericEstimateSchema,
    consumptionKwh: numericEstimateSchema,
    exact: z.boolean(),
    warnings: z.array(z.string().trim().min(1).max(500)).max(20),
  })
  .strict();

const normalizedEnergyObservationSchema = z
  .object({
    path: z.string().trim().min(1).max(300),
    period: z
      .string()
      .trim()
      .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/)
      .optional(),
    kind: z.enum(ENERGY_OBSERVATION_KINDS),
    amount: provenancedNumberSchema,
  })
  .strict();

export const normalizedEnergyInputSchema = z
  .object({
    schemaVersion: z.literal(NORMALIZED_ENERGY_INPUT_SCHEMA_VERSION),
    source: z.enum(ENERGY_INPUT_SOURCES),
    electricityType: withProvenance(z.literal("residential")),
    billingPeriod: withProvenance(billingPeriodSchema).optional(),
    observations: z
      .array(normalizedEnergyObservationSchema)
      .min(1, "Phải có ít nhất một quan sát năng lượng.")
      .max(12, "Chỉ hỗ trợ tối đa 12 quan sát năng lượng."),
    monthlyConsumptionKwh: withProvenance(numericEstimateSchema),
    bill: normalizedBillAmountSchema.optional(),
    moneyConversions: z.array(normalizedMoneyConversionSchema).max(12).optional(),
    tariffVersion: z.string().trim().min(1).max(200),
    tariffVersions: z.array(z.string().trim().min(1).max(200)).max(12).optional(),
    quality: z.enum(INPUT_QUALITY_LEVELS),
    warnings: z.array(z.string().trim().min(1).max(500)).max(30),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.source === "money" && !input.bill) {
      context.addIssue({
        code: "custom",
        path: ["bill"],
        message: "Nguồn tiền phải có chi tiết số tiền và cách hiểu số tiền.",
      });
    }

    if (
      input.source === "money" &&
      input.bill?.amountBasis === "total_payment" &&
      !input.bill.energyChargeBeforeVatVnd &&
      !input.bill.energyChargeBeforeVatEstimateVnd
    ) {
      context.addIssue({
        code: "custom",
        path: ["bill", "energyChargeBeforeVatVnd"],
        message:
          "Phải tách tiền điện trước VAT khỏi tổng thanh toán trước khi suy ra kWh; không được tính phụ phí như điện năng.",
      });
    }

    if (
      input.source === "money" &&
      input.bill?.amountBasis === "total_payment" &&
      (!input.moneyConversions || input.moneyConversions.length !== input.observations.length)
    ) {
      context.addIssue({
        code: "custom",
        path: ["moneyConversions"],
        message:
          "Mỗi tổng thanh toán phải có kết quả chuyển đổi và phiên bản biểu giá tương ứng.",
      });
    }

    if (input.source === "kwh" && input.observations.some((item) => item.kind !== "kwh")) {
      context.addIssue({
        code: "custom",
        path: ["observations"],
        message: "Nguồn kWh chỉ được chứa quan sát kWh.",
      });
    }

    if (input.source === "money" && input.bill) {
      const expectedKind =
        input.bill.amountBasis === "total_payment"
          ? "total_payment_vnd"
          : "energy_charge_before_vat_vnd";
      if (input.observations.some((item) => item.kind !== expectedKind)) {
        context.addIssue({
          code: "custom",
          path: ["observations"],
          message:
            "Loại quan sát tiền phải khớp cách hiểu số tiền của hóa đơn.",
        });
      }
    }

    if (
      input.source === "invoice_ocr" &&
      input.observations.some((item) => item.kind !== "kwh")
    ) {
      context.addIssue({
        code: "custom",
        path: ["observations"],
        message: "Kết quả OCR Giai đoạn 1 chỉ nhận chỉ số kWh đã xác nhận.",
      });
    }

    if (
      input.source === "kwh" &&
      !["customer", "derived"].includes(input.monthlyConsumptionKwh.origin)
    ) {
      context.addIssue({
        code: "custom",
        path: ["monthlyConsumptionKwh", "origin"],
        message: "kWh trung bình phải đến từ dữ liệu khách nhập.",
      });
    }
  });

function readinessCode(path: PropertyKey[]): InputReadinessIssueCode {
  const normalizedPath = path.map(String).join(".");

  if (normalizedPath.startsWith("tariffVersion")) {
    return "MISSING_TARIFF_VERSION";
  }
  if (normalizedPath.includes("derivedFrom") || normalizedPath.includes("assumptionRef")) {
    return "MISSING_PROVENANCE";
  }
  if (normalizedPath === "monthlyConsumptionKwh") {
    return "MISSING_ENERGY_VALUE";
  }
  if (normalizedPath.startsWith("monthlyConsumptionKwh")) {
    return "INVALID_ESTIMATE";
  }
  if (normalizedPath === "bill" || normalizedPath.startsWith("bill.")) {
    return "SOURCE_VALUE_MISMATCH";
  }
  return "INVALID_INPUT";
}

interface ConfidenceField {
  origin: NormalizedEnergyInput["monthlyConsumptionKwh"]["origin"];
  confidence: ConfidenceLevel;
  customerConfirmed: boolean;
  reasons: string[];
}

function primaryFields(input: NormalizedEnergyInput): ConfidenceField[] {
  const fields: ConfidenceField[] = [
    input.electricityType,
    input.monthlyConsumptionKwh,
    ...input.observations.map((observation) => observation.amount),
  ];
  if (input.billingPeriod) fields.push(input.billingPeriod);
  if (input.bill?.vatRate) fields.push(input.bill.vatRate);
  if (input.bill?.vatVnd) fields.push(input.bill.vatVnd);
  if (input.bill?.otherChargesVnd) fields.push(input.bill.otherChargesVnd);
  if (input.bill?.totalPaymentVnd) fields.push(input.bill.totalPaymentVnd);
  if (input.bill?.energyChargeBeforeVatVnd) {
    fields.push(input.bill.energyChargeBeforeVatVnd);
  }
  if (input.bill?.energyChargeBeforeVatEstimateVnd) {
    fields.push(input.bill.energyChargeBeforeVatEstimateVnd);
  }
  if (input.bill?.vatEstimateVnd) fields.push(input.bill.vatEstimateVnd);
  if (input.bill?.otherChargesEstimateVnd) {
    fields.push(input.bill.otherChargesEstimateVnd);
  }
  return fields;
}

export function assessNormalizedInputReadiness(
  rawInput: unknown,
): InputReadinessReport {
  const parsed = normalizedEnergyInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    const issues: InputReadinessIssue[] = parsed.error.issues.map((issue) => ({
      code: readinessCode(issue.path),
      path: issue.path.map(String).join("."),
      message: issue.message,
    }));
    return { readyForCalculation: false, issues };
  }

  const input = parsed.data;
  const issues: InputReadinessIssue[] = [];
  const fields = primaryFields(input);

  if (input.source === "invoice_ocr" && fields.some((field) => !field.customerConfirmed)) {
    issues.push({
      code: "OCR_NOT_CONFIRMED",
      path: "monthlyConsumptionKwh",
      message: "Khách hàng phải xác nhận dữ liệu OCR trước khi tính toán.",
    });
  } else if (
    fields.some(
      (field) =>
        (field.origin === "customer" || field.origin === "ocr") &&
        !field.customerConfirmed,
    )
  ) {
    issues.push({
      code: "UNCONFIRMED_PRIMARY_VALUE",
      path: "monthlyConsumptionKwh",
      message: "Giá trị chính do khách nhập hoặc OCR đọc phải được xác nhận.",
    });
  }

  return { readyForCalculation: issues.length === 0, issues };
}

const confidenceRank: Record<ConfidenceLevel, number> = {
  insufficient: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export function calculateNormalizedInputConfidence(
  input: NormalizedEnergyInput,
): InputConfidenceReport {
  const readiness = assessNormalizedInputReadiness(input);
  if (!readiness.readyForCalculation) {
    return {
      overall: "insufficient",
      reasons: readiness.issues.map((issue) => issue.message),
    };
  }

  const fields = primaryFields(input);
  const overall = fields.reduce<ConfidenceLevel>(
    (lowest, field) =>
      confidenceRank[field.confidence] < confidenceRank[lowest]
        ? field.confidence
        : lowest,
    "high",
  );

  return {
    overall,
    reasons: [
      ...new Set([
        ...fields.flatMap((field) => field.reasons),
        ...input.warnings,
      ]),
    ],
  };
}

export function createLegacyNormalizedEnergyInput(
  input: SolarCalculationInput,
  tariffVersion: string,
): NormalizedEnergyInput {
  if (
    !Number.isFinite(input.monthlyConsumptionKwh) ||
    input.monthlyConsumptionKwh < 0
  ) {
    throw new RangeError(
      "Legacy input phải được chuẩn hóa kWh theo biểu giá đã chọn trước khi tạo snapshot.",
    );
  }
  const estimatedConsumptionKwh = input.monthlyConsumptionKwh;

  return normalizedEnergyInputSchema.parse({
    schemaVersion: NORMALIZED_ENERGY_INPUT_SCHEMA_VERSION,
    source: "money",
    electricityType: {
      value: input.electricityType,
      origin: "customer",
      confidence: "high",
      customerConfirmed: true,
      reasons: ["Khách hàng đã chọn loại điện sinh hoạt hộ gia đình."],
    },
    observations: [
      {
        path: "monthlyBill",
        kind: "energy_charge_before_vat_vnd",
        amount: {
          value: input.monthlyBill,
          origin: "customer",
          confidence: "high",
          customerConfirmed: true,
          reasons: [
            "Request legacy đã xác nhận rõ đây là tiền điện năng trước VAT.",
          ],
        },
      },
    ],
    monthlyConsumptionKwh: {
      value: {
        expected: estimatedConsumptionKwh,
        lowerBound: estimatedConsumptionKwh,
        upperBound: estimatedConsumptionKwh,
      },
      origin: "derived",
      confidence: "low",
      customerConfirmed: true,
      derivedFrom: [
        "bill.energyChargeBeforeVatVnd",
        `tariff:${tariffVersion}`,
      ],
      reasons: [
        "kWh được suy ngược từ một tháng tiền điện thay vì đọc trực tiếp trên hóa đơn.",
      ],
    },
    bill: {
      amountBasis: "energy_charge_before_vat",
      energyChargeBeforeVatVnd: {
        value: input.monthlyBill,
        origin: "customer",
        confidence: "high",
        customerConfirmed: true,
        reasons: [
          "Request legacy đã xác nhận rõ đây là tiền điện năng trước VAT.",
        ],
      },
    },
    tariffVersion,
    quality: "preliminary",
    warnings: [
      "Chỉ có dữ liệu của một tháng.",
      "Chưa có kỳ hóa đơn, VAT, phụ phí hoặc kWh đọc trực tiếp.",
      "Luồng V2 sẽ mặc định tiền nhập là tổng thanh toán; snapshot này là adapter trước VAT của MVP cũ.",
    ],
  });
}

const daytimeUsageLevelByBehavior: Record<
  DaytimeBehavior,
  DaytimeUsageLevel
> = {
  rarely_home_daytime: "low",
  some_daytime_use: "medium",
  usually_home_daytime: "high",
};

interface LegacyCalculationRequest {
  inputContractVersion: "legacy-v1";
  billAmountBasis: "energy_charge_before_vat";
  customerConfirmed: true;
  monthlyBill: number;
  electricityType: "residential";
  province: string;
  daytimeUsageLevel: DaytimeUsageLevel;
  roofAreaM2: number;
  backupRequired: boolean;
}

function isCustomerRequest(
  input: CustomerCalculationRequest | LegacyCalculationRequest,
): input is CustomerCalculationRequest {
  return (
    "schemaVersion" in input &&
    (input.schemaVersion === CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION ||
      input.schemaVersion === CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION_V2_0)
  );
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function hasReliableRecentHistory(
  observations: CustomerCalculationRequest["energy"]["observations"],
): boolean {
  if (observations.length < 3 || observations.some((item) => !item.period)) {
    return false;
  }

  const periods = observations
    .map((item) => billingPeriodIndex(item.period as string))
    .sort((first, second) => first - second);
  const consecutive = periods.every(
    (period, index) => index === 0 || period - periods[index - 1] === 1,
  );
  const latestPeriod = [...observations]
    .map((item) => item.period as string)
    .sort()
    .at(-1);

  return consecutive && Boolean(latestPeriod && isRecentBillingPeriod(latestPeriod));
}

export interface PrepareCalculationInputOptions {
  /** Draft official-source data is allowed only for development/test preview.
   * Production callers must leave this false. */
  allowUnapprovedTariffData?: boolean;
}

function averageEstimate(
  estimates: readonly NumericEstimate[],
): NumericEstimate {
  return {
    expected: average(estimates.map((estimate) => estimate.expected)),
    lowerBound: average(estimates.map((estimate) => estimate.lowerBound)),
    upperBound: average(estimates.map((estimate) => estimate.upperBound)),
  };
}

function selectProjectionConversion(
  conversions: readonly NormalizedMoneyConversion[],
): NormalizedMoneyConversion {
  const latest = conversions.reduce((selected, candidate) =>
    candidate.period > selected.period ? candidate : selected,
  );

  if (!latest) {
    throw new RangeError("Không có kỳ hóa đơn để chọn biểu giá dự phóng.");
  }

  return latest;
}

function resolveMoneyContext(
  billingContext: CustomerMoneyBillingContext,
  totalPaymentVnd: number,
): {
  engineContext: TariffBillingContext;
  otherChargesVnd: { minVnd: number; maxVnd: number };
  householdCount: number | null;
  exact: boolean;
  warnings: string[];
} {
  if (billingContext.kind === "standard_single_household") {
    return {
      engineContext: { householdQuotaMultiplier: 1 },
      otherChargesVnd: { minVnd: 0, maxVnd: 0 },
      householdCount: 1,
      exact: true,
      warnings: [],
    };
  }

  if (billingContext.kind === "known") {
    return {
      engineContext: {
        householdQuotaMultiplier: billingContext.householdCount,
        ...(billingContext.periodAdjustment.kind === "custom"
          ? {
              billingDays: billingContext.periodAdjustment.billingDays,
              referenceDays: billingContext.periodAdjustment.referenceDays,
            }
          : {}),
      },
      otherChargesVnd: {
        minVnd: billingContext.otherChargesVnd,
        maxVnd: billingContext.otherChargesVnd,
      },
      householdCount: billingContext.householdCount,
      exact: true,
      warnings:
        billingContext.periodAdjustment.kind === "custom"
          ? [
              "Hạn mức bậc được điều chỉnh theo số hộ và tỷ lệ ngày khách hàng đã khai; cần đối chiếu ngày ghi chỉ số trên hóa đơn.",
            ]
          : [],
    };
  }

  return {
    // One hundred quotas is the documented product ceiling and produces a
    // conservative upper kWh bound close to the cheapest tier. It is not used
    // as a claimed household count or a point estimate.
    engineContext: {
      householdQuotaMultiplier: 100,
      billingDays: 366,
      referenceDays: 1,
    },
    otherChargesVnd: { minVnd: 0, maxVnd: totalPaymentVnd },
    householdCount: null,
    exact: false,
    warnings: [
      "Chưa rõ thành phần hóa đơn, số hộ hoặc kỳ ghi điện; khoảng kWh được mở rộng từ 0 đến biên bảo thủ của phạm vi hỗ trợ.",
      "Điểm giữa chỉ phục vụ tính nội bộ và không phải số điện đã đo; chỉ đề xuất gói khi cùng một gói phù hợp trên toàn khoảng.",
    ],
  };
}

function createMoneyConversion(
  observation: {
    period: string;
    totalPaymentVnd: number;
  },
  index: number,
  billingContext: CustomerMoneyBillingContext,
  allowUnapprovedTariffData: boolean,
): NormalizedMoneyConversion {
  const { tariff, vatRule } = selectBillingRules(
    ELECTRICITY_TARIFF_REGISTRY,
    {
      period: observation.period,
      electricityType: "residential",
      allowUnapproved: allowUnapprovedTariffData,
    },
  );
  const context = resolveMoneyContext(
    billingContext,
    observation.totalPaymentVnd,
  );
  const range = estimateElectricityConsumptionRangeFromTotal({
    tariff,
    vatRule,
    totalPaymentVnd: observation.totalPaymentVnd,
    otherChargesVnd: context.otherChargesVnd,
    context: context.engineContext,
  });
  const lowerBreakdown = calculateElectricityBillBreakdown({
    tariff,
    vatRule,
    consumptionKwh: range.minKwh,
    context: context.engineContext,
  });
  const expectedBreakdown = calculateElectricityBillBreakdown({
    tariff,
    vatRule,
    consumptionKwh: range.estimatedKwh,
    context: context.engineContext,
  });
  const upperBreakdown = calculateElectricityBillBreakdown({
    tariff,
    vatRule,
    consumptionKwh: range.maxKwh,
    context: context.engineContext,
  });
  const otherChargesExpected =
    (range.otherChargesVnd.minVnd + range.otherChargesVnd.maxVnd) / 2;

  return {
    observationPath: `energy.observations.${index}.totalPaymentVnd`,
    period: observation.period,
    tariffVersion: tariff.version,
    vatRuleVersion: vatRule.version,
    vatRate: vatRule.rateBps / 10_000,
    billingContextKind: billingContext.kind,
    householdCount: context.householdCount,
    billingDayScale:
      billingContext.kind === "unknown"
        ? null
        : expectedBreakdown.billingContext.quotaScale,
    totalPaymentVnd: observation.totalPaymentVnd,
    energyChargeBeforeVatVnd: {
      expected: expectedBreakdown.energyChargeBeforeVatVnd,
      lowerBound: lowerBreakdown.energyChargeBeforeVatVnd,
      upperBound: upperBreakdown.energyChargeBeforeVatVnd,
    },
    vatVnd: {
      expected: expectedBreakdown.vatVnd,
      lowerBound: lowerBreakdown.vatVnd,
      upperBound: upperBreakdown.vatVnd,
    },
    otherChargesVnd: {
      expected: otherChargesExpected,
      lowerBound: range.otherChargesVnd.minVnd,
      upperBound: range.otherChargesVnd.maxVnd,
    },
    consumptionKwh: {
      expected: range.estimatedKwh,
      lowerBound: range.minKwh,
      upperBound: range.maxKwh,
    },
    exact:
      context.exact && Math.abs(range.maxKwh - range.minKwh) <= 0.01,
    warnings: [
      ...context.warnings,
      ...(tariff.approvalStatus !== "approved" ||
      vatRule.approvalStatus !== "approved"
        ? [
            "Biểu giá/VAT có nguồn chính thức nhưng chưa được phê duyệt nội bộ; production không được sử dụng kết quả này.",
          ]
        : []),
    ],
  };
}

function prepareMoneyCalculationInput(
  request: CustomerCalculationRequestV2,
  allowUnapprovedTariffData: boolean,
): PreparedCalculationInput {
  if (request.energy.method !== "money") {
    throw new RangeError("Request không phải đầu vào tổng thanh toán.");
  }
  const energy = request.energy;

  const conversions = energy.observations.map((observation, index) =>
    createMoneyConversion(
      observation,
      index,
      energy.billingContext,
      allowUnapprovedTariffData,
    ),
  );
  const consumptionEstimate = averageEstimate(
    conversions.map((conversion) => conversion.consumptionKwh),
  );
  const energyChargeEstimate = averageEstimate(
    conversions.map((conversion) => conversion.energyChargeBeforeVatVnd),
  );
  const vatEstimate = averageEstimate(
    conversions.map((conversion) => conversion.vatVnd),
  );
  const otherChargesEstimate = averageEstimate(
    conversions.map((conversion) => conversion.otherChargesVnd),
  );
  const totalPayments = conversions.map(
    (conversion) => conversion.totalPaymentVnd,
  );
  const averageTotalPayment = average(totalPayments);
  const allExact = conversions.every((conversion) => conversion.exact);
  const hasReliableHistory = hasReliableRecentHistory(
    energy.observations,
  );
  const confidence: ConfidenceLevel = !allExact
    ? "low"
    : hasReliableHistory
      ? "high"
      : "medium";
  const tariffVersions = [
    ...new Set(conversions.map((conversion) => conversion.tariffVersion)),
  ];
  const projectionConversion = selectProjectionConversion(conversions);
  const projectionTariff = selectElectricityTariffByVersion(
    ELECTRICITY_TARIFF_REGISTRY,
    projectionConversion.tariffVersion,
    { allowUnapproved: allowUnapprovedTariffData },
  );
  const vatRates = [
    ...new Set(conversions.map((conversion) => conversion.vatRate)),
  ];
  const tariffVersion = projectionTariff.version;
  const observationPaths = conversions.map(
    (conversion) => conversion.observationPath,
  );
  const warnings = [
    ...new Set([
      ...conversions.flatMap((conversion) => conversion.warnings),
      ...(conversions.length === 1
        ? ["Chỉ có dữ liệu của một tháng; mức dùng theo mùa chưa được phản ánh."]
        : []),
      ...(conversions.length > 1 && !hasReliableHistory
        ? [
            "Độ tin cậy cao cần ít nhất ba kỳ liên tiếp và kỳ mới nhất không quá hai tháng trước.",
          ]
        : []),
      ...(tariffVersions.length > 1
        ? [
            `Lịch sử có ${tariffVersions.length} phiên bản biểu giá; dự phóng tiết kiệm dùng biểu giá của kỳ mới nhất ${projectionConversion.period} (${projectionTariff.version}).`,
          ]
        : []),
      ...(!request.site.roof.known
        ? [
            "Chưa biết diện tích mái; kết quả không xác nhận khả năng lắp đặt.",
          ]
        : []),
      ...(request.site.backup.required &&
      (request.site.backup.essentialLoadWatts === null ||
        request.site.backup.backupHours === null)
        ? [
            "Thiếu tải thiết yếu hoặc số giờ dự phòng; chưa thể chốt dung lượng pin.",
          ]
        : []),
    ]),
  ];
  const projectionBillingContext:
    | NonNullable<SolarCalculationInput["tariffBillingContext"]>
    | null =
    energy.billingContext.kind === "unknown"
      ? null
      : energy.billingContext.kind === "standard_single_household"
        ? { householdQuotaMultiplier: 1 }
        : {
            householdQuotaMultiplier: energy.billingContext.householdCount,
            ...(energy.billingContext.periodAdjustment.kind === "custom"
              ? {
                  billingDays:
                    energy.billingContext.periodAdjustment.billingDays,
                  referenceDays:
                    energy.billingContext.periodAdjustment.referenceDays,
                }
              : {}),
          };
  const projectedMonthlyBill = projectionBillingContext
    ? Math.round(
        calculateElectricityEnergyCharge({
          tariff: projectionTariff,
          consumptionKwh: consumptionEstimate.expected,
          context: projectionBillingContext,
        }).energyChargeBeforeVatVnd,
      )
    : Math.round(energyChargeEstimate.expected);
  const input: SolarCalculationInput = {
    inputContractVersion: request.schemaVersion,
    energyInputMethod: "money",
    inputMonthCount: conversions.length,
    monthlyConsumptionKwh: consumptionEstimate.expected,
    monthlyBill: projectedMonthlyBill,
    electricityTariffVersion: projectionTariff.version,
    tariffBillingContext: projectionBillingContext,
    electricityType: "residential",
    province: request.site.province,
    daytimeUsageLevel:
      daytimeUsageLevelByBehavior[request.site.daytimeBehavior],
    roofAreaM2: request.site.roof.known ? request.site.roof.areaM2 : null,
    backupRequired: request.site.backup.required,
    essentialLoadWatts: request.site.backup.required
      ? request.site.backup.essentialLoadWatts
      : null,
    backupHours: request.site.backup.required
      ? request.site.backup.backupHours
      : null,
  };
  const derivedReasons = allExact
    ? [
        "kWh được suy ngược từ tổng thanh toán sau khi khách xác nhận thành phần hóa đơn.",
      ]
    : [
        "Khách chưa chắc thành phần hóa đơn; kWh là khoảng toán học rộng, không phải chỉ số đo.",
      ];
  const normalizedInput = normalizedEnergyInputSchema.parse({
    schemaVersion: NORMALIZED_ENERGY_INPUT_SCHEMA_VERSION,
    source: "money",
    electricityType: {
      value: "residential",
      origin: "default",
      confidence: "high",
      customerConfirmed: true,
      assumptionRef: "product-scope:residential-only-v1",
      reasons: ["Công cụ chỉ áp dụng điện sinh hoạt hộ gia đình."],
    },
    observations: energy.observations.map((observation, index) => ({
      path: observationPaths[index],
      period: observation.period,
      kind: "total_payment_vnd",
      amount: {
        value: observation.totalPaymentVnd,
        origin: "customer",
        confidence: "high",
        customerConfirmed: true,
        reasons: ["Khách hàng nhập tổng tiền cuối cùng đã thanh toán."],
      },
    })),
    monthlyConsumptionKwh: {
      value: consumptionEstimate,
      origin: "derived",
      confidence,
      customerConfirmed: true,
      derivedFrom: [
        ...observationPaths,
        ...tariffVersions.map((version) => `tariff:${version}`),
      ],
      reasons: derivedReasons,
    },
    bill: {
      amountBasis: "total_payment",
      ...(allExact
        ? {
            energyChargeBeforeVatVnd: {
              value: energyChargeEstimate.expected,
              origin: "derived",
              confidence,
              customerConfirmed: true,
              derivedFrom: observationPaths,
              reasons: ["Đã tách tổng thanh toán theo VAT và khoản khác khách xác nhận."],
            },
            vatVnd: {
              value: vatEstimate.expected,
              origin: "derived",
              confidence,
              customerConfirmed: true,
              derivedFrom: observationPaths,
              reasons: ["VAT được tính theo quy tắc có phiên bản của từng kỳ."],
            },
            otherChargesVnd: {
              value: otherChargesEstimate.expected,
              origin: "customer",
              confidence: "high",
              customerConfirmed: true,
              reasons: ["Khách hàng đã xác nhận khoản khác trong tổng tiền."],
            },
          }
        : {}),
      energyChargeBeforeVatEstimateVnd: {
        value: energyChargeEstimate,
        origin: "derived",
        confidence,
        customerConfirmed: true,
        derivedFrom: observationPaths,
        reasons: derivedReasons,
      },
      vatEstimateVnd: {
        value: vatEstimate,
        origin: "derived",
        confidence,
        customerConfirmed: true,
        derivedFrom: observationPaths,
        reasons: ["Khoảng VAT đi cùng khoảng tiền điện năng trước VAT."],
      },
      otherChargesEstimateVnd: {
        value: otherChargesEstimate,
        origin: energy.billingContext.kind === "unknown" ? "derived" : "customer",
        confidence: energy.billingContext.kind === "unknown" ? "low" : "high",
        customerConfirmed: true,
        ...(energy.billingContext.kind === "unknown"
          ? { derivedFrom: observationPaths }
          : {}),
        reasons:
          energy.billingContext.kind === "unknown"
            ? ["Khoản khác chưa biết nên được giữ thành khoảng 0 đến tổng thanh toán."]
            : ["Khách hàng đã xác nhận khoản khác."],
      },
      ...(vatRates.length === 1
        ? {
            vatRate: {
              value: vatRates[0],
              origin: "dataset",
              confidence: "medium",
              customerConfirmed: false,
              reasons: ["Thuế suất được chọn theo kỳ từ registry VAT có phiên bản."],
            },
          }
        : {}),
      totalPaymentVnd: {
        value: averageTotalPayment,
        origin: "derived",
        confidence: "high",
        customerConfirmed: true,
        derivedFrom: observationPaths,
        reasons: [
          conversions.length === 1
            ? "Tổng thanh toán của một kỳ khách nhập."
            : `Trung bình ${conversions.length} tổng thanh toán khách nhập.`,
        ],
      },
    },
    moneyConversions: conversions,
    tariffVersion,
    tariffVersions,
    quality:
      !request.site.roof.known ||
      !allExact ||
      (request.site.backup.required &&
        (request.site.backup.essentialLoadWatts === null ||
          request.site.backup.backupHours === null))
        ? "survey_required"
        : hasReliableHistory
          ? "good"
          : "preliminary",
    warnings,
  });

  return { input, normalizedInput, customerInput: request };
}

/**
 * Converts either public request contract to the one canonical engine input.
 * Call this once at the service boundary and pass the result through snapshot,
 * recommendation and persistence unchanged.
 */
export function prepareCalculationInput(
  request: CustomerCalculationRequest | LegacyCalculationRequest,
  tariffVersion: string,
  options: PrepareCalculationInputOptions = {},
): PreparedCalculationInput {
  if (!isCustomerRequest(request)) {
    const tariff = selectElectricityTariff(ELECTRICITY_TARIFF_REGISTRY, {
      period: getCurrentBillingPeriod(),
      electricityType: request.electricityType,
      allowUnapproved: options.allowUnapprovedTariffData === true,
    });
    const tariffBillingContext = { householdQuotaMultiplier: 1 };
    const monthlyConsumptionKwh = estimateElectricityConsumptionFromEnergyCharge({
      tariff,
      energyChargeBeforeVatVnd: request.monthlyBill,
      context: tariffBillingContext,
    });
    const input: SolarCalculationInput = {
      inputContractVersion: "legacy-v1",
      energyInputMethod: "legacy_money",
      inputMonthCount: 1,
      monthlyConsumptionKwh,
      monthlyBill: request.monthlyBill,
      electricityTariffVersion: tariff.version,
      tariffBillingContext,
      electricityType: request.electricityType,
      province: request.province,
      daytimeUsageLevel: request.daytimeUsageLevel,
      roofAreaM2: request.roofAreaM2,
      backupRequired: request.backupRequired,
      essentialLoadWatts: null,
      backupHours: null,
    };

    return {
      input,
      normalizedInput: createLegacyNormalizedEnergyInput(input, tariff.version),
      customerInput: null,
    };
  }

  if (
    request.schemaVersion === CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION &&
    request.energy.method === "money"
  ) {
    return prepareMoneyCalculationInput(
      request,
      options.allowUnapprovedTariffData === true,
    );
  }

  if (request.energy.method !== "kwh") {
    throw new RangeError(
      request.energy.method === "money"
        ? "Request tiền 2.0.0 thiếu billingContext; hãy nâng lên contract 2.1.0."
        : "Chỉ dữ liệu OCR đã có pipeline tin cậy mới có thể chuẩn hóa.",
    );
  }

  const values = request.energy.observations.map(
    (observation) => observation.valueKwh,
  );
  const monthlyConsumptionKwh = average(values);
  const tariff = selectElectricityTariff(ELECTRICITY_TARIFF_REGISTRY, {
    period: getCurrentBillingPeriod(),
    electricityType: "residential",
    allowUnapproved: options.allowUnapprovedTariffData === true,
  });
  const tariffBillingContext = { householdQuotaMultiplier: 1 };
  const monthlyBill = Math.round(
    calculateElectricityEnergyCharge({
      tariff,
      consumptionKwh: monthlyConsumptionKwh,
      context: tariffBillingContext,
    }).energyChargeBeforeVatVnd,
  );
  const observationPaths = request.energy.observations.map(
    (_observation, index) => `energy.observations.${index}.valueKwh`,
  );
  const input: SolarCalculationInput = {
    inputContractVersion: request.schemaVersion,
    energyInputMethod: "kwh",
    inputMonthCount: values.length,
    monthlyConsumptionKwh,
    monthlyBill,
    electricityTariffVersion: tariff.version,
    tariffBillingContext,
    electricityType: "residential",
    province: request.site.province,
    daytimeUsageLevel:
      daytimeUsageLevelByBehavior[request.site.daytimeBehavior],
    roofAreaM2: request.site.roof.known
      ? request.site.roof.areaM2
      : null,
    backupRequired: request.site.backup.required,
    essentialLoadWatts: request.site.backup.required
      ? request.site.backup.essentialLoadWatts
      : null,
    backupHours: request.site.backup.required
      ? request.site.backup.backupHours
      : null,
  };
  const hasReliableHistory = hasReliableRecentHistory(
    request.energy.observations,
  );
  const confidence: ConfidenceLevel = hasReliableHistory ? "high" : "medium";
  const normalizedInput = normalizedEnergyInputSchema.parse({
    schemaVersion: NORMALIZED_ENERGY_INPUT_SCHEMA_VERSION,
    source: "kwh",
    electricityType: {
      value: "residential",
      origin: "default",
      confidence: "high",
      customerConfirmed: true,
      assumptionRef: "product-scope:residential-only-v1",
      reasons: [
        "Công cụ Giai đoạn 1 chỉ áp dụng biểu giá điện sinh hoạt hộ gia đình.",
      ],
    },
    observations: request.energy.observations.map((observation, index) => ({
      path: observationPaths[index],
      period: observation.period,
      kind: "kwh",
      amount: {
        value: observation.valueKwh,
        origin: "customer",
        confidence: "high",
        customerConfirmed: true,
        reasons: ["Khách hàng nhập trực tiếp điện năng trên hóa đơn."],
      },
    })),
    monthlyConsumptionKwh: {
      value: {
        expected: monthlyConsumptionKwh,
        lowerBound: Math.min(...values),
        upperBound: Math.max(...values),
      },
      origin: "derived",
      confidence,
      customerConfirmed: true,
      derivedFrom: observationPaths,
      reasons: [
        values.length === 1
          ? "Ước tính tháng điển hình hiện dựa trên một kỳ hóa đơn."
          : `Ước tính là trung bình của ${values.length} kỳ do khách hàng nhập.`,
      ],
    },
    bill: {
      amountBasis: "energy_charge_before_vat",
      energyChargeBeforeVatVnd: {
        value: monthlyBill,
        origin: "derived",
        confidence,
        customerConfirmed: true,
        derivedFrom: ["monthlyConsumptionKwh", `tariff:${tariff.version}`],
        reasons: [
          "Tiền điện nền trước VAT được tính xuôi từ kWh theo biểu giá đã chụp trong snapshot và làm tròn đến 1 VND để lưu trữ.",
        ],
      },
    },
    tariffVersion: tariff.version,
    quality:
      !request.site.roof.known ||
      (request.site.backup.required &&
        (request.site.backup.essentialLoadWatts === null ||
          request.site.backup.backupHours === null))
        ? "survey_required"
        : hasReliableHistory
          ? "good"
          : "preliminary",
    warnings: [
      ...(values.length === 1
        ? ["Chỉ có dữ liệu của một tháng; mức dùng theo mùa chưa được phản ánh."]
        : []),
      ...(values.length > 1 && !hasReliableHistory
        ? [
            "Độ tin cậy cao cần ít nhất ba kỳ liên tiếp có ghi tháng và kỳ mới nhất không quá hai tháng trước.",
          ]
        : []),
      ...(!request.site.roof.known
        ? [
            "Chưa biết diện tích mái; kết quả không xác nhận khả năng lắp đặt.",
          ]
        : []),
      ...(request.site.backup.required &&
      (request.site.backup.essentialLoadWatts === null ||
        request.site.backup.backupHours === null)
        ? [
            "Thiếu tải thiết yếu hoặc số giờ dự phòng; chưa thể chốt dung lượng pin.",
          ]
        : []),
    ],
  });

  return { input, normalizedInput, customerInput: request };
}

export type NormalizedEnergyInputData = z.infer<
  typeof normalizedEnergyInputSchema
>;
