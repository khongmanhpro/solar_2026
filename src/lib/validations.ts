import { z } from "zod";

import { SOLAR_INPUT_LIMITS } from "@/config/defaults";
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
