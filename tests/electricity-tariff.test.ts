import { describe, expect, it } from "vitest";

import {
  ELECTRICITY_TARIFF_REGISTRY,
  QD1279_RESIDENTIAL_TARIFF,
  QD14_FIVE_TIER_CANDIDATE,
  VAT_8_PERCENT_NQ204,
} from "@/config/electricity-tariffs";
import {
  calculateElectricityBill,
  calculateElectricityBillBreakdown,
  calculateElectricityEnergyCharge,
  estimateElectricityConsumptionFromBill,
  estimateElectricityConsumptionRangeFromTotal,
} from "@/lib/electricity-tariff";
import { parseElectricityTariffRegistry } from "@/lib/tariff-registry-validation";
import {
  selectBillingRules,
  selectElectricityTariff,
  selectElectricityTariffByVersion,
  selectVatRule,
  TariffSelectionError,
} from "@/lib/tariff-selection";
import type {
  ElectricityTariffRegistry,
  TariffSelectionErrorCode,
} from "@/types/electricity-tariff";
import tariffGoldenDraft from "./fixtures/electricity-tariff-qd1279-draft-golden.json";

function expectSelectionError(
  action: () => unknown,
  code: TariffSelectionErrorCode,
): void {
  let error: unknown;
  try {
    action();
  } catch (caught) {
    error = caught;
  }

  expect(error).toBeInstanceOf(TariffSelectionError);
  expect((error as TariffSelectionError).code).toBe(code);
}

describe("registry biểu giá và VAT có phiên bản", () => {
  it("fail-fast khi file dữ liệu hở bậc hoặc trùng version", () => {
    const brokenTierRegistry = structuredClone(ELECTRICITY_TARIFF_REGISTRY);
    Object.assign(brokenTierRegistry.tariffs[0]!.tiers[1]!, {
      fromKwh: 51,
    });
    expect(() =>
      parseElectricityTariffRegistry(brokenTierRegistry),
    ).toThrow(/liên tục/);

    const duplicateVersionRegistry = structuredClone(
      ELECTRICITY_TARIFF_REGISTRY,
    );
    Object.assign(duplicateVersionRegistry.tariffs[1]!, {
      version: duplicateVersionRegistry.tariffs[0]!.version,
    });
    expect(() =>
      parseElectricityTariffRegistry(duplicateVersionRegistry),
    ).toThrow(/Version dataset bị trùng/);

    const overlappingRegistry = structuredClone(
      ELECTRICITY_TARIFF_REGISTRY,
    );
    overlappingRegistry.tariffs = [
      ...overlappingRegistry.tariffs,
      {
        ...structuredClone(QD1279_RESIDENTIAL_TARIFF),
        id: "overlap-for-validation",
        version: "overlap-for-validation-v1",
        effectivePeriod: { from: "2026-07-10", to: "2026-07-15" },
      },
    ];
    expect(() => parseElectricityTariffRegistry(overlappingRegistry)).toThrow(
      /Khoảng hiệu lực biểu giá chồng lấn/,
    );
  });
  it("lưu QD1279 sáu bậc từ nguồn chính thức nhưng chưa vượt cổng duyệt", () => {
    expect(QD1279_RESIDENTIAL_TARIFF).toMatchObject({
      version: "qd1279-2025-05-10-v1",
      status: "draft",
      approvalStatus: "requires_internal_approval",
      selectable: true,
      valueStatus: "official_source",
      effectivePeriod: { from: "2025-05-10", to: null },
    });
    expect(
      QD1279_RESIDENTIAL_TARIFF.tiers.map((tier) => [
        tier.fromKwh,
        tier.toKwh,
        tier.unitPriceVndPerKwh,
      ]),
    ).toEqual([
      [0, 50, 1_984],
      [50, 100, 2_050],
      [100, 200, 2_380],
      [200, 300, 2_998],
      [300, 400, 3_350],
      [400, null, 3_460],
    ]);
    expect(
      QD1279_RESIDENTIAL_TARIFF.sources.every(
        (source) => source.url !== null,
      ),
    ).toBe(true);
  });

  it("khóa candidate năm bậc vì chưa có ngày và quyết định giá hiệu lực", () => {
    expect(QD14_FIVE_TIER_CANDIDATE).toMatchObject({
      status: "pending",
      approvalStatus: "requires_internal_approval",
      selectable: false,
      valueStatus: "candidate_derived",
      effectivePeriod: { from: null, to: null },
    });
    expect(QD14_FIVE_TIER_CANDIDATE.tiers).toHaveLength(5);
  });

  it("chỉ khai báo VAT 8% trong đúng khoảng có cơ sở", () => {
    expect(VAT_8_PERCENT_NQ204).toMatchObject({
      version: "vat-8-nq204-2025-07-01-v1",
      rateBps: 800,
      status: "draft",
      approvalStatus: "requires_internal_approval",
      effectivePeriod: { from: "2025-07-01", to: "2026-12-31" },
    });
  });
});

