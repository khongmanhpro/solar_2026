import { z } from "zod";

import { SOLAR_INPUT_LIMITS } from "@/config/defaults";
import {
  getCurrentBillingPeriod,
  MIN_SUPPORTED_BILLING_PERIOD,
} from "@/lib/billing-period";
import {
  CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION,
  CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION_V2_0,
  DAYTIME_BEHAVIORS,
} from "@/types/customer-input";
import {
  DAYTIME_USAGE_LEVELS,
  ELECTRICITY_TYPES,
  LEAD_STATUSES,
  PREFERRED_CONTACT_TIMES,
  SOLAR_SYSTEM_TYPES,
} from "@/types/solar";

const requiredNumber = (requiredMessage: string, invalidMessage: string) =>
  z.unknown().transform((value, context) => {
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      context.addIssue({ code: "custom", message: requiredMessage });
      return z.NEVER;
    }

    const parsedValue = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(parsedValue)) {
      context.addIssue({ code: "custom", message: invalidMessage });
      return z.NEVER;
    }

    return parsedValue;
  });

const optionalTrimmedString = (maximumLength: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maximumLength, message).optional(),
  );

const booleanInputSchema = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean({ error: "Vui lòng chọn nhu cầu điện dự phòng." }));

export const solarCalculationInputSchema = z
  .object({
    electricityType: z.enum(ELECTRICITY_TYPES, {
      error: "Vui lòng chọn loại điện đang sử dụng.",
    }),
    monthlyBill: requiredNumber(
      "Vui lòng nhập tiền điện trung bình mỗi tháng.",
      "Giá trị tiền điện không hợp lệ.",
    )
      .pipe(
        z
          .number()
          .min(
            SOLAR_INPUT_LIMITS.monthlyBill.min,
            "Tiền điện phải lớn hơn hoặc bằng 100.000 đồng.",
          )
          .max(
            SOLAR_INPUT_LIMITS.monthlyBill.max,
            "Giá trị tiền điện không hợp lệ.",
          ),
      ),
    province: z
      .string({ error: "Vui lòng chọn tỉnh hoặc thành phố." })
      .trim()
      .min(1, "Vui lòng chọn tỉnh hoặc thành phố."),
    daytimeUsageLevel: z.enum(DAYTIME_USAGE_LEVELS, {
      error: "Vui lòng chọn mức sử dụng điện ban ngày.",
    }),
    roofAreaM2: requiredNumber(
      "Vui lòng nhập diện tích mái.",
      "Giá trị diện tích mái không hợp lệ.",
    ).pipe(
      z
        .number()
        .min(
          SOLAR_INPUT_LIMITS.roofAreaM2.min,
          "Diện tích mái phải từ 5 m² trở lên.",
        )
        .max(
          SOLAR_INPUT_LIMITS.roofAreaM2.max,
          "Diện tích mái không được vượt quá 10.000 m².",
        ),
    ),
    backupRequired: booleanInputSchema,
  })
  .strict();

const requiredObservationPeriodSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, "Tháng phải theo định dạng YYYY-MM.")
  .refine(
    (period) => period >= MIN_SUPPORTED_BILLING_PERIOD,
    `Kỳ hóa đơn phải từ ${MIN_SUPPORTED_BILLING_PERIOD} trở đi.`,
  )
  .refine(
    (period) => period <= getCurrentBillingPeriod(),
    "Kỳ hóa đơn không được nằm trong tương lai.",
  );

const observationPeriodSchema = requiredObservationPeriodSchema.optional();

const customerKwhObservationSchema = z
  .object({
    period: observationPeriodSchema,
    valueKwh: z
      .number({ error: "Sản lượng điện phải là một số." })
      .finite()
      .positive("Sản lượng điện phải lớn hơn 0 kWh.")
      .max(100_000, "Sản lượng điện vượt quá phạm vi hỗ trợ."),
  })
  .strict();

