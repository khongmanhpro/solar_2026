import { z } from "zod";

import type { ElectricityTariffRegistry } from "@/types/electricity-tariff";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year!, month! - 1, day!));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month! - 1 &&
      parsed.getUTCDate() === day
    );
  }, "Ngày không tồn tại trên lịch.");

const effectivePeriodSchema = z
  .object({
    from: isoDateSchema.nullable(),
    to: isoDateSchema.nullable(),
  })
  .strict()
  .superRefine((period, context) => {
    if (period.from && period.to && period.from > period.to) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "Ngày kết thúc không được trước ngày bắt đầu.",
      });
    }
  });

function effectivePeriodsOverlap(
  left: { from: string | null; to: string | null },
  right: { from: string | null; to: string | null },
): boolean {
  if (!left.from || !right.from) return false;
  const leftEnd = left.to ?? "9999-12-31";
  const rightEnd = right.to ?? "9999-12-31";
  return left.from <= rightEnd && right.from <= leftEnd;
}

const sourceSchema = z
  .object({
    kind: z.enum([
      "official_document",
      "official_web_page",
      "customer_screenshot",
    ]),
    title: z.string().trim().min(1),
    authority: z.string().trim().min(1),
    documentNumber: z.string().trim().min(1).nullable(),
    issuedOn: isoDateSchema.nullable(),
    url: z.url().nullable(),
  })
  .strict();

const roundingRuleSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }).strict(),
  z
    .object({
      mode: z.literal("half_up"),
      decimalPlaces: z.number().int().min(0).max(6),
    })
    .strict(),
]);

const tierSchema = z
  .object({
    code: z.string().trim().min(1),
    label: z.string().trim().min(1),
    fromKwh: z.number().finite().nonnegative(),
    toKwh: z.number().finite().positive().nullable(),
    unitPriceVndPerKwh: z.number().finite().positive(),
  })
  .strict();

const tariffSchema = z
  .object({
    id: z.string().trim().min(1),
    version: z.string().trim().min(1),
    electricityType: z.literal("residential"),
    currency: z.literal("VND"),
    unit: z.literal("kWh"),
    status: z.enum(["draft", "pending", "verified", "retired"]),
    approvalStatus: z.enum(["requires_internal_approval", "approved"]),
    selectable: z.boolean(),
    valueStatus: z.enum(["official_source", "candidate_derived"]),
    effectivePeriod: effectivePeriodSchema,
    sources: z.array(sourceSchema).min(1),
    notes: z.array(z.string().trim().min(1)).min(1),
    quotaPolicy: z
      .object({
        baseBillingDays: z.number().finite().positive(),
        householdMultiplierSupported: z.boolean(),
        billingDayProrationSupported: z.boolean(),
      })
      .strict(),
    roundingPolicy: z
      .object({
        tierCharge: roundingRuleSchema,
        energySubtotal: roundingRuleSchema,
        vatAmount: roundingRuleSchema,
        totalPayment: roundingRuleSchema,
      })
      .strict(),
    tiers: z.array(tierSchema).min(1),
  })
  .strict()
  .superRefine((tariff, context) => {
    if (tariff.selectable && !tariff.effectivePeriod.from) {
      context.addIssue({
        code: "custom",
        path: ["effectivePeriod", "from"],
        message: "Biểu giá selectable phải có ngày bắt đầu hiệu lực.",
      });
    }
    if (
      tariff.approvalStatus === "approved" &&
      tariff.status !== "verified" &&
      tariff.status !== "retired"
    ) {
      context.addIssue({
        code: "custom",
        path: ["approvalStatus"],
        message: "Chỉ biểu giá verified/retired mới được đánh dấu approved.",
      });
    }
    if (
      tariff.valueStatus === "candidate_derived" &&
      (tariff.selectable || tariff.approvalStatus === "approved")
    ) {
      context.addIssue({
        code: "custom",
        path: ["valueStatus"],
        message: "Đơn giá candidate không được selectable hoặc approved.",
      });
    }

    let expectedFrom = 0;
    const codes = new Set<string>();
    tariff.tiers.forEach((tier, index) => {
      if (codes.has(tier.code)) {
        context.addIssue({
          code: "custom",
          path: ["tiers", index, "code"],
          message: "Mã bậc giá bị trùng.",
        });
      }
      codes.add(tier.code);
      if (tier.fromKwh !== expectedFrom) {
        context.addIssue({
          code: "custom",
          path: ["tiers", index, "fromKwh"],
          message: "Các bậc phải liên tục, bắt đầu từ 0 và không chồng lấn.",
        });
      }
      if (tier.toKwh === null) {
        if (index !== tariff.tiers.length - 1) {
          context.addIssue({
            code: "custom",
            path: ["tiers", index, "toKwh"],
            message: "Chỉ bậc cuối được để giới hạn trên mở.",
          });
        }
      } else {
        if (tier.toKwh <= tier.fromKwh) {
          context.addIssue({
            code: "custom",
            path: ["tiers", index, "toKwh"],
            message: "Giới hạn trên phải lớn hơn giới hạn dưới.",
          });
        }
        expectedFrom = tier.toKwh;
      }
    });
    if (tariff.tiers.at(-1)?.toKwh !== null) {
      context.addIssue({
        code: "custom",
        path: ["tiers"],
        message: "Bậc cuối phải có giới hạn trên mở.",
      });
    }
  });

