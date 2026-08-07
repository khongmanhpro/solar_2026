import { describe, expect, it } from "vitest";

import {
  ELECTRICITY_TARIFF_REGISTRY,
  QD1279_RESIDENTIAL_TARIFF,
  VAT_8_PERCENT_NQ204,
} from "@/config/electricity-tariffs";
import {
  assessNormalizedInputReadiness,
  calculateNormalizedInputConfidence,
  createLegacyNormalizedEnergyInput,
  normalizedEnergyInputSchema,
  prepareCalculationInput,
} from "@/lib/customer-input";
import { assessCalculationDataReadiness } from "@/lib/data-readiness";
import {
  calculateElectricityBill,
  calculateElectricityBillBreakdown,
} from "@/lib/electricity-tariff";
import {
  DEFAULT_BILL_AMOUNT_BASIS,
  NORMALIZED_ENERGY_INPUT_SCHEMA_VERSION,
  type NormalizedEnergyInput,
  type ProvenancedValue,
} from "@/types/customer-input";
import type { ElectricityTariffVersion } from "@/types/electricity-tariff";

function provenanced<T>(
  value: T,
  overrides: Partial<Omit<ProvenancedValue<T>, "value">> = {},
): ProvenancedValue<T> {
  return {
    value,
    origin: "customer",
    confidence: "high",
    customerConfirmed: true,
    reasons: ["Dữ liệu test đã được xác nhận."],
    ...overrides,
  };
}

function createMoneyInput(): NormalizedEnergyInput {
  return {
    schemaVersion: NORMALIZED_ENERGY_INPUT_SCHEMA_VERSION,
    source: "money",
    electricityType: provenanced("residential" as const),
    observations: [
      {
        path: "energy.observations.0.totalPaymentVnd",
        kind: "total_payment_vnd",
        amount: provenanced(2_160_000),
      },
    ],
    monthlyConsumptionKwh: provenanced(
      {
        expected: 670,
        lowerBound: 640,
        upperBound: 700,
      },
      {
        origin: "derived",
        confidence: "medium",
        derivedFrom: [
          "bill.energyChargeBeforeVatVnd",
          "tariff:residential-v2",
        ],
        reasons: ["kWh được suy ra từ tổng thanh toán."],
      },
    ),
    bill: {
      amountBasis: DEFAULT_BILL_AMOUNT_BASIS,
      energyChargeBeforeVatVnd: provenanced(2_000_000, {
        origin: "derived",
        confidence: "medium",
        derivedFrom: [
          "bill.totalPaymentVnd",
          "bill.vatVnd",
          "bill.otherChargesVnd",
        ],
        reasons: ["Đã tách VAT và khoản khác khỏi tổng thanh toán."],
      }),
      vatRate: provenanced(0.08, {
        origin: "default",
        confidence: "medium",
        assumptionRef: "vat-policy-fixture-v1",
        reasons: ["Thuế suất fixture dùng riêng cho test contract."],
      }),
      vatVnd: provenanced(160_000, {
        origin: "derived",
        confidence: "medium",
        derivedFrom: ["bill.energyChargeBeforeVatVnd", "bill.vatRate"],
        reasons: ["VAT được tính từ tiền điện trước VAT."],
      }),
      otherChargesVnd: provenanced(0),
      totalPaymentVnd: provenanced(2_160_000),
    },
    moneyConversions: [
      {
        observationPath: "energy.observations.0.totalPaymentVnd",
        period: "2026-06",
        tariffVersion: "residential-v2",
        vatRuleVersion: "vat-fixture-v1",
        vatRate: 0.08,
        billingContextKind: "unknown",
        householdCount: null,
        billingDayScale: null,
        totalPaymentVnd: 2_160_000,
        energyChargeBeforeVatVnd: {
          expected: 2_000_000,
          lowerBound: 1_900_000,
          upperBound: 2_100_000,
        },
        vatVnd: {
          expected: 160_000,
          lowerBound: 152_000,
          upperBound: 168_000,
        },
        otherChargesVnd: {
          expected: 0,
          lowerBound: 0,
          upperBound: 0,
        },
        consumptionKwh: {
          expected: 670,
          lowerBound: 640,
          upperBound: 700,
        },
        exact: false,
        warnings: ["Fixture khoảng kWh."],
      },
    ],
    tariffVersion: "residential-v2",
    tariffVersions: ["residential-v2"],
    quality: "preliminary",
    warnings: ["Chỉ có dữ liệu của một tháng."],
  };
}