const customerMoneyObservationSchema = z
  .object({
    period: observationPeriodSchema,
    totalPaymentVnd: z
      .number({ error: "Tổng tiền thanh toán phải là một số." })
      .finite()
      .positive("Tổng tiền thanh toán phải lớn hơn 0 đồng.")
      .max(
        SOLAR_INPUT_LIMITS.monthlyBill.max,
        "Tổng tiền thanh toán vượt quá phạm vi hỗ trợ.",
      ),
  })
  .strict();

const customerMoneyObservationV2_1Schema = customerMoneyObservationSchema
  .extend({ period: requiredObservationPeriodSchema })
  .strict();

const customerInvoiceObservationSchema = z
  .object({
    period: observationPeriodSchema,
    valueKwh: z.number().finite().positive().max(100_000),
    customerConfirmed: z.boolean(),
  })
  .strict();

function requireUniqueObservationPeriods(
  observations: readonly { period?: string }[],
  context: z.RefinementCtx,
): void {
  const firstIndexByPeriod = new Map<string, number>();
  observations.forEach((observation, index) => {
    if (!observation.period) return;
    if (firstIndexByPeriod.has(observation.period)) {
      context.addIssue({
        code: "custom",
        path: [index, "period"],
        message: `Tháng ${observation.period} đã được nhập trước đó.`,
      });
      return;
    }
    firstIndexByPeriod.set(observation.period, index);
  });
}

const customerEnergyInputV2_0Schema = z.discriminatedUnion("method", [
  z
    .object({
      method: z.literal("kwh"),
      observations: z
        .array(customerKwhObservationSchema)
        .min(1, "Vui lòng nhập ít nhất một tháng điện năng.")
        .max(12, "Chỉ hỗ trợ tối đa 12 tháng.")
        .superRefine(requireUniqueObservationPeriods),
    })
    .strict(),
  z
    .object({
      method: z.literal("money"),
      amountBasis: z.literal("total_payment"),
      observations: z
        .array(customerMoneyObservationSchema)
        .min(1, "Vui lòng nhập ít nhất một tháng tiền điện.")
        .max(12, "Chỉ hỗ trợ tối đa 12 tháng.")
        .superRefine(requireUniqueObservationPeriods),
    })
    .strict(),
  z
    .object({
      method: z.literal("invoice_ocr"),
      uploadId: z.string().trim().min(1).max(200),
      extractionVersion: z.string().trim().min(1).max(100),
      // Empty is intentional: until the trusted OCR pipeline exists the
      // service returns a stable, explicit OCR_PIPELINE_NOT_AVAILABLE error.
      observations: z
        .array(customerInvoiceObservationSchema)
        .max(12)
        .superRefine(requireUniqueObservationPeriods),
    })
    .strict(),
]);

const moneyBillingContextSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("standard_single_household") }).strict(),
  z
    .object({
      kind: z.literal("known"),
      householdCount: z
        .number({ error: "Số hộ dùng chung phải là một số." })
        .int("Số hộ dùng chung phải là số nguyên.")
        .min(1, "Số hộ dùng chung phải từ 1 trở lên.")
        .max(100, "Số hộ dùng chung vượt quá phạm vi hỗ trợ."),
      otherChargesVnd: z
        .number({ error: "Khoản khác phải là một số." })
        .finite()
        .int("Khoản khác phải là số nguyên đồng.")
        .min(0, "Khoản khác không được âm.")
        .max(
          SOLAR_INPUT_LIMITS.monthlyBill.max,
          "Khoản khác vượt quá phạm vi hỗ trợ.",
        ),
      periodAdjustment: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("standard") }).strict(),
        z
          .object({
            kind: z.literal("custom"),
            billingDays: z
              .number({ error: "Số ngày ghi điện phải là một số." })
              .int("Số ngày ghi điện phải là số nguyên.")
              .min(1)
              .max(366),
            referenceDays: z
              .number({ error: "Số ngày chuẩn phải là một số." })
              .int("Số ngày chuẩn phải là số nguyên.")
              .min(1)
              .max(366),
          })
          .strict(),
      ]),
    })
    .strict(),
  z.object({ kind: z.literal("unknown") }).strict(),
]);