const vatRuleSchema = z
  .object({
    id: z.string().trim().min(1),
    version: z.string().trim().min(1),
    rateBps: z.number().int().min(0).max(10_000),
    status: z.enum(["draft", "pending", "verified", "retired"]),
    approvalStatus: z.enum(["requires_internal_approval", "approved"]),
    selectable: z.boolean(),
    effectivePeriod: effectivePeriodSchema,
    sources: z.array(sourceSchema).min(1),
    notes: z.array(z.string().trim().min(1)).min(1),
    roundingRule: roundingRuleSchema,
  })
  .strict()
  .superRefine((rule, context) => {
    if (rule.selectable && !rule.effectivePeriod.from) {
      context.addIssue({
        code: "custom",
        path: ["effectivePeriod", "from"],
        message: "Quy tắc VAT selectable phải có ngày bắt đầu hiệu lực.",
      });
    }
    if (
      rule.approvalStatus === "approved" &&
      rule.status !== "verified" &&
      rule.status !== "retired"
    ) {
      context.addIssue({
        code: "custom",
        path: ["approvalStatus"],
        message: "Chỉ VAT verified/retired mới được đánh dấu approved.",
      });
    }
  });

const registrySchema = z
  .object({
    schemaVersion: z.string().trim().min(1),
    registryVersion: z.string().trim().min(1),
    tariffs: z.array(tariffSchema).min(1),
    vatRules: z.array(vatRuleSchema).min(1),
  })
  .strict()
  .superRefine((registry, context) => {
    for (const [key, records] of [
      ["tariffs", registry.tariffs],
      ["vatRules", registry.vatRules],
    ] as const) {
      const ids = new Set<string>();
      const versions = new Set<string>();
      records.forEach((record, index) => {
        if (ids.has(record.id)) {
          context.addIssue({
            code: "custom",
            path: [key, index, "id"],
            message: "ID dataset bị trùng.",
          });
        }
        if (versions.has(record.version)) {
          context.addIssue({
            code: "custom",
            path: [key, index, "version"],
            message: "Version dataset bị trùng.",
          });
        }
        ids.add(record.id);
        versions.add(record.version);
      });
    }

    registry.tariffs.forEach((tariff, index) => {
      if (!tariff.selectable) return;
      registry.tariffs.slice(index + 1).forEach((other, offset) => {
        if (
          other.selectable &&
          other.electricityType === tariff.electricityType &&
          effectivePeriodsOverlap(
            tariff.effectivePeriod,
            other.effectivePeriod,
          )
        ) {
          context.addIssue({
            code: "custom",
            path: ["tariffs", index + offset + 1, "effectivePeriod"],
            message: `Khoảng hiệu lực biểu giá chồng lấn với ${tariff.version}.`,
          });
        }
      });
    });

    registry.vatRules.forEach((vatRule, index) => {
      if (!vatRule.selectable) return;
      registry.vatRules.slice(index + 1).forEach((other, offset) => {
        if (
          other.selectable &&
          effectivePeriodsOverlap(
            vatRule.effectivePeriod,
            other.effectivePeriod,
          )
        ) {
          context.addIssue({
            code: "custom",
            path: ["vatRules", index + offset + 1, "effectivePeriod"],
            message: `Khoảng hiệu lực VAT chồng lấn với ${vatRule.version}.`,
          });
        }
      });
    });
  });

export function parseElectricityTariffRegistry(
  value: unknown,
): ElectricityTariffRegistry {
  return registrySchema.parse(value) as ElectricityTariffRegistry;
}
