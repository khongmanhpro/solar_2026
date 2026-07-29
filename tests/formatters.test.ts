import { describe, expect, it } from "vitest";

import {
  formatCustomerPackageName,
  formatKwh,
  formatKwhRange,
  formatPaybackRange,
  formatPaybackYears,
  formatPercent,
  formatVnd,
} from "@/lib/formatters";

describe("formatters", () => {
  it("ẩn hậu tố quản trị khỏi tên gói hiển thị cho khách", () => {
    expect(
      formatCustomerPackageName(
        "Hybrid 1 pha 6 kW + pin 16,07 kWh — Thử nghiệm",
      ),
    ).toBe("Hybrid 1 pha 6 kW + pin 16,07 kWh");
    expect(formatCustomerPackageName("Gói hòa lưới 5 kWp")).toBe(
      "Gói hòa lưới 5 kWp",
    );
  });

  it("định dạng tiền Việt Nam không có phần thập phân", () => {
    const formatted = formatVnd(2_000_000);
    expect(formatted).toContain("2.000.000");
    expect(formatted).toContain("₫");
  });

  it("định dạng kWh và phần trăm tối đa một chữ số thập phân", () => {
    expect(formatKwh(316.84)).toBe("316,8 kWh");
    expect(formatPercent(50.44)).toBe("50,4%");
  });

  it("định dạng thời gian hoàn vốn hoặc trạng thái chưa xác định", () => {
    expect(formatPaybackYears(2.48)).toBe("2,5 năm");
    expect(formatPaybackYears(null)).toBe("Chưa xác định");
  });

  it("định dạng khoảng sản lượng và hoàn vốn theo thứ tự tăng dần", () => {
    expect(formatKwhRange(388.8, 316.84)).toBe("316,8–388,8 kWh");
    expect(formatPaybackRange(6.28, 4.14)).toBe("4,1–6,3 năm");
    expect(formatPaybackRange(null, 4.14)).toBe("Chưa xác định");
  });
});
