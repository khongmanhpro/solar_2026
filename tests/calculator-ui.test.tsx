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

const demoGovernance = {
  dataStatus: "demo",
  dataVersion: "demo-ui-fixture",
  sourceReference: "tests/calculator-ui.test.tsx",
  dataOwner: "test",
  effectiveFrom: null,
  effectiveTo: null,
  approvedBy: null,
  approvedAt: null,
} as const;

const province = {
  ...demoGovernance,
  id: "province-hcm",
  code: "ho-chi-minh",
  name: "TP. Hồ Chí Minh",
  factor: 1.08,
  active: true,
  displayOrder: 1,
};

const calculationSettings = {
  ...demoGovernance,
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
  ...demoGovernance,
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

const trialPackage = {
  ...solarPackage,
  id: "trial-package",
  code: "GT-1P-5K-R730",
  name: "Gói thị trường — Thử nghiệm",
  dataStatus: "draft",
  dataVersion: "market-data-trial-fixture-v1",
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

async function completeSimpleHomeStep(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.selectOptions(
    screen.getByLabelText("Tỉnh hoặc thành phố lắp đặt"),
    province.code,
  );
  await user.click(
    screen.getByRole("radio", { name: /Hầu như không có người ở nhà/ }),
  );
  await user.click(
    screen.getByRole("radio", { name: "Không biết diện tích mái" }),
  );
  await user.click(screen.getByRole("radio", { name: "Không cần" }));
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await screen.findByRole("heading", { name: "Kiểm tra trước khi tính" });
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
                inputContractVersion: "2.1.0",
                energyInputMethod: "kwh",
                inputMonthCount: 2,
                monthlyConsumptionKwh: 500,
                monthlyBill: 2_000_000,
                electricityType: "residential",
                province: province.code,
                daytimeUsageLevel: "medium",
                roofAreaM2: null,
                backupRequired: true,
                essentialLoadWatts: null,
                backupHours: null,
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

  it("chia biểu mẫu thành từng bước và hiển thị lỗi tiếng Việt tại trường cần sửa", async () => {
    const user = userEvent.setup();
    render(<SolarCalculator />);

    await screen.findByRole("radio", { name: /Nhập số điện/ });
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(screen.getByText("Vui lòng chọn cách cung cấp mức dùng điện.")).toBeTruthy();

    await user.click(screen.getByRole("radio", { name: /Nhập số điện/ }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(screen.getByText("Vui lòng nhập số kWh của tháng này.")).toBeTruthy();

    await user.type(screen.getByLabelText("Số điện trên hóa đơn"), "450");
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(await screen.findByLabelText("Tỉnh hoặc thành phố lắp đặt")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(screen.getByText("Vui lòng chọn tỉnh hoặc thành phố.")).toBeTruthy();
    expect(screen.getByText("Vui lòng chọn thói quen sử dụng điện ban ngày.")).toBeTruthy();
    expect(screen.getByText("Vui lòng chọn có biết diện tích mái hay không.")).toBeTruthy();
    expect(screen.getByText("Vui lòng chọn nhu cầu điện dự phòng.")).toBeTruthy();
  });

  it("chặn kỳ hóa đơn tương lai ngay tại bước điện năng", async () => {
    const user = userEvent.setup();
    render(<SolarCalculator />);

    await screen.findByRole("radio", { name: /Nhập số điện/ });
    await user.click(screen.getByRole("radio", { name: /Nhập số điện/ }));
    fireEvent.change(screen.getByLabelText(/Kỳ hóa đơn/), {
      target: { value: "9999-12" },
    });
    await user.type(screen.getByLabelText("Số điện trên hóa đơn"), "450");
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(
      screen.getByText("Kỳ hóa đơn không được nằm trong tương lai."),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Tỉnh hoặc thành phố lắp đặt")).toBeNull();
  });

  it("hiển thị cảnh báo giá dễ hiểu mà không lộ nhãn quản trị", async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/provinces")) return jsonResponse([province]);
      if (url.endsWith("/api/packages")) return jsonResponse([trialPackage]);
      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<SolarCalculator />);

    expect(
      await screen.findByText(
        "Thông tin giá và cấu hình của 1 gói điện mặt trời",
      ),
    ).toBeTruthy();
    expect(screen.getByText(/sai số dự kiến ±15%/)).toBeTruthy();
    expect(screen.queryByText(/thử nghiệm/i)).toBeNull();
    expect(screen.queryByText(/market-data-trial-fixture-v1/)).toBeNull();
  });

  it("gửi hợp đồng V2 từ kWh trực tiếp, giữ null cho dữ liệu chưa biết và giữ mã calculation", async () => {
    const user = userEvent.setup();
    render(<SolarCalculator />);

    await screen.findByRole("radio", { name: /Nhập số điện/ });
    await user.click(screen.getByRole("radio", { name: /Nhập số điện/ }));
    await user.type(screen.getByLabelText("Số điện trên hóa đơn"), "450");
    await user.click(screen.getByRole("button", { name: "+ Thêm một tháng" }));
    await user.type(screen.getAllByLabelText("Số điện trên hóa đơn")[1], "550");
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    await user.selectOptions(screen.getByLabelText("Tỉnh hoặc thành phố lắp đặt"), province.code);
    await user.click(screen.getByRole("radio", { name: /Có người ở nhà một phần ngày/ }));
    await user.click(screen.getByRole("radio", { name: "Không biết diện tích mái" }));
    await user.click(screen.getByRole("radio", { name: "Có, cần dự phòng" }));
    expect(screen.getByLabelText("Tổng công suất thiết bị thiết yếu")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(await screen.findByRole("heading", { name: "Kiểm tra trước khi tính" })).toBeTruthy();
    expect(screen.getByText(/Trung bình 500 kWh\/tháng/)).toBeTruthy();
    expect(screen.getByText(/Chưa biết — cần khảo sát/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Xác nhận và tính phương án" }));

    await screen.findAllByText(solarPackage.name);
    expect(screen.getAllByText(/calculation-123/).length).toBeGreaterThan(0);
    expect(screen.getByText(/kWh được nhập trực tiếp/)).toBeTruthy();
    expect(screen.getByText(/Chưa có diện tích mái/)).toBeTruthy();
    expect(screen.queryByText("Phiên bản thuật toán")).toBeNull();
    expect(screen.queryByText("Phiên bản dữ liệu")).toBeNull();

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
        "calculator_method_selected",
        "calculator_step_completed",
        "calculator_review_viewed",
        "calculation_completed",
        "package_selected",
        "survey_form_opened",
        "survey_submitted",
      ]),
    );
    for (const event of window.dataLayer ?? []) {
      expect(event).not.toHaveProperty("calculationId");
      expect(event).not.toHaveProperty("leadId");
    }

    const calculationCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => String(input).endsWith("/api/calculations"));
    expect(JSON.parse(String(calculationCall?.[1]?.body))).toMatchObject({
      schemaVersion: "2.1.0",
      energy: {
        method: "kwh",
        observations: [{ valueKwh: 450 }, { valueKwh: 550 }],
      },
      site: {
        province: province.code,
        daytimeBehavior: "some_daytime_use",
        roof: { known: false },
        backup: {
          required: true,
          essentialLoadWatts: null,
          backupHours: null,
        },
      },
    });
    expect(JSON.parse(String(calculationCall?.[1]?.body))).not.toHaveProperty("electricityType");
  });

  it("yêu cầu kỳ hóa đơn và bối cảnh trước khi tiếp tục với tổng tiền", async () => {
    const user = userEvent.setup();
    render(<SolarCalculator />);

    await screen.findByRole("radio", { name: /Nhập tổng tiền/ });
    await user.click(screen.getByRole("radio", { name: /Nhập tổng tiền/ }));
    await user.type(screen.getByLabelText("Tổng tiền đã thanh toán"), "2000000");
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(
      screen.getByText("Vui lòng chọn kỳ hóa đơn để áp dụng đúng biểu giá và VAT."),
    ).toBeTruthy();
    expect(
      screen.getByText("Vui lòng chọn trường hợp phù hợp với hóa đơn."),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Tỉnh hoặc thành phố lắp đặt")).toBeNull();
  });

  it("gửi tổng tiền theo bối cảnh một hộ tiêu chuẩn", async () => {
    const user = userEvent.setup();
    render(<SolarCalculator />);

    await screen.findByRole("radio", { name: /Nhập tổng tiền/ });
    await user.click(screen.getByRole("radio", { name: /Nhập tổng tiền/ }));
    fireEvent.change(screen.getByLabelText(/Kỳ hóa đơn/), {
      target: { value: "2026-06" },
    });
    await user.type(screen.getByLabelText("Tổng tiền đã thanh toán"), "2000000");
    await user.click(
      screen.getByRole("radio", {
        name: /Một hộ, kỳ bình thường, chỉ gồm tiền điện và VAT/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await completeSimpleHomeStep(user);

    expect(
      screen.getByText("Một hộ, kỳ bình thường, chỉ gồm tiền điện và VAT"),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Xác nhận và tính phương án" }),
    );
    await screen.findAllByText(solarPackage.name);

    const calculationCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => String(input).endsWith("/api/calculations"));
    expect(JSON.parse(String(calculationCall?.[1]?.body))).toMatchObject({
      schemaVersion: "2.1.0",
      energy: {
        method: "money",
        amountBasis: "total_payment",
        billingContext: { kind: "standard_single_household" },
        observations: [{ period: "2026-06", totalPaymentVnd: 2_000_000 }],
      },
    });
  });

  it("chỉ mở và gửi các trường nâng cao khi khách biết thông tin khác", async () => {
    const user = userEvent.setup();
    render(<SolarCalculator />);

    await screen.findByRole("radio", { name: /Nhập tổng tiền/ });
    await user.click(screen.getByRole("radio", { name: /Nhập tổng tiền/ }));
    fireEvent.change(screen.getByLabelText(/Kỳ hóa đơn/), {
      target: { value: "2026-06" },
    });
    await user.type(screen.getByLabelText("Tổng tiền đã thanh toán"), "2000000");
    expect(screen.queryByLabelText("Số hộ dùng chung công tơ")).toBeNull();

    await user.click(
      screen.getByRole("radio", { name: /Có thông tin khác trên hóa đơn/ }),
    );
    await user.type(screen.getByLabelText("Số hộ dùng chung công tơ"), "2");
    await user.type(
      screen.getByLabelText("Khoản khác ngoài tiền điện và VAT"),
      "0",
    );
    await user.click(screen.getByRole("radio", { name: "Số ngày thay đổi" }));
    await user.type(screen.getByLabelText("Số ngày thực tế trên hóa đơn"), "35");
    await user.type(screen.getByLabelText("Số ngày kỳ chuẩn tham chiếu"), "30");
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await completeSimpleHomeStep(user);
    await user.click(
      screen.getByRole("button", { name: "Xác nhận và tính phương án" }),
    );
    await screen.findAllByText(solarPackage.name);

    const calculationCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => String(input).endsWith("/api/calculations"));
    expect(JSON.parse(String(calculationCall?.[1]?.body))).toMatchObject({
      energy: {
        method: "money",
        billingContext: {
          kind: "known",
          householdCount: 2,
          otherChargesVnd: 0,
          periodAdjustment: {
            kind: "custom",
            billingDays: 35,
            referenceDays: 30,
          },
        },
      },
    });
  });

  it("gửi trạng thái không chắc và giải thích khả năng trả khoảng rộng", async () => {
    const user = userEvent.setup();
    render(<SolarCalculator />);

    await screen.findByRole("radio", { name: /Nhập tổng tiền/ });
    await user.click(screen.getByRole("radio", { name: /Nhập tổng tiền/ }));
    fireEvent.change(screen.getByLabelText(/Kỳ hóa đơn/), {
      target: { value: "2026-06" },
    });
    await user.type(screen.getByLabelText("Tổng tiền đã thanh toán"), "2000000");
    await user.click(screen.getByRole("radio", { name: /Tôi không chắc/ }));
    expect(screen.getByText(/Kết quả sẽ hiển thị khoảng kWh rộng hơn/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await completeSimpleHomeStep(user);
    await user.click(
      screen.getByRole("button", { name: "Xác nhận và tính phương án" }),
    );
    await screen.findAllByText(solarPackage.name);

    const calculationCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) => String(input).endsWith("/api/calculations"));
    expect(JSON.parse(String(calculationCall?.[1]?.body))).toMatchObject({
      energy: {
        method: "money",
        billingContext: { kind: "unknown" },
      },
    });
  });

  it("hiển thị đường tích hợp hóa đơn nhưng không giả lập tải lên hoặc OCR", async () => {
    const user = userEvent.setup();
    render(<SolarCalculator />);

    await screen.findByRole("radio", { name: /Tải hóa đơn/ });
    await user.click(screen.getByRole("radio", { name: /Tải hóa đơn/ }));

    expect(screen.getByText("Đọc hóa đơn tự động chưa sẵn sàng")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tải ảnh hoặc PDF — chưa khả dụng" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByLabelText(/chọn tệp/i)).toBeNull();
    expect(
      vi.mocked(fetch).mock.calls.some(([input]) => String(input).endsWith("/api/calculations")),
    ).toBe(false);
  });

  it("giữ kết quả cũ và yêu cầu cập nhật khi khách sửa dữ liệu", async () => {
    const user = userEvent.setup();
    render(<SolarCalculator />);

    await screen.findByRole("radio", { name: /Nhập số điện/ });
    await user.click(screen.getByRole("radio", { name: /Nhập số điện/ }));
    await user.type(screen.getByLabelText("Số điện trên hóa đơn"), "500");
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.selectOptions(screen.getByLabelText("Tỉnh hoặc thành phố lắp đặt"), province.code);
    await user.click(screen.getByRole("radio", { name: /Thường có người ở nhà/ }));
    await user.click(screen.getByRole("radio", { name: "Không biết diện tích mái" }));
    await user.click(screen.getByRole("radio", { name: "Không cần" }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận và tính phương án" }));

    await screen.findAllByText(/calculation-123/);
    await user.click(screen.getAllByRole("button", { name: "Sửa" })[0]);
    const kwhInput = screen.getByLabelText("Số điện trên hóa đơn");
    await user.clear(kwhInput);
    await user.type(kwhInput, "650");

    expect(screen.getByText("Thông tin đã thay đổi — Cập nhật kết quả")).toBeTruthy();
    expect(screen.getAllByText(/calculation-123/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Kết quả này đang theo thông tin cũ/)).toBeTruthy();
    expect(screen.queryByLabelText("Số điện thoại")).toBeNull();
    expect(screen.queryByRole("link", { name: "Tư vấn qua Zalo" })).toBeNull();
    expect(window.dataLayer?.some((entry) => entry.event === "calculator_input_changed_after_result")).toBe(true);
  });

  it("hướng dẫn rõ ràng khi thiếu dữ liệu biểu đồ hoặc không có gói phù hợp", () => {
    render(<CashFlowChart breakEvenYear={null} data={[]} />);
    expect(screen.getByText("Chưa có dữ liệu dòng tiền")).toBeTruthy();

    cleanup();
    // Simulate a persisted MVP response created before Phase 0 metadata existed.
    const noPackageResult = {
      calculationId: "calculation-empty",
      recommendedPackage: null,
      comparedPackages: [],
      inputSummary: {} as CalculationResponse["inputSummary"],
      assumptions: calculationSettings,
    } as unknown as CalculationResponse;
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
