import { describe, expect, it } from "vitest";

import { DEFAULT_CALCULATION_SETTINGS, DEFAULT_SOLAR_PACKAGES } from "@/config/defaults";
import {
  calculationSettingsSchema,
  leadInputSchema,
  leadStatusUpdateSchema,
  provinceFactorSchema,
  solarCalculationInputSchema,
  solarPackageCreateSchema,
} from "@/lib/validations";

const validCalculationInput = {
  monthlyBill: 2_000_000,
  electricityType: "residential",
  province: "ho-chi-minh",
  daytimeUsageLevel: "high",
  roofAreaM2: 25,
  backupRequired: false,
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
      solarPackageCreateSchema.safeParse(DEFAULT_SOLAR_PACKAGES[0]).success,
    ).toBe(true);
    expect(
      calculationSettingsSchema.safeParse(DEFAULT_CALCULATION_SETTINGS).success,
    ).toBe(true);
  });

  it("từ chối thứ tự tỷ lệ dùng ban ngày không tăng dần", () => {
    const result = calculationSettingsSchema.safeParse({
      ...DEFAULT_CALCULATION_SETTINGS,
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
