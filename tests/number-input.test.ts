import { describe, expect, it } from "vitest";

import {
  formatDecimalForDisplay,
  formatMoneyInput,
  normalizeDecimalInput,
  normalizeMoneyInput,
} from "@/lib/number-input";

describe("Vietnamese number input", () => {
  it.each([
    ["1.500.000", "1500000"],
    ["1,500,000", "1500000"],
    ["1 500 000 đ", "1500000"],
    ["1500000", "1500000"],
    ["0600000", "600000"],
    ["", ""],
  ])("money %s -> %s", (raw, expected) => {
    expect(normalizeMoneyInput(raw)).toBe(expected);
  });

  it("formats money with dots as thousands separators", () => {
    expect(formatMoneyInput("1500000")).toBe("1.500.000");
    expect(formatMoneyInput("600000")).toBe("600.000");
    expect(formatMoneyInput("950")).toBe("950");
    expect(formatMoneyInput("")).toBe("");
  });

  it.each([
    ["450", "450"],
    ["450,5", "450.5"],
    ["450.5", "450.5"],
    ["1.200", "1200"],
    ["1.200.000", "1200000"],
    ["12,5 m²", "12.5"],
    [" 40 ", "40"],
    ["1.200,5", "1200.5"],
    ["1,200.5", "1200.5"],
    ["12,500", "12.5"],
    ["1,500", "1.5"],
    ["1,200,000", "1200000"],
    ["-50", "-50"],
    [" -1.200", "-1200"],
  ])("decimal %s -> %s", (raw, expected) => {
    expect(Number(normalizeDecimalInput(raw))).toBe(Number(expected));
  });

  it("echoes normalised decimals in Vietnamese format", () => {
    expect(formatDecimalForDisplay("1200.5")).toBe("1.200,5");
    expect(formatDecimalForDisplay("12.5")).toBe("12,5");
    expect(formatDecimalForDisplay("")).toBe("");
  });
});