describe("normalizedEnergyInputSchema", () => {
  it("mặc định tiền V2 là tổng thanh toán và yêu cầu amountBasis rõ ràng", () => {
    expect(DEFAULT_BILL_AMOUNT_BASIS).toBe("total_payment");

    const parsed = normalizedEnergyInputSchema.parse(createMoneyInput());
    expect(parsed.bill?.amountBasis).toBe("total_payment");
    expect(parsed.bill?.totalPaymentVnd?.value).toBe(2_160_000);
    expect(parsed.bill?.energyChargeBeforeVatVnd?.value).toBe(2_000_000);

    const withoutAmountBasis = {
      ...createMoneyInput(),
      bill: {
        totalPaymentVnd: provenanced(2_160_000),
      },
    };
    const readiness = assessNormalizedInputReadiness(withoutAmountBasis);

    expect(readiness.readyForCalculation).toBe(false);
    expect(readiness.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SOURCE_VALUE_MISMATCH",
          path: "bill.amountBasis",
        }),
      ]),
    );

    const withoutEnergyChargeBreakdown = {
      ...createMoneyInput(),
      bill: {
        amountBasis: DEFAULT_BILL_AMOUNT_BASIS,
        totalPaymentVnd: provenanced(2_160_000),
      },
    };
    expect(
      assessNormalizedInputReadiness(withoutEnergyChargeBreakdown).issues,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SOURCE_VALUE_MISMATCH",
          path: "bill.energyChargeBeforeVatVnd",
        }),
      ]),
    );
  });

  it("adapter legacy ghi rõ tiền trước VAT và provenance của kWh suy ra", () => {
    const normalized = createLegacyNormalizedEnergyInput(
      {
        inputContractVersion: "legacy-v1",
        energyInputMethod: "legacy_money",
        inputMonthCount: 1,
        monthlyConsumptionKwh: 669.95239,
        monthlyBill: 2_000_000,
        electricityType: "residential",
        electricalPhase: null,
        province: "ho-chi-minh",
        daytimeUsageLevel: "high",
        roofAreaM2: 25,
        backupRequired: false,
        essentialLoadWatts: null,
        backupHours: null,
      },
      "residential-legacy-v1",
    );

    expect(normalized.bill?.amountBasis).toBe("energy_charge_before_vat");
    expect(normalized.bill?.energyChargeBeforeVatVnd?.value).toBe(2_000_000);
    expect(normalized.monthlyConsumptionKwh.origin).toBe("derived");
    expect(normalized.monthlyConsumptionKwh.derivedFrom).toEqual([
      "bill.energyChargeBeforeVatVnd",
      "tariff:residential-legacy-v1",
    ]);
    expect(normalized.monthlyConsumptionKwh.value.expected).toBeCloseTo(
      669.95239,
      5,
    );
    expect(normalized.monthlyConsumptionKwh.value.lowerBound).toBe(
      normalized.monthlyConsumptionKwh.value.expected,
    );
    expect(normalized.monthlyConsumptionKwh.value.upperBound).toBe(
      normalized.monthlyConsumptionKwh.value.expected,
    );
  });

  it("chặn dữ liệu OCR chưa được khách hàng xác nhận", () => {
    const input: NormalizedEnergyInput = {
      ...createMoneyInput(),
      source: "invoice_ocr",
      observations: [
        {
          path: "energy.observations.0.valueKwh",
          kind: "kwh",
          amount: provenanced(520, {
            origin: "ocr",
            confidence: "high",
            customerConfirmed: false,
            reasons: ["OCR đọc được chỉ số kWh."],
          }),
        },
      ],
      monthlyConsumptionKwh: provenanced(
        { expected: 520, lowerBound: 520, upperBound: 520 },
        {
          origin: "ocr",
          confidence: "high",
          customerConfirmed: false,
          reasons: ["OCR đọc được chỉ số kWh."],
        },
      ),
    };

    const readiness = assessNormalizedInputReadiness(input);

    expect(readiness.readyForCalculation).toBe(false);
    expect(readiness.issues).toEqual([
      expect.objectContaining({ code: "OCR_NOT_CONFIRMED" }),
    ]);
  });

  it.each([
    [
      "derived",
      {
        ...createMoneyInput(),
        monthlyConsumptionKwh: provenanced(
          { expected: 670, lowerBound: 640, upperBound: 700 },
          {
            origin: "derived",
            confidence: "medium",
            reasons: ["Giá trị suy ra nhưng thiếu nguồn."],
          },
        ),
      },
      "monthlyConsumptionKwh.derivedFrom",
    ],
    [
      "default",
      {
        ...createMoneyInput(),
        electricityType: provenanced("residential" as const, {
          origin: "default",
          confidence: "medium",
          reasons: ["Giá trị mặc định nhưng thiếu mã giả định."],
        }),
      },
      "electricityType.assumptionRef",
    ],
  ])(
    "bắt buộc provenance cho giá trị %s",
    (_origin, input, expectedPath) => {
      const readiness = assessNormalizedInputReadiness(input);

      expect(readiness.readyForCalculation).toBe(false);
      expect(readiness.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "MISSING_PROVENANCE",
            path: expectedPath,
          }),
        ]),
      );
    },
  );

  it("từ chối estimate khi expected nằm ngoài khoảng", () => {
    const input = {
      ...createMoneyInput(),
      monthlyConsumptionKwh: provenanced(
        { expected: 630, lowerBound: 640, upperBound: 700 },
        {
          origin: "derived",
          confidence: "low",
          derivedFrom: ["bill.totalPaymentVnd"],
          reasons: ["Khoảng cố ý không hợp lệ để kiểm thử."],
        },
      ),
    };

    const readiness = assessNormalizedInputReadiness(input);

    expect(readiness.readyForCalculation).toBe(false);
    expect(readiness.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_ESTIMATE",
          path: "monthlyConsumptionKwh.value.expected",
        }),
      ]),
    );
  });

  it.each([
    [
      "thiếu tariff version",
      { ...createMoneyInput(), tariffVersion: "" },
      "MISSING_TARIFF_VERSION",
    ],
    [
      "money không có bill",
      { ...createMoneyInput(), bill: undefined },
      "SOURCE_VALUE_MISMATCH",
    ],
    [
      "schema version không hỗ trợ",
      { ...createMoneyInput(), schemaVersion: "1.0.0" },
      "INVALID_INPUT",
    ],
    [
      "thiếu kWh đã chuẩn hóa",
      { ...createMoneyInput(), monthlyConsumptionKwh: undefined },
      "MISSING_ENERGY_VALUE",
    ],
  ])("ánh xạ đúng mã lỗi cho %s", (_label, input, expectedCode) => {
    const readiness = assessNormalizedInputReadiness(input);

    expect(readiness.readyForCalculation).toBe(false);
    expect(readiness.issues.map((issue) => issue.code)).toContain(expectedCode);
  });
});

