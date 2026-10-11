import { describe, expect, it } from "vitest";

import {
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
  ])("decimal %s -> %s", (raw, expected) => {
    expect(normalizeDecimalInput(raw)).toBe(expected);
  });
});
