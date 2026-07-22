// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SolarCalculator } from "@/components/calculator/SolarCalculator";
import { CalculationPreview } from "@/components/calculator/CalculationPreview";
import { CashFlowChart } from "@/components/calculator/CashFlowChart";
import { LeadForm } from "@/components/calculator/LeadForm";
import type { CalculationResponse } from "@/types/solar";

const province = {
  id: "province-hcm",
  code: "ho-chi-minh",
  name: "TP. Hồ Chí Minh",
  factor: 1.08,
  active: true,
  displayOrder: 1,
};

const calculationSettings = {
  averageElectricityPriceVndPerKwh: 3_000,
  batteryRoundTripEfficiency: 0.9,
  batteryDailyCycleFactor: 0.8,
  lowEstimateFactor: 0.85,
  highEstimateFactor: 1.15,
  systemLifetimeYears: 20,
  maintenanceRatePerYear: 0,
  daytimeLowRatio: 0.3,
  daytimeMediumRatio: 0.5,
  daytimeHighRatio: 0.7,
  zaloUrl: "https://zalo.me/0901234567",
  hotline: "0901 234 567",
  businessName: "Solar Plan",
};

const solarPackage = {
  id: "package-fit-3",
  code: "FIT-3KWP",
  name: "Gói hòa lưới 3 kWp",
  description: "Gói mẫu",
  priceVnd: 45_000_000,
  capacityKwp: 3,
  baseMonthlyGenerationKwh: 360,
  requiredRoofAreaM2: 18,
  systemType: "grid-tied",
  batteryCapacityKwh: 0,
  equipmentSummary: "Tấm pin và inverter",
  panelBrand: "Solar",
  panelModel: "S1",
  inverterBrand: "Solar",
  inverterModel: "I1",
  panelWarrantyYears: 12,
  inverterWarrantyYears: 10,
  active: true,
  displayOrder: 1,
};

const alternativePackage = {
  ...solarPackage,
  id: "package-save-2",
  code: "SAVE-2KWP",
  name: "Gói tiết kiệm 2 kWp",
  priceVnd: 28_000_000,
  capacityKwp: 2,
  baseMonthlyGenerationKwh: 240,
  requiredRoofAreaM2: 12,
  inverterModel: "I2",
  displayOrder: 2,
};

const standardScenario = {
  adjustedGenerationKwh: 388.8,
  solarSurplusKwh: 88.8,
  directSolarUseKwh: 300,
  batteryUseKwh: 0,
  totalSolarUseKwh: 300,
  gridConsumptionAfterSolarKwh: 200,
  monthlySavingsVnd: 900_000,
  billAfterSolarVnd: 1_100_000,
  reductionPercent: 45,
  yearlySavingsVnd: 10_800_000,
  paybackMonths: 50,
  paybackYears: 4.2,
  selfConsumptionRate: 0.77,
};

const recommendation = {
  ...standardScenario,
  packageId: solarPackage.id,
  estimatedMonthlyConsumptionKwh: 600,
  daytimeDemandKwh: 300,
  lowEstimate: {
    ...standardScenario,
    adjustedGenerationKwh: 330.5,
    monthlySavingsVnd: 780_000,
    yearlySavingsVnd: 9_360_000,
    paybackYears: 5.1,
  },
  highEstimate: {
    ...standardScenario,
    adjustedGenerationKwh: 447.1,
    monthlySavingsVnd: 1_000_000,
    yearlySavingsVnd: 12_000_000,
    paybackYears: 3.8,
  },
  cashFlow: Array.from({ length: 21 }, (_, year) => ({
    year,
    cumulativeCashFlowVnd: -45_000_000 + 10_800_000 * year,
  })),
  breakEvenYear: 5,
  longTermSavings: {
    saving5YearsVnd: 54_000_000,
    saving10YearsVnd: 108_000_000,
    saving20YearsVnd: 216_000_000,
  },
  score: 84,
  scoreBreakdown: {
    targetGenerationKwh: 360,
    generationFitScore: 92,
    selfUseScore: 77,
    paybackScore: 79,
  },
};