describe("input confidence", () => {
  it("một tháng tiền điện vẫn sẵn sàng để tính nhưng confidence thấp, độc lập với data readiness", () => {
    const normalized = createLegacyNormalizedEnergyInput(
      {
        inputContractVersion: "legacy-v1",
        energyInputMethod: "legacy_money",
        inputMonthCount: 1,
        monthlyConsumptionKwh: 669.95239,
        monthlyBill: 2_000_000,
        electricityType: "residential",
        electricalPhase: null,
        province: "ho-chi-minh",
        daytimeUsageLevel: "medium",
        roofAreaM2: 30,
        backupRequired: false,
        essentialLoadWatts: null,
        backupHours: null,
      },
      "demo-tariff-version",
    );

    const inputReadiness = assessNormalizedInputReadiness(normalized);
    const confidence = calculateNormalizedInputConfidence(normalized);
    const dataReadiness = assessCalculationDataReadiness();

    expect(inputReadiness.readyForCalculation).toBe(true);
    expect(confidence.overall).toBe("low");
    expect(confidence.reasons).toEqual(
      expect.arrayContaining(["Chỉ có dữ liệu của một tháng."]),
    );
    expect(dataReadiness.readyForProduction).toBe(false);
    expect(dataReadiness.overallStatus).toBe("demo");
  });
});