const customerEnergyInputSchema = z.discriminatedUnion("method", [
  z
    .object({
      method: z.literal("kwh"),
      observations: z
        .array(customerKwhObservationSchema)
        .min(1, "Vui lòng nhập ít nhất một tháng điện năng.")
        .max(12, "Chỉ hỗ trợ tối đa 12 tháng.")
        .superRefine(requireUniqueObservationPeriods),
    })
    .strict(),
  z
    .object({
      method: z.literal("money"),
      amountBasis: z.literal("total_payment"),
      billingContext: moneyBillingContextSchema,
      observations: z
        .array(customerMoneyObservationV2_1Schema)
        .min(1, "Vui lòng nhập ít nhất một tháng tiền điện.")
        .max(12, "Chỉ hỗ trợ tối đa 12 tháng.")
        .superRefine(requireUniqueObservationPeriods),
    })
    .strict()
    .superRefine((energy, context) => {
      if (energy.billingContext.kind !== "known") return;
      const otherChargesVnd = energy.billingContext.otherChargesVnd;
      energy.observations.forEach((observation, index) => {
        if (otherChargesVnd >= observation.totalPaymentVnd) {
          context.addIssue({
            code: "custom",
            path: ["observations", index, "totalPaymentVnd"],
            message:
              "Tổng thanh toán phải lớn hơn khoản khác để còn phần tiền điện năng.",
          });
        }
      });
    }),
  z
    .object({
      method: z.literal("invoice_ocr"),
      uploadId: z.string().trim().min(1).max(200),
      extractionVersion: z.string().trim().min(1).max(100),
      observations: z
        .array(customerInvoiceObservationSchema)
        .max(12)
        .superRefine(requireUniqueObservationPeriods),
    })
    .strict(),
]);

const customerRoofInputSchema = z.discriminatedUnion("known", [
  z.object({ known: z.literal(false) }).strict(),
  z
    .object({
      known: z.literal(true),
      areaM2: z
        .number({ error: "Diện tích mái phải là một số." })
        .finite()
        .positive("Diện tích mái phải lớn hơn 0 m².")
        .max(
          SOLAR_INPUT_LIMITS.roofAreaM2.max,
          "Diện tích mái không được vượt quá 10.000 m².",
        ),
    })
    .strict(),
]);

const customerBackupInputSchema = z.discriminatedUnion("required", [
  z.object({ required: z.literal(false) }).strict(),
  z
    .object({
      required: z.literal(true),
      essentialLoadWatts: z
        .number()
        .finite()
        .int("Công suất tải phải là số nguyên watt.")
        .positive()
        .max(1_000_000)
        .nullable(),
      backupHours: z.number().finite().positive().max(168).nullable(),
    })
    .strict(),
]);

/** Customer-facing Phase 1 contract. Electricity type is intentionally not
 * requested: this product scope currently supports residential tariffs only. */
export const customerCalculationRequestV2Schema = z
  .object({
    schemaVersion: z.literal(CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION),
    energy: customerEnergyInputSchema,
    site: z
      .object({
        province: z
          .string({ error: "Vui lòng chọn tỉnh hoặc thành phố." })
          .trim()
          .min(1, "Vui lòng chọn tỉnh hoặc thành phố."),
        daytimeBehavior: z.enum(DAYTIME_BEHAVIORS, {
          error: "Vui lòng chọn thói quen sử dụng điện ban ngày.",
        }),
        roof: customerRoofInputSchema,
        backup: customerBackupInputSchema,
      })
      .strict(),
  })
  .strict();

/** Compatibility parser for Phase 1 requests already stored or sent by an
 * older client. Money requests on this version are parsed but rejected by the
 * service because they do not state bill composition. */