describe("selector theo ngày và kỳ hóa đơn", () => {
  it("chặn mặc định khi QD1279 chưa được phê duyệt nội bộ", () => {
    expectSelectionError(
      () =>
        selectElectricityTariff(ELECTRICITY_TARIFF_REGISTRY, {
          date: "2025-07-01",
        }),
      "TARIFF_UNAPPROVED",
    );
  });

  it("cho phép gọi có chủ đích trong kiểm thử nhưng không chọn candidate", () => {
    expect(
      selectElectricityTariff(ELECTRICITY_TARIFF_REGISTRY, {
        date: "2026-01-01",
        allowUnapproved: true,
      }).version,
    ).toBe(QD1279_RESIDENTIAL_TARIFF.version);

    expectSelectionError(
      () =>
        selectElectricityTariffByVersion(
          ELECTRICITY_TARIFF_REGISTRY,
          QD14_FIVE_TIER_CANDIDATE.version,
          { allowUnapproved: true },
        ),
      "TARIFF_NOT_SELECTABLE",
    );
  });

  it("chọn trọn kỳ khi một phiên bản phủ cả tháng", () => {
    expect(
      selectElectricityTariff(ELECTRICITY_TARIFF_REGISTRY, {
        period: "2025-06",
        allowUnapproved: true,
      }).version,
    ).toBe(QD1279_RESIDENTIAL_TARIFF.version);
  });

  it("báo gap cho ngày và kỳ chưa được registry bao phủ", () => {
    expectSelectionError(
      () =>
        selectElectricityTariff(ELECTRICITY_TARIFF_REGISTRY, {
          date: "2025-05-09",
          allowUnapproved: true,
        }),
      "TARIFF_GAP",
    );
    expectSelectionError(
      () =>
        selectElectricityTariff(ELECTRICITY_TARIFF_REGISTRY, {
          period: "2025-05",
          allowUnapproved: true,
        }),
      "TARIFF_GAP",
    );
  });

  it("báo overlap ổn định trước khi xét trạng thái duyệt", () => {
    const registry: ElectricityTariffRegistry = {
      ...ELECTRICITY_TARIFF_REGISTRY,
      tariffs: [
        ...ELECTRICITY_TARIFF_REGISTRY.tariffs,
        {
          ...QD1279_RESIDENTIAL_TARIFF,
          id: "duplicate-for-test",
          version: "duplicate-for-test-v1",
        },
      ],
    };

    expectSelectionError(
      () =>
        selectElectricityTariff(registry, {
          date: "2026-01-01",
          allowUnapproved: true,
        }),
      "TARIFF_OVERLAP",
    );
  });

  it("phát hiện overlap chỉ xuất hiện giữa tháng", () => {
    const registry: ElectricityTariffRegistry = {
      ...ELECTRICITY_TARIFF_REGISTRY,
      tariffs: [
        QD1279_RESIDENTIAL_TARIFF,
        {
          ...QD1279_RESIDENTIAL_TARIFF,
          id: "middle-of-month-overlap",
          version: "middle-of-month-overlap-v1",
          effectivePeriod: { from: "2026-07-10", to: "2026-07-15" },
        },
      ],
    };

    expectSelectionError(
      () =>
        selectElectricityTariff(registry, {
          period: "2026-07",
          allowUnapproved: true,
        }),
      "TARIFF_OVERLAP",
    );
  });

  it("báo khi một kỳ đi qua hai phiên bản", () => {
    const registry: ElectricityTariffRegistry = {
      ...ELECTRICITY_TARIFF_REGISTRY,
      tariffs: [
        {
          ...QD1279_RESIDENTIAL_TARIFF,
          id: "first-half",
          version: "first-half-v1",
          effectivePeriod: { from: "2026-07-01", to: "2026-07-15" },
        },
        {
          ...QD1279_RESIDENTIAL_TARIFF,
          id: "second-half",
          version: "second-half-v1",
          effectivePeriod: { from: "2026-07-16", to: "2026-07-31" },
        },
      ],
    };

    expectSelectionError(
      () =>
        selectElectricityTariff(registry, {
          period: "2026-07",
          allowUnapproved: true,
        }),
      "TARIFF_PERIOD_SPANS_VERSIONS",
    );
  });

  it("chọn VAT ở hai đầu inclusive và chặn ngoài khoảng", () => {
    for (const date of ["2025-07-01", "2026-12-31"]) {
      expect(
        selectVatRule(ELECTRICITY_TARIFF_REGISTRY, {
          date,
          allowUnapproved: true,
        }).rateBps,
      ).toBe(800);
    }

    for (const date of ["2025-06-30", "2027-01-01"]) {
      expectSelectionError(
        () =>
          selectVatRule(ELECTRICITY_TARIFF_REGISTRY, {
            date,
            allowUnapproved: true,
          }),
        "VAT_RULE_GAP",
      );
    }
  });

  it("phát hiện VAT chồng lấn giữa tháng và kỳ đi qua hai phiên bản", () => {
    const overlappingRegistry: ElectricityTariffRegistry = {
      ...ELECTRICITY_TARIFF_REGISTRY,
      vatRules: [
        VAT_8_PERCENT_NQ204,
        {
          ...VAT_8_PERCENT_NQ204,
          id: "vat-middle-overlap",
          version: "vat-middle-overlap-v1",
          effectivePeriod: { from: "2026-07-10", to: "2026-07-15" },
        },
      ],
    };
    expectSelectionError(
      () =>
        selectVatRule(overlappingRegistry, {
          period: "2026-07",
          allowUnapproved: true,
        }),
      "VAT_RULE_OVERLAP",
    );

    const splitRegistry: ElectricityTariffRegistry = {
      ...ELECTRICITY_TARIFF_REGISTRY,
      vatRules: [
        {
          ...VAT_8_PERCENT_NQ204,
          id: "vat-first-half",
          version: "vat-first-half-v1",
          effectivePeriod: { from: "2026-07-01", to: "2026-07-15" },
        },
        {
          ...VAT_8_PERCENT_NQ204,
          id: "vat-second-half",
          version: "vat-second-half-v1",
          effectivePeriod: { from: "2026-07-16", to: "2026-07-31" },
        },
      ],
    };
    expectSelectionError(
      () =>
        selectVatRule(splitRegistry, {
          period: "2026-07",
          allowUnapproved: true,
        }),
      "VAT_RULE_PERIOD_SPANS_VERSIONS",
    );
  });

  it("chặn VAT chưa duyệt và trả cặp rule khi gọi có chủ đích", () => {
    expectSelectionError(
      () =>
        selectVatRule(ELECTRICITY_TARIFF_REGISTRY, {
          date: "2026-01-01",
        }),
      "VAT_RULE_UNAPPROVED",
    );

    expect(
      selectBillingRules(ELECTRICITY_TARIFF_REGISTRY, {
        period: "2026-01",
        allowUnapproved: true,
      }),
    ).toMatchObject({
      tariff: { version: QD1279_RESIDENTIAL_TARIFF.version },
      vatRule: { version: VAT_8_PERCENT_NQ204.version },
    });
  });

  it("từ chối ngày và kỳ không hợp lệ bằng mã lỗi ổn định", () => {
    expectSelectionError(
      () =>
        selectElectricityTariff(ELECTRICITY_TARIFF_REGISTRY, {
          date: "2026-02-30",
        }),
      "INVALID_DATE",
    );
    expectSelectionError(
      () =>
        selectElectricityTariff(ELECTRICITY_TARIFF_REGISTRY, {
          period: "2026-13",
        }),
      "INVALID_PERIOD",
    );
  });
});

