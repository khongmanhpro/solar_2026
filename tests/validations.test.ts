import { describe, expect, it } from "vitest";

import { DEFAULT_CALCULATION_SETTINGS, DEFAULT_SOLAR_PACKAGES } from "@/config/defaults";
import {
  calculationRequestSchema,
  calculationSettingsSchema,
  customerCalculationRequestV2Schema,
  leadInputSchema,
  leadStatusUpdateSchema,
  legacyCalculationRequestSchema,
  provinceFactorSchema,
  solarCalculationInputSchema,
  solarPackageCreateSchema,
} from "@/lib/validations";

const validCustomerCalculationInput = {
  schemaVersion: "2.1.0",
  energy: {
    method: "kwh",
    observations: [
      { period: "2026-05", valueKwh: 420 },
      { period: "2026-06", valueKwh: 500 },
    ],
  },
  site: {
    province: "ho-chi-minh",
    daytimeBehavior: "some_daytime_use",
    roof: { known: false },
    backup: { required: false },
  },
} as const;

const validCalculationInput = {
  monthlyBill: 2_000_000,
  electricityType: "residential",
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 25,
  backupRequired: false,
};

const defaultPackage = DEFAULT_SOLAR_PACKAGES[0];
const defaultPackageInput = {
  code: defaultPackage.code,
  name: defaultPackage.name,
  description: defaultPackage.description,
  priceVnd: defaultPackage.priceVnd,
  capacityKwp: defaultPackage.capacityKwp,
  baseMonthlyGenerationKwh: defaultPackage.baseMonthlyGenerationKwh,
  requiredRoofAreaM2: defaultPackage.requiredRoofAreaM2,
  systemType: defaultPackage.systemType,
  batteryCapacityKwh: defaultPackage.batteryCapacityKwh,
  equipmentSummary: defaultPackage.equipmentSummary,
  panelBrand: defaultPackage.panelBrand,
  panelModel: defaultPackage.panelModel,
  inverterBrand: defaultPackage.inverterBrand,
  inverterModel: defaultPackage.inverterModel,
  panelWarrantyYears: defaultPackage.panelWarrantyYears,
  inverterWarrantyYears: defaultPackage.inverterWarrantyYears,
  active: defaultPackage.active,
  displayOrder: defaultPackage.displayOrder,
};

const defaultSettingsInput = {
  averageElectricityPriceVndPerKwh:
    DEFAULT_CALCULATION_SETTINGS.averageElectricityPriceVndPerKwh,
  batteryRoundTripEfficiency:
    DEFAULT_CALCULATION_SETTINGS.batteryRoundTripEfficiency,
  batteryDailyCycleFactor:
    DEFAULT_CALCULATION_SETTINGS.batteryDailyCycleFactor,
  lowEstimateFactor: DEFAULT_CALCULATION_SETTINGS.lowEstimateFactor,
  highEstimateFactor: DEFAULT_CALCULATION_SETTINGS.highEstimateFactor,
  systemLifetimeYears: DEFAULT_CALCULATION_SETTINGS.systemLifetimeYears,
  maintenanceRatePerYear:
    DEFAULT_CALCULATION_SETTINGS.maintenanceRatePerYear,
  daytimeLowRatio: DEFAULT_CALCULATION_SETTINGS.daytimeLowRatio,
  daytimeMediumRatio: DEFAULT_CALCULATION_SETTINGS.daytimeMediumRatio,
  daytimeHighRatio: DEFAULT_CALCULATION_SETTINGS.daytimeHighRatio,
  zaloUrl: DEFAULT_CALCULATION_SETTINGS.zaloUrl,
  hotline: DEFAULT_CALCULATION_SETTINGS.hotline,
  businessName: DEFAULT_CALCULATION_SETTINGS.businessName,
};