export const customerCalculationRequestV2_0Schema = z
  .object({
    schemaVersion: z.literal(
      CUSTOMER_CALCULATION_REQUEST_SCHEMA_VERSION_V2_0,
    ),
    energy: customerEnergyInputV2_0Schema,
    site: z
      .object({
        province: z
          .string({ error: "Vui lòng chọn tỉnh hoặc thành phố." })
          .trim()
          .min(1, "Vui lòng chọn tỉnh hoặc thành phố."),
        daytimeBehavior: z.enum(DAYTIME_BEHAVIORS, {
          error: "Vui lòng chọn thói quen sử dụng điện ban ngày.",
        }),
        roof: customerRoofInputSchema,
        backup: customerBackupInputSchema,
      })
      .strict(),
  })
  .strict();

/** Transitional legacy contract. Old callers must explicitly state that the
 * amount is the pre-VAT energy charge; an ambiguous bare monthlyBill is not a
 * valid public calculation request. */
export const legacyCalculationRequestSchema = solarCalculationInputSchema
  .extend({
    inputContractVersion: z.literal("legacy-v1"),
    billAmountBasis: z.literal("energy_charge_before_vat"),
    customerConfirmed: z.literal(true),
  })
  .strict();

/** Public API contract. Both branches are strict and have explicit amount
 * semantics. */
export const calculationRequestSchema = z.union([
  customerCalculationRequestV2Schema,
  customerCalculationRequestV2_0Schema,
  legacyCalculationRequestSchema,
]);

export function normalizeVietnamesePhone(phone: string): string {
  const normalized = phone.replace(/[\s().-]/g, "");

  if (normalized.startsWith("+84")) {
    return `0${normalized.slice(3)}`;
  }

  if (normalized.startsWith("84")) {
    return `0${normalized.slice(2)}`;
  }

  return normalized;
}

const vietnamesePhoneSchema = z
  .string({ error: "Vui lòng nhập số điện thoại." })
  .trim()
  .min(1, "Vui lòng nhập số điện thoại.")
  .transform(normalizeVietnamesePhone)
  .refine(
    (phone) => /^0(?:3|5|7|8|9)\d{8}$/.test(phone),
    "Số điện thoại Việt Nam không hợp lệ.",
  );

export const leadInputSchema = z
  .object({
    fullName: z
      .string({ error: "Vui lòng nhập họ và tên." })
      .trim()
      .min(2, "Vui lòng nhập họ và tên.")
      .max(100, "Họ và tên không được vượt quá 100 ký tự."),
    phone: vietnamesePhoneSchema,
    address: optionalTrimmedString(
      255,
      "Địa chỉ không được vượt quá 255 ký tự.",
    ),
    preferredContactTime: z.enum(PREFERRED_CONTACT_TIMES, {
      error: "Vui lòng chọn thời gian muốn được liên hệ.",
    }),
    note: optionalTrimmedString(1_000, "Ghi chú không được vượt quá 1.000 ký tự."),
    calculationId: z
      .string({ error: "Không tìm thấy kết quả tính toán." })
      .trim()
      .min(1, "Không tìm thấy kết quả tính toán."),
  })
  .strict();

const solarPackageFields = {
  code: z
    .string()
    .trim()
    .min(1, "Mã gói là bắt buộc.")
    .max(50, "Mã gói không được vượt quá 50 ký tự.")
    .regex(
      /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
      "Mã gói chỉ gồm chữ in hoa, số và dấu gạch ngang.",
    ),
  name: z.string().trim().min(1, "Tên gói là bắt buộc.").max(150),
  description: z.string().trim().min(1, "Mô tả gói là bắt buộc.").max(1_000),
  priceVnd: z.number().int().positive("Giá gói phải lớn hơn 0."),
  capacityKwp: z.number().positive("Công suất phải lớn hơn 0."),
  baseMonthlyGenerationKwh: z
    .number()
    .positive("Sản lượng cơ sở phải lớn hơn 0."),
  requiredRoofAreaM2: z.number().min(5, "Diện tích mái yêu cầu tối thiểu là 5 m²."),
  systemType: z.enum(SOLAR_SYSTEM_TYPES),
  batteryCapacityKwh: z.number().min(0, "Dung lượng pin không được âm."),
  equipmentSummary: z.string().trim().min(1).max(2_000),
  panelBrand: z.string().trim().min(1).max(100),
  panelModel: z.string().trim().min(1).max(100),
  inverterBrand: z.string().trim().min(1).max(100),
  inverterModel: z.string().trim().min(1).max(100),
  panelWarrantyYears: z.number().int().min(0).max(50),
  inverterWarrantyYears: z.number().int().min(0).max(50),
  active: z.boolean(),
  displayOrder: z.number().int().min(0),
} satisfies z.ZodRawShape;