describe("legacy wrapper sáu bậc QD1279 trước VAT", () => {
  it("fixture vẫn mang cổng duyệt nội bộ chưa hoàn tất", () => {
    expect(tariffGoldenDraft.status).toBe(
      "DRAFT_REQUIRES_INTERNAL_APPROVAL",
    );
    expect(tariffGoldenDraft.review.domainReviewer).toBeNull();
    expect(tariffGoldenDraft.review.approvedAt).toBeNull();
  });

  it.each(tariffGoldenDraft.cases)(
    "$id: tính đúng tiền điện trước VAT",
    ({ consumptionKwh, expectedEnergyChargeBeforeVatVnd }) => {
      const actualBillVnd = calculateElectricityBill(
        "residential",
        consumptionKwh,
      );

      expect(
        Math.abs(actualBillVnd - expectedEnergyChargeBeforeVatVnd),
      ).toBeLessThanOrEqual(tariffGoldenDraft.tolerances.forwardBillVnd);
    },
  );

  it.each(tariffGoldenDraft.cases)(
    "$id: bill → kWh → bill giữ nguyên giá trị trong tolerance",
    ({ consumptionKwh, expectedEnergyChargeBeforeVatVnd }) => {
      const estimatedKwh = estimateElectricityConsumptionFromBill(
        "residential",
        expectedEnergyChargeBeforeVatVnd,
      );
      const roundTripBillVnd = calculateElectricityBill(
        "residential",
        estimatedKwh,
      );

      expect(Math.abs(estimatedKwh - consumptionKwh)).toBeLessThanOrEqual(
        tariffGoldenDraft.tolerances.inverseConsumptionKwh,
      );
      expect(
        Math.abs(roundTripBillVnd - expectedEnergyChargeBeforeVatVnd),
      ).toBeLessThanOrEqual(tariffGoldenDraft.tolerances.roundTripBillVnd);
    },
  );

  it("không giảm tiền khi đi qua các điểm biên", () => {
    const bills = tariffGoldenDraft.cases.map(({ consumptionKwh }) =>
      calculateElectricityBill("residential", consumptionKwh),
    );

    for (let index = 1; index < bills.length; index += 1) {
      expect(bills[index]).toBeGreaterThan(bills[index - 1] ?? -1);
    }
  });

  it("suy ngược hóa đơn 2 triệu vào đúng bậc 6", () => {
    expect(
      estimateElectricityConsumptionFromBill("residential", 2_000_000),
    ).toBeCloseTo(667.48555, 5);
  });

  it("từ chối số âm và số không hữu hạn", () => {
    expect(() => calculateElectricityBill("residential", -1)).toThrow(
      RangeError,
    );
    expect(() =>
      estimateElectricityConsumptionFromBill("residential", Number.NaN),
    ).toThrow(RangeError);
  });
});