describe("prepareCalculationInput", () => {
  it("preserves selected 2.2 phase and normalizes 2.0/2.1 phase to null", () => {
    const base = {
      energy: { method: "kwh" as const, observations: [{ valueKwh: 450 }] },
      site: {
        province: "ho-chi-minh",
        daytimeBehavior: "some_daytime_use" as const,
        roof: { known: false as const },
        backup: { required: false as const },
      },
    };
    const current = prepareCalculationInput(
      {
        ...base,
        schemaVersion: "2.2.0",
        site: { ...base.site, electricalPhase: "three-phase" },
      },
      "tariff-test-v2",
      { allowUnapprovedTariffData: true },
    );
    const legacy = prepareCalculationInput(
      { ...base, schemaVersion: "2.1.0" },
      "tariff-test-v2",
      { allowUnapprovedTariffData: true },
    );

    expect(current.input.electricalPhase).toBe("three-phase");
    expect(legacy.input.electricalPhase).toBeNull();
  });

  it("lấy trung bình kWh trực tiếp, lưu từng quan sát và gắn giả định điện sinh hoạt", () => {
    const prepared = prepareCalculationInput(
      {
        schemaVersion: "2.0.0",
        energy: {
          method: "kwh",
          observations: [
            { period: "2026-04", valueKwh: 360 },
            { period: "2026-05", valueKwh: 480 },
            { period: "2026-06", valueKwh: 600 },
          ],
        },
        site: {
          province: "ho-chi-minh",
          daytimeBehavior: "some_daytime_use",
          roof: { known: false },
          backup: {
            required: true,
            essentialLoadWatts: null,
            backupHours: null,
          },
        },
      },
      "tariff-test-v2",
      { allowUnapprovedTariffData: true },
    );

    expect(prepared.input).toMatchObject({
      inputContractVersion: "2.0.0",
      energyInputMethod: "kwh",
      inputMonthCount: 3,
      monthlyConsumptionKwh: 480,
      electricityType: "residential",
      daytimeUsageLevel: "medium",
      roofAreaM2: null,
      essentialLoadWatts: null,
      backupHours: null,
    });
    expect(prepared.input.monthlyBill).toBe(
      Math.round(calculateElectricityBill("residential", 480)),
    );
    expect(prepared.normalizedInput.observations).toHaveLength(3);
    expect(prepared.normalizedInput.monthlyConsumptionKwh).toMatchObject({
      origin: "derived",
      confidence: "high",
      derivedFrom: [
        "energy.observations.0.valueKwh",
        "energy.observations.1.valueKwh",
        "energy.observations.2.valueKwh",
      ],
      value: { expected: 480, lowerBound: 360, upperBound: 600 },
    });
    expect(prepared.normalizedInput.electricityType).toMatchObject({
      origin: "default",
      assumptionRef: "product-scope:residential-only-v1",
    });
    expect(prepared.normalizedInput.quality).toBe("survey_required");
  });

  it("không nâng confidence lên cao chỉ vì nhập nhiều số thiếu kỳ liên tiếp", () => {
    const prepared = prepareCalculationInput(
      {
        schemaVersion: "2.0.0",
        energy: {
          method: "kwh",
          observations: [
            { valueKwh: 360 },
            { valueKwh: 480 },
            { valueKwh: 600 },
          ],
        },
        site: {
          province: "ho-chi-minh",
          daytimeBehavior: "some_daytime_use",
          roof: { known: true, areaM2: 40 },
          backup: { required: false },
        },
      },
      "tariff-test-v2",
      { allowUnapprovedTariffData: true },
    );

    expect(prepared.normalizedInput.monthlyConsumptionKwh.confidence).toBe(
      "medium",
    );
    expect(prepared.normalizedInput.quality).toBe("preliminary");
    expect(prepared.normalizedInput.warnings).toContain(
      "Độ tin cậy cao cần ít nhất ba kỳ liên tiếp có ghi tháng và kỳ mới nhất không quá hai tháng trước.",
    );
  });

  it("không coi ba kỳ liên tiếp đã quá cũ là lịch sử đáng tin cậy cao", () => {
    const prepared = prepareCalculationInput(
      {
        schemaVersion: "2.0.0",
        energy: {
          method: "kwh",
          observations: [
            { period: "2024-01", valueKwh: 360 },
            { period: "2024-02", valueKwh: 480 },
            { period: "2024-03", valueKwh: 600 },
          ],
        },
        site: {
          province: "ho-chi-minh",
          daytimeBehavior: "some_daytime_use",
          roof: { known: true, areaM2: 40 },
          backup: { required: false },
        },
      },
      "tariff-test-v2",
      { allowUnapprovedTariffData: true },
    );

    expect(prepared.normalizedInput.monthlyConsumptionKwh.confidence).toBe(
      "medium",
    );
    expect(prepared.normalizedInput.quality).toBe("preliminary");
  });

  it("suy ngược tổng thanh toán chuẩn bằng đúng tariff và VAT của kỳ", () => {
    const reference = calculateElectricityBillBreakdown({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      vatRule: VAT_8_PERCENT_NQ204,
      consumptionKwh: 450,
      context: { householdQuotaMultiplier: 1 },
    });
    const prepared = prepareCalculationInput(
      {
        schemaVersion: "2.1.0",
        energy: {
          method: "money",
          amountBasis: "total_payment",
          billingContext: { kind: "standard_single_household" },
          observations: [
            {
              period: "2026-06",
              totalPaymentVnd: reference.totalPaymentVnd,
            },
          ],
        },
        site: {
          province: "ho-chi-minh",
          daytimeBehavior: "some_daytime_use",
          roof: { known: true, areaM2: 40 },
          backup: { required: false },
        },
      },
      "unused-for-money",
      { allowUnapprovedTariffData: true },
    );

    expect(prepared.input.monthlyConsumptionKwh).toBeCloseTo(450, 2);
    expect(prepared.input.monthlyBill).toBe(
      reference.energyChargeBeforeVatVnd,
    );
    expect(prepared.normalizedInput.moneyConversions?.[0]).toMatchObject({
      period: "2026-06",
      tariffVersion: QD1279_RESIDENTIAL_TARIFF.version,
      vatRuleVersion: VAT_8_PERCENT_NQ204.version,
      vatRate: 0.08,
      billingContextKind: "standard_single_household",
      householdCount: 1,
      exact: true,
    });
  });

  it("áp dụng số hộ, ngày thực tế/ngày tham chiếu và khoản khác đã biết", () => {
    const reference = calculateElectricityBillBreakdown({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      vatRule: VAT_8_PERCENT_NQ204,
      consumptionKwh: 700,
      context: {
        householdQuotaMultiplier: 2,
        billingDays: 35,
        referenceDays: 30,
      },
      otherChargesVnd: 50_000,
    });
    const prepared = prepareCalculationInput(
      {
        schemaVersion: "2.1.0",
        energy: {
          method: "money",
          amountBasis: "total_payment",
          billingContext: {
            kind: "known",
            householdCount: 2,
            otherChargesVnd: 50_000,
            periodAdjustment: {
              kind: "custom",
              billingDays: 35,
              referenceDays: 30,
            },
          },
          observations: [
            {
              period: "2026-06",
              totalPaymentVnd: reference.totalPaymentVnd,
            },
          ],
        },
        site: {
          province: "ho-chi-minh",
          daytimeBehavior: "some_daytime_use",
          roof: { known: true, areaM2: 40 },
          backup: { required: false },
        },
      },
      "unused-for-money",
      { allowUnapprovedTariffData: true },
    );

    expect(prepared.input.monthlyConsumptionKwh).toBeCloseTo(700, 2);
    expect(
      prepared.normalizedInput.moneyConversions?.[0]?.billingDayScale,
    ).toBeCloseTo((2 * 35) / 30, 10);
    expect(
      prepared.normalizedInput.bill?.otherChargesVnd?.value,
    ).toBe(50_000);
  });

  it("giữ hóa đơn chưa rõ thành phần thành khoảng rộng thay vì số tuyệt đối", () => {
    const prepared = prepareCalculationInput(
      {
        schemaVersion: "2.1.0",
        energy: {
          method: "money",
          amountBasis: "total_payment",
          billingContext: { kind: "unknown" },
          observations: [
            { period: "2026-06", totalPaymentVnd: 2_160_000 },
          ],
        },
        site: {
          province: "ho-chi-minh",
          daytimeBehavior: "some_daytime_use",
          roof: { known: false },
          backup: { required: false },
        },
      },
      "unused-for-money",
      { allowUnapprovedTariffData: true },
    );

    expect(prepared.normalizedInput.monthlyConsumptionKwh.value.lowerBound).toBe(0);
    expect(prepared.normalizedInput.monthlyConsumptionKwh.value.upperBound).toBeGreaterThan(0);
    expect(prepared.normalizedInput.moneyConversions?.[0]?.exact).toBe(false);
    expect(prepared.normalizedInput.quality).toBe("survey_required");
  });

  it("dự phóng lịch sử nhiều biểu giá theo kỳ mới nhất thay vì fallback legacy", () => {
    const originalTariff = QD1279_RESIDENTIAL_TARIFF as ElectricityTariffVersion;
    const originalEffectivePeriod = { ...originalTariff.effectivePeriod };
    const projectionTariff: ElectricityTariffVersion = {
      ...originalTariff,
      id: "vn-residential-projection-test",
      version: "projection-test-2026-07-v1",
      effectivePeriod: { from: "2026-07-01", to: null },
      tiers: originalTariff.tiers.map((tier, index) =>
        index === 5
          ? { ...tier, unitPriceVndPerKwh: tier.unitPriceVndPerKwh + 100 }
          : { ...tier },
      ),
    };
    const mutableTariffs = ELECTRICITY_TARIFF_REGISTRY.tariffs as ElectricityTariffVersion[];
    originalTariff.effectivePeriod = { from: "2025-05-10", to: "2026-06-30" };
    mutableTariffs.push(projectionTariff);

    try {
      const june = calculateElectricityBillBreakdown({
        tariff: originalTariff,
        vatRule: VAT_8_PERCENT_NQ204,
        consumptionKwh: 450,
        context: { householdQuotaMultiplier: 1 },
      });
      const july = calculateElectricityBillBreakdown({
        tariff: projectionTariff,
        vatRule: VAT_8_PERCENT_NQ204,
        consumptionKwh: 450,
        context: { householdQuotaMultiplier: 1 },
      });
      const prepared = prepareCalculationInput(
        {
          schemaVersion: "2.1.0",
          energy: {
            method: "money",
            amountBasis: "total_payment",
            billingContext: { kind: "standard_single_household" },
            observations: [
              { period: "2026-06", totalPaymentVnd: june.totalPaymentVnd },
              { period: "2026-07", totalPaymentVnd: july.totalPaymentVnd },
            ],
          },
          site: {
            province: "ho-chi-minh",
            daytimeBehavior: "some_daytime_use",
            roof: { known: true, areaM2: 40 },
            backup: { required: false },
          },
        },
        "unused-for-money",
        { allowUnapprovedTariffData: true },
      );

      expect(prepared.input).toMatchObject({
        electricityTariffVersion: projectionTariff.version,
        tariffBillingContext: { householdQuotaMultiplier: 1 },
      });
      expect(prepared.normalizedInput).toMatchObject({
        tariffVersion: projectionTariff.version,
        tariffVersions: [originalTariff.version, projectionTariff.version],
      });
      expect(
        prepared.normalizedInput.warnings.some((warning) =>
          warning.includes("kỳ mới nhất 2026-07"),
        ),
      ).toBe(true);
    } finally {
      originalTariff.effectivePeriod = originalEffectivePeriod;
      mutableTariffs.pop();
    }
  });

  it("không âm thầm nâng request tiền 2.0 thiếu bối cảnh hóa đơn", () => {
    expect(() =>
      prepareCalculationInput(
        {
          schemaVersion: "2.0.0",
          energy: {
            method: "money",
            amountBasis: "total_payment",
            observations: [
              { period: "2026-06", totalPaymentVnd: 2_160_000 },
            ],
          },
          site: {
            province: "ho-chi-minh",
            daytimeBehavior: "some_daytime_use",
            roof: { known: true, areaM2: 40 },
            backup: { required: false },
          },
        },
        "tariff-test-v2",
      ),
    ).toThrow(/2\.0\.0 thiếu billingContext/);
  });
});