export const solarPackageCreateSchema = z.object(solarPackageFields).strict();
export const solarPackageUpdateSchema = solarPackageCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Cần cung cấp ít nhất một trường để cập nhật.",
);

const calculationSettingsFields = {
  averageElectricityPriceVndPerKwh: z.number().int().positive(),
  batteryRoundTripEfficiency: z.number().min(0).max(1),
  batteryDailyCycleFactor: z.number().min(0).max(1),
  lowEstimateFactor: z.number().positive().max(1),
  highEstimateFactor: z.number().min(1),
  systemLifetimeYears: z.number().int().min(1).max(50),
  maintenanceRatePerYear: z.number().min(0).max(1),
  daytimeLowRatio: z.number().min(0).max(1),
  daytimeMediumRatio: z.number().min(0).max(1),
  daytimeHighRatio: z.number().min(0).max(1),
  zaloUrl: z.url("Link Zalo không hợp lệ."),
  hotline: z.string().trim().min(1).max(30),
  businessName: z.string().trim().min(1).max(150),
} satisfies z.ZodRawShape;

export const calculationSettingsSchema = z
  .object(calculationSettingsFields)
  .strict()
  .superRefine((settings, context) => {
    if (
      !(
        settings.daytimeLowRatio < settings.daytimeMediumRatio &&
        settings.daytimeMediumRatio < settings.daytimeHighRatio
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["daytimeMediumRatio"],
        message: "Tỷ lệ ban ngày phải tăng dần từ thấp đến cao.",
      });
    }
  });

export const calculationSettingsUpdateSchema = z
  .object(calculationSettingsFields)
  .partial()
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Cần cung cấp ít nhất một trường để cập nhật.",
  );

export const provinceFactorSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Mã tỉnh/thành là bắt buộc.")
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Mã tỉnh/thành không hợp lệ."),
    name: z.string().trim().min(1, "Tên tỉnh/thành là bắt buộc.").max(100),
    factor: z.number().positive("Hệ số sản lượng phải lớn hơn 0.").max(2),
    active: z.boolean(),
    displayOrder: z.number().int().min(0),
  })
  .strict();

export const provinceFactorUpdateSchema = provinceFactorSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Cần cung cấp ít nhất một trường để cập nhật.",
);

export const leadStatusUpdateSchema = z
  .object({
    status: z.enum(LEAD_STATUSES, { error: "Trạng thái lead không hợp lệ." }),
  })
  .strict();

export type SolarCalculationInputData = z.infer<
  typeof solarCalculationInputSchema
>;
export type LegacyCalculationRequestData = z.infer<
  typeof legacyCalculationRequestSchema
>;
export type CustomerCalculationRequestV2Data = z.infer<
  typeof customerCalculationRequestV2Schema
>;
export type CalculationRequestData = z.infer<typeof calculationRequestSchema>;
export type LeadInputData = z.infer<typeof leadInputSchema>;
export type SolarPackageCreateData = z.infer<typeof solarPackageCreateSchema>;
export type SolarPackageUpdateData = z.infer<typeof solarPackageUpdateSchema>;
export type CalculationSettingsData = z.infer<typeof calculationSettingsSchema>;
export type CalculationSettingsUpdateData = z.infer<
  typeof calculationSettingsUpdateSchema
>;
export type ProvinceFactorData = z.infer<typeof provinceFactorSchema>;
export type ProvinceFactorUpdateData = z.infer<
  typeof provinceFactorUpdateSchema
>;
export type LeadStatusUpdateData = z.infer<typeof leadStatusUpdateSchema>;