describe("engine tính xuôi có breakdown và quy tắc làm tròn", () => {
  it("dùng cùng subtotal trước VAT cho engine hóa đơn và tiết kiệm solar", () => {
    const input = {
      tariff: QD1279_RESIDENTIAL_TARIFF,
      consumptionKwh: 450,
      context: {
        householdQuotaMultiplier: 2,
        billingDays: 35,
        referenceDays: 30,
      },
    };
    const energy = calculateElectricityEnergyCharge(input);
    const bill = calculateElectricityBillBreakdown({
      ...input,
      vatRule: VAT_8_PERCENT_NQ204,
    });

    expect(energy.energyChargeBeforeVatVnd).toBe(
      bill.energyChargeBeforeVatVnd,
    );
    expect(energy.billingContext).toEqual(bill.billingContext);
    expect(energy.tiers).toEqual(bill.tiers);
  });
  it.each([
    [0, 0, 0],
    [50, 99_200, 107_136],
    [100, 201_700, 217_836],
    [200, 439_700, 474_876],
    [300, 739_500, 798_660],
    [400, 1_074_500, 1_160_460],
    [401, 1_077_960, 1_164_197],
  ])(
    "%s kWh: đúng trước VAT, VAT 8% và tổng sau làm tròn",
    (consumptionKwh, expectedEnergyVnd, expectedTotalVnd) => {
      const breakdown = calculateElectricityBillBreakdown({
        tariff: QD1279_RESIDENTIAL_TARIFF,
        vatRule: VAT_8_PERCENT_NQ204,
        consumptionKwh,
      });

      expect(breakdown.energyChargeBeforeVatVnd).toBe(expectedEnergyVnd);
      expect(breakdown.vatVnd).toBe(Math.round(expectedEnergyVnd * 0.08));
      expect(breakdown.totalPaymentVnd).toBe(expectedTotalVnd);
    },
  );

  it("phân bổ đúng từng bậc tại 401 kWh", () => {
    const breakdown = calculateElectricityBillBreakdown({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      vatRule: VAT_8_PERCENT_NQ204,
      consumptionKwh: 401,
    });

    expect(breakdown.tiers.map((tier) => tier.consumptionKwh)).toEqual([
      50, 50, 100, 100, 100, 1,
    ]);
    expect(breakdown.tiers.map((tier) => tier.chargeVnd)).toEqual([
      99_200, 102_500, 238_000, 299_800, 335_000, 3_460,
    ]);
  });

  it("làm tròn VAT half-up đến một đồng và cộng phí khác minh bạch", () => {
    const breakdown = calculateElectricityBillBreakdown({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      vatRule: VAT_8_PERCENT_NQ204,
      consumptionKwh: 0.5,
      otherChargesVnd: 5_000,
    });

    expect(breakdown).toMatchObject({
      rawEnergyChargeVnd: 992,
      energyChargeBeforeVatVnd: 992,
      rawVatVnd: 79.36,
      vatVnd: 79,
      otherChargesVnd: 5_000,
      totalPaymentVnd: 6_071,
    });
  });

  it("nhân hạn mức hộ dùng chung", () => {
    const breakdown = calculateElectricityBillBreakdown({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      vatRule: VAT_8_PERCENT_NQ204,
      consumptionKwh: 100,
      context: { householdQuotaMultiplier: 2 },
    });

    expect(breakdown.billingContext).toMatchObject({
      householdQuotaMultiplier: 2,
      quotaScale: 2,
    });
    expect(breakdown.energyChargeBeforeVatVnd).toBe(198_400);
  });

  it("co giãn hạn mức theo billingDays/referenceDays", () => {
    const breakdown = calculateElectricityBillBreakdown({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      vatRule: VAT_8_PERCENT_NQ204,
      consumptionKwh: 50,
      context: { billingDays: 15, referenceDays: 30 },
    });

    expect(breakdown.billingContext).toMatchObject({
      billingDays: 15,
      referenceDays: 30,
      quotaScale: 0.5,
    });
    expect(breakdown.tiers.slice(0, 2).map((tier) => tier.toKwh)).toEqual([
      25, 50,
    ]);
    expect(breakdown.energyChargeBeforeVatVnd).toBe(100_850);
    expect(breakdown.totalPaymentVnd).toBe(108_918);
  });

  it("không đoán referenceDays khi chỉ có billingDays", () => {
    expect(() =>
      calculateElectricityBillBreakdown({
        tariff: QD1279_RESIDENTIAL_TARIFF,
        vatRule: VAT_8_PERCENT_NQ204,
        consumptionKwh: 100,
        context: { billingDays: 31 },
      }),
    ).toThrow(RangeError);
  });
});

