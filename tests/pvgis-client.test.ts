import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchPvgisMonthlyYield,
  PVGIS_PVCALC_URL,
} from "@/lib/pvgis-client";

describe("PVGIS client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses 12 monthly values and keeps the PVGIS radiation database", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            inputs: { meteo_data: { radiation_db: "PVGIS-ERA5" } },
            outputs: {
              monthly: {
                fixed: Array.from({ length: 12 }, (_, index) => ({
                  month: index + 1,
                  E_m: 100 + index,
                })),
              },
              totals: { fixed: { E_y: 1266 } },
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await fetchPvgisMonthlyYield({
      latitude: 10.8,
      longitude: 106.6,
    });

    expect(result.monthlyYieldKwhPerKwp).toHaveLength(12);
    expect(result.monthlyYieldKwhPerKwp[0]).toBe(100);
    expect(result.yearlyYieldKwhPerKwp).toBe(1266);
    expect(result.radiationDatabase).toBe("PVGIS-ERA5");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining(`${PVGIS_PVCALC_URL}?`),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects a response without a complete monthly series", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            outputs: { monthly: { fixed: [] }, totals: { fixed: { E_y: 0 } } },
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      fetchPvgisMonthlyYield({ latitude: 10.8, longitude: 106.6 }),
    ).rejects.toThrow("PVGIS trả về dữ liệu sản lượng tháng không hợp lệ");
  });
});