const alternativeResult = {
  ...recommendation,
  ...standardScenario,
  packageId: alternativePackage.id,
  adjustedGenerationKwh: 259.2,
  monthlySavingsVnd: 650_000,
  yearlySavingsVnd: 7_800_000,
  billAfterSolarVnd: 1_350_000,
  reductionPercent: 32.5,
  lowEstimate: {
    ...recommendation.lowEstimate,
    adjustedGenerationKwh: 220.3,
    paybackYears: 4.8,
  },
  highEstimate: {
    ...recommendation.highEstimate,
    adjustedGenerationKwh: 298.1,
    paybackYears: 3.6,
  },
  cashFlow: Array.from({ length: 21 }, (_, year) => ({
    year,
    cumulativeCashFlowVnd: -28_000_000 + 7_800_000 * year,
  })),
  breakEvenYear: 4,
  longTermSavings: {
    saving5YearsVnd: 39_000_000,
    saving10YearsVnd: 78_000_000,
    saving20YearsVnd: 156_000_000,
  },
  score: 72,
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("SolarCalculator", () => {
  beforeEach(() => {
    window.dataLayer = [];
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    Element.prototype.scrollIntoView = vi.fn();
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 1;
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/provinces")) return jsonResponse([province]);
        if (url.endsWith("/api/packages")) {
          return jsonResponse([solarPackage, alternativePackage]);
        }
        if (url.endsWith("/api/calculations")) {
          return jsonResponse(
            {
              calculationId: "calculation-123",
              recommendedPackage: recommendation,
              comparedPackages: [recommendation, alternativeResult],
              inputSummary: {
                monthlyBill: 2_000_000,
                electricityType: "residential",
                province: province.code,
                daytimeUsageLevel: "medium",
                roofAreaM2: 30,
                backupRequired: false,
              },
              assumptions: calculationSettings,
            },
            201,
          );
        }
        if (url.endsWith("/api/leads")) {
          return jsonResponse({ id: "lead-123", status: "new" }, 201);
        }
        throw new Error(`Unexpected URL: ${url}`);
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("hiển thị lỗi tiếng Việt khi gửi form trống", async () => {
    const user = userEvent.setup();
    render(<SolarCalculator />);

    await screen.findByRole("option", { name: province.name });
    await user.click(screen.getByRole("button", { name: "Tính phương án phù hợp" }));

    expect(screen.getByText("Vui lòng nhập tiền điện trung bình mỗi tháng.")).toBeTruthy();
    expect(screen.getByText("Vui lòng chọn tỉnh hoặc thành phố.")).toBeTruthy();
    expect(screen.getByText("Vui lòng nhập diện tích mái.")).toBeTruthy();
  });

  it("gửi dữ liệu hợp lệ và giữ mã calculation trong kết quả", async () => {
    const user = userEvent.setup();
    render(<SolarCalculator />);

    await screen.findByRole("option", { name: province.name });
    await user.type(screen.getByLabelText("Tiền điện trung bình mỗi tháng"), "2000000");
    await user.selectOptions(screen.getByLabelText("Tỉnh hoặc thành phố"), province.code);
    await user.click(screen.getByLabelText("Vừa"));
    await user.type(screen.getByLabelText("Diện tích mái có thể lắp"), "30");
    await user.click(screen.getByLabelText("Không cần"));
    await user.click(screen.getByRole("button", { name: "Tính phương án phù hợp" }));

    await screen.findAllByText(solarPackage.name);
    expect(screen.getAllByText(/calculation-123/).length).toBeGreaterThan(0);
    expect(screen.getByText(/5 bậc lũy tiến/)).toBeTruthy();

    await waitFor(() => {
      const fetchMock = vi.mocked(fetch);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/calculations",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const alternativeHeading = screen.getByRole("heading", {
      name: alternativePackage.name,
    });
    const alternativeCard = alternativeHeading.closest("article");
    expect(alternativeCard).not.toBeNull();
    await user.click(
      within(alternativeCard as HTMLElement).getByRole("button", {
        name: "Chọn gói này",
      }),
    );

    expect(
      screen.getAllByRole("heading", { name: alternativePackage.name }),
    ).toHaveLength(2);
    expect(
      within(alternativeCard as HTMLElement)
        .getByRole("button", { name: "Đang xem gói này" })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    await user.type(screen.getByLabelText("Họ và tên"), "Nguyễn Minh An");
    await user.type(screen.getByLabelText("Số điện thoại"), "0901234567");
    await user.click(
      screen.getByRole("button", { name: "Đăng ký khảo sát công trình" }),
    );

    expect(await screen.findByText("Đã ghi nhận yêu cầu")).toBeTruthy();
    expect(screen.getByText(/lead-123/)).toBeTruthy();
    const leadCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => String(input).endsWith("/api/leads"));
    expect(leadCall).toBeTruthy();
    expect(JSON.parse(String(leadCall?.[1]?.body))).toMatchObject({
      fullName: "Nguyễn Minh An",
      phone: "0901234567",
      preferredContactTime: "anytime",
      calculationId: "calculation-123",
    });
    expect(window.dataLayer?.map((entry) => entry.event)).toEqual(
      expect.arrayContaining([
        "calculator_started",
        "calculation_completed",
        "package_selected",
        "survey_form_opened",
        "survey_submitted",
      ]),
    );

    const calculationCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => String(input).endsWith("/api/calculations"));
    expect(JSON.parse(String(calculationCall?.[1]?.body))).toMatchObject({
      electricityType: "residential",
    });
  });

  it("hướng dẫn rõ ràng khi thiếu dữ liệu biểu đồ hoặc không có gói phù hợp", () => {
    render(<CashFlowChart breakEvenYear={null} data={[]} />);
    expect(screen.getByText("Chưa có dữ liệu dòng tiền")).toBeTruthy();

    cleanup();
    const noPackageResult: CalculationResponse = {
      calculationId: "calculation-empty",
      recommendedPackage: null,
      comparedPackages: [],
      inputSummary: {} as CalculationResponse["inputSummary"],
      assumptions: calculationSettings,
    };
    render(
      <CalculationPreview
        isSubmitting={false}
        packages={[]}
        result={noPackageResult}
      />,
    );

    expect(screen.getByText("Chưa có gói phù hợp hoàn toàn")).toBeTruthy();
    expect(screen.getByText("Lưu ý bắt buộc")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Chuyển ước tính thành phương án thi công" })).toBeTruthy();
    const zaloLink = screen.getByRole("link", { name: "Tư vấn qua Zalo" });
    expect(zaloLink.getAttribute("href")).toBe(calculationSettings.zaloUrl);
    fireEvent.click(zaloLink);
    expect(window.dataLayer?.some((entry) => entry.event === "zalo_clicked")).toBe(
      true,
    );
    expect(
      screen.getByRole("link", { name: calculationSettings.hotline }).getAttribute("href"),
    ).toBe("tel:0901234567");
  });

  it("hiển thị lỗi lead tại đúng trường trước khi gọi API", async () => {
    const user = userEvent.setup();
    render(
      <LeadForm
        calculationId="calculation-validation"
        settings={calculationSettings}
      />,
    );

    await user.type(screen.getByLabelText("Họ và tên"), "A");
    await user.type(screen.getByLabelText("Số điện thoại"), "123456");
    await user.click(
      screen.getByRole("button", { name: "Đăng ký khảo sát công trình" }),
    );

    expect(screen.getByText("Vui lòng nhập họ và tên.")).toBeTruthy();
    expect(screen.getByText("Số điện thoại Việt Nam không hợp lệ.")).toBeTruthy();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("giữ dữ liệu lead khi gửi thất bại và cho phép thử lại", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network unavailable"));
    render(
      <LeadForm
        calculationId="calculation-failure"
        settings={calculationSettings}
      />,
    );

    await user.type(screen.getByLabelText("Họ và tên"), "Nguyễn Minh An");
    await user.type(screen.getByLabelText("Số điện thoại"), "0901234567");
    await user.click(
      screen.getByRole("button", { name: "Đăng ký khảo sát công trình" }),
    );

    expect(
      await screen.findByText(
        "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText("Họ và tên").getAttribute("value")).toBe(
      "Nguyễn Minh An",
    );
    expect(
      screen.getByRole("button", { name: "Đăng ký khảo sát công trình" }),
    ).toBeTruthy();
  });
});