describe("engine suy ngược tổng tiền thành khoảng kWh", () => {
  const boundaryConsumptions = [
    0,
    0.001,
    49.999,
    50,
    50.001,
    99.999,
    100,
    100.001,
    199.999,
    200,
    200.001,
    299.999,
    300,
    300.001,
    399.999,
    400,
    400.001,
    800,
  ];

  it.each(boundaryConsumptions)(
    "round-trip tại %s kWh với phí khác đã biết",
    (consumptionKwh) => {
      const otherChargesVnd = 25_000;
      const forward = calculateElectricityBillBreakdown({
        tariff: QD1279_RESIDENTIAL_TARIFF,
        vatRule: VAT_8_PERCENT_NQ204,
        consumptionKwh,
        otherChargesVnd,
      });
      const inverse = estimateElectricityConsumptionRangeFromTotal({
        tariff: QD1279_RESIDENTIAL_TARIFF,
        vatRule: VAT_8_PERCENT_NQ204,
        totalPaymentVnd: forward.totalPaymentVnd,
        otherChargesVnd: {
          minVnd: otherChargesVnd,
          maxVnd: otherChargesVnd,
        },
      });

      expect(inverse.minKwh).toBeCloseTo(consumptionKwh, 3);
      expect(inverse.estimatedKwh).toBeCloseTo(consumptionKwh, 3);
      expect(inverse.maxKwh).toBeCloseTo(consumptionKwh, 3);
    },
  );

  it("trả khoảng bao quanh giá trị thật khi chỉ biết miền phí khác", () => {
    const actualConsumptionKwh = 400;
    const forward = calculateElectricityBillBreakdown({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      vatRule: VAT_8_PERCENT_NQ204,
      consumptionKwh: actualConsumptionKwh,
      otherChargesVnd: 50_000,
    });
    const inverse = estimateElectricityConsumptionRangeFromTotal({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      vatRule: VAT_8_PERCENT_NQ204,
      totalPaymentVnd: forward.totalPaymentVnd,
      otherChargesVnd: { minVnd: 0, maxVnd: 100_000 },
    });

    expect(inverse.minKwh).toBeLessThan(actualConsumptionKwh);
    expect(inverse.estimatedKwh).toBeCloseTo(actualConsumptionKwh, 3);
    expect(inverse.maxKwh).toBeGreaterThan(actualConsumptionKwh);
    expect(inverse.energyAndVatTargetVnd).toEqual({
      minVnd: forward.totalPaymentVnd - 100_000,
      maxVnd: forward.totalPaymentVnd,
    });
  });

  it("giữ cùng context hạn mức ở chiều xuôi và chiều ngược", () => {
    const context = {
      householdQuotaMultiplier: 2,
      billingDays: 31,
      referenceDays: 30,
    };
    const forward = calculateElectricityBillBreakdown({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      vatRule: VAT_8_PERCENT_NQ204,
      consumptionKwh: 300,
      context,
    });
    const inverse = estimateElectricityConsumptionRangeFromTotal({
      tariff: QD1279_RESIDENTIAL_TARIFF,
      vatRule: VAT_8_PERCENT_NQ204,
      totalPaymentVnd: forward.totalPaymentVnd,
      otherChargesVnd: { minVnd: 0, maxVnd: 0 },
      context,
    });

    expect(inverse.estimatedKwh).toBeCloseTo(300, 3);
  });

  it("từ chối miền phí vô lý và giới hạn tìm kiếm không đủ", () => {
    expect(() =>
      estimateElectricityConsumptionRangeFromTotal({
        tariff: QD1279_RESIDENTIAL_TARIFF,
        vatRule: VAT_8_PERCENT_NQ204,
        totalPaymentVnd: 100_000,
        otherChargesVnd: { minVnd: 80_000, maxVnd: 70_000 },
      }),
    ).toThrow(RangeError);

    expect(() =>
      estimateElectricityConsumptionRangeFromTotal({
        tariff: QD1279_RESIDENTIAL_TARIFF,
        vatRule: VAT_8_PERCENT_NQ204,
        totalPaymentVnd: 100_000,
        otherChargesVnd: { minVnd: 0, maxVnd: 110_000 },
      }),
    ).toThrow(RangeError);

    expect(() =>
      estimateElectricityConsumptionRangeFromTotal({
        tariff: QD1279_RESIDENTIAL_TARIFF,
        vatRule: VAT_8_PERCENT_NQ204,
        totalPaymentVnd: 1_000_000,
        otherChargesVnd: { minVnd: 0, maxVnd: 0 },
        maxKwh: 1,
      }),
    ).toThrow(RangeError);
  });
});