describe("solarCalculationInputSchema", () => {
  it("chấp nhận và chuyển đổi dữ liệu form hợp lệ", () => {
    const result = solarCalculationInputSchema.parse({
      ...validCalculationInput,
      monthlyBill: "2000000",
      roofAreaM2: "25.5",
      backupRequired: "false",
    });

    expect(result).toEqual({
      ...validCalculationInput,
      roofAreaM2: 25.5,
    });
  });

  it.each([
    [undefined, "Vui lòng nhập tiền điện trung bình mỗi tháng."],
    ["", "Vui lòng nhập tiền điện trung bình mỗi tháng."],
    [99_999, "Tiền điện phải lớn hơn hoặc bằng 100.000 đồng."],
    [-1, "Tiền điện phải lớn hơn hoặc bằng 100.000 đồng."],
    [500_000_001, "Giá trị tiền điện không hợp lệ."],
    ["không-phải-số", "Giá trị tiền điện không hợp lệ."],
  ])("từ chối tiền điện %s", (monthlyBill, expectedMessage) => {
    const result = solarCalculationInputSchema.safeParse({
      ...validCalculationInput,
      monthlyBill,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(expectedMessage);
  });

  it("từ chối diện tích mái dưới 5 m²", () => {
    const result = solarCalculationInputSchema.safeParse({
      ...validCalculationInput,
      roofAreaM2: 4.9,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Diện tích mái phải từ 5 m² trở lên.",
    );
  });

  it("từ chối province trống và daytime level không hợp lệ", () => {
    expect(
      solarCalculationInputSchema.safeParse({
        ...validCalculationInput,
        province: " ",
      }).success,
    ).toBe(false);
    expect(
      solarCalculationInputSchema.safeParse({
        ...validCalculationInput,
        daytimeUsageLevel: "very-high",
      }).success,
    ).toBe(false);
    expect(
      solarCalculationInputSchema.safeParse({
        ...validCalculationInput,
        electricityType: "commercial",
      }).success,
    ).toBe(false);
  });
});

describe("customerCalculationRequestV2Schema", () => {
  it("nhận kWh 1–12 tháng mà không yêu cầu loại điện hay diện tích mái", () => {
    const parsed = customerCalculationRequestV2Schema.parse(
      validCustomerCalculationInput,
    );

    expect(parsed.energy.observations).toHaveLength(2);
    expect(parsed.site.roof).toEqual({ known: false });
    expect("electricityType" in parsed).toBe(false);
    expect(
      calculationRequestSchema.safeParse(validCustomerCalculationInput)
        .success,
    ).toBe(true);
  });

  it("giữ đúng mái nhỏ và hóa đơn nhỏ thay vì ép thành không biết", () => {
    const smallRoof = customerCalculationRequestV2Schema.safeParse({
      ...validCustomerCalculationInput,
      site: {
        ...validCustomerCalculationInput.site,
        roof: { known: true, areaM2: 2 },
      },
    });
    const smallBill = customerCalculationRequestV2Schema.safeParse({
      ...validCustomerCalculationInput,
      energy: {
        method: "money",
        amountBasis: "total_payment",
        billingContext: { kind: "standard_single_household" },
        observations: [
          { period: "2026-06", totalPaymentVnd: 50_000 },
        ],
      },
    });

    expect(smallRoof.success).toBe(true);
    expect(smallBill.success).toBe(true);
  });

  it("từ chối tháng trùng để không tính hai lần cùng một kỳ", () => {
    const result = customerCalculationRequestV2Schema.safeParse({
      ...validCustomerCalculationInput,
      energy: {
        method: "kwh",
        observations: [
          { period: "2026-06", valueKwh: 420 },
          { period: "2026-06", valueKwh: 500 },
        ],
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["energy", "observations", 1, "period"],
        }),
      ]),
    );
  });

  it("từ chối kỳ hóa đơn trong tương lai", () => {
    const result = customerCalculationRequestV2Schema.safeParse({
      ...validCustomerCalculationInput,
      energy: {
        method: "kwh",
        observations: [{ period: "9999-12", valueKwh: 420 }],
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["energy", "observations", 0, "period"],
          message: "Kỳ hóa đơn không được nằm trong tương lai.",
        }),
      ]),
    );
  });

  it("từ chối kỳ hóa đơn trước phạm vi dữ liệu được hỗ trợ", () => {
    const result = customerCalculationRequestV2Schema.safeParse({
      ...validCustomerCalculationInput,
      energy: {
        method: "kwh",
        observations: [{ period: "1999-12", valueKwh: 420 }],
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["energy", "observations", 0, "period"],
      message: "Kỳ hóa đơn phải từ 2000-01 trở đi.",
    });
  });

  it("tải thiết yếu dùng watt nguyên và chỉ hỏi khi cần dự phòng", () => {
    const result = customerCalculationRequestV2Schema.safeParse({
      ...validCustomerCalculationInput,
      site: {
        ...validCustomerCalculationInput.site,
        backup: {
          required: true,
          essentialLoadWatts: 1200.5,
          backupHours: 4,
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([
      "site",
      "backup",
      "essentialLoadWatts",
    ]);
  });
});

describe("legacyCalculationRequestSchema", () => {
  it("từ chối monthlyBill mơ hồ và chỉ nhận tiền trước VAT đã xác nhận", () => {
    expect(calculationRequestSchema.safeParse(validCalculationInput).success).toBe(
      false,
    );

    const explicitLegacyInput = {
      ...validCalculationInput,
      inputContractVersion: "legacy-v1",
      billAmountBasis: "energy_charge_before_vat",
      customerConfirmed: true,
    };

    expect(legacyCalculationRequestSchema.parse(explicitLegacyInput)).toEqual(
      explicitLegacyInput,
    );
    expect(calculationRequestSchema.safeParse(explicitLegacyInput).success).toBe(
      true,
    );
  });
});

describe("leadInputSchema", () => {
  const validLead = {
    fullName: "Nguyễn Văn An",
    phone: "0901234567",
    preferredContactTime: "morning",
    calculationId: "calculation-1",
  };

  it.each(["0901234567", "+84 901 234 567", "84.901.234.567"])(
    "chấp nhận số điện thoại Việt Nam %s",
    (phone) => {
      const result = leadInputSchema.parse({ ...validLead, phone });
      expect(result.phone).toBe("0901234567");
    },
  );

  it.each(["123456", "0201234567", "09012345678", "abc0901234567"])(
    "từ chối số điện thoại %s",
    (phone) => {
      expect(leadInputSchema.safeParse({ ...validLead, phone }).success).toBe(
        false,
      );
    },
  );

  it("chuyển field tùy chọn chỉ có khoảng trắng thành undefined", () => {
    const result = leadInputSchema.parse({
      ...validLead,
      address: "   ",
      note: "",
    });

    expect(result.address).toBeUndefined();
    expect(result.note).toBeUndefined();
  });

  it("từ chối thời gian liên hệ ngoài danh sách", () => {
    expect(
      leadInputSchema.safeParse({
        ...validLead,
        preferredContactTime: "late-night",
      }).success,
    ).toBe(false);
  });
});

describe("admin schemas", () => {
  it("chấp nhận package và settings mặc định", () => {
    expect(
      solarPackageCreateSchema.safeParse(defaultPackageInput).success,
    ).toBe(true);
    expect(
      calculationSettingsSchema.safeParse(defaultSettingsInput).success,
    ).toBe(true);
  });

  it("từ chối thứ tự tỷ lệ dùng ban ngày không tăng dần", () => {
    const result = calculationSettingsSchema.safeParse({
      ...defaultSettingsInput,
      daytimeMediumRatio: 0.2,
    });

    expect(result.success).toBe(false);
  });

  it("kiểm tra province factor và lead status", () => {
    expect(
      provinceFactorSchema.safeParse({
        code: "ho-chi-minh",
        name: "Hồ Chí Minh",
        factor: 1,
        active: true,
        displayOrder: 1,
      }).success,
    ).toBe(true);
    expect(leadStatusUpdateSchema.safeParse({ status: "won" }).success).toBe(
      true,
    );
    expect(
      leadStatusUpdateSchema.safeParse({ status: "unknown" }).success,
    ).toBe(false);
  });
});
