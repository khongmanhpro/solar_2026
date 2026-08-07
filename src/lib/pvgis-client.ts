export const PVGIS_API_VERSION = "5.3";
export const PVGIS_API_PATH_VERSION = PVGIS_API_VERSION.replace(".", "_");
export const PVGIS_PVCALC_URL =
  `https://re.jrc.ec.europa.eu/api/v${PVGIS_API_PATH_VERSION}/PVcalc`;
export const PVGIS_SYSTEM_LOSS_PERCENT = 14;

interface PvgisMonthlyRow {
  month: number;
  E_m: number;
}

interface PvgisResponse {
  inputs?: {
    meteo_data?: {
      radiation_db?: string;
    };
  };
  outputs?: {
    monthly?: {
      fixed?: PvgisMonthlyRow[];
    };
    totals?: {
      fixed?: {
        E_y?: number;
      };
    };
  };
  errors?: string[];
}

export interface PvgisMonthlyYield {
  monthlyYieldKwhPerKwp: number[];
  yearlyYieldKwhPerKwp: number;
  radiationDatabase: string;
}

export interface PvgisRequestOptions {
  latitude: number;
  longitude: number;
  timeoutMs?: number;
}

export async function fetchPvgisMonthlyYield({
  latitude,
  longitude,
  timeoutMs = 20_000,
}: PvgisRequestOptions): Promise<PvgisMonthlyYield> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    peakpower: "1",
    loss: String(PVGIS_SYSTEM_LOSS_PERCENT),
    pvtechchoice: "crystSi",
    mountingplace: "building",
    optimalangles: "1",
    usehorizon: "1",
    outputformat: "json",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${PVGIS_PVCALC_URL}?${params}`, {
      signal: controller.signal,
    });
    const payload = (await response.json()) as PvgisResponse;

    if (!response.ok) {
      throw new Error(
        `PVGIS HTTP ${response.status}: ${payload.errors?.join("; ") ?? "unknown error"}`,
      );
    }

    const monthlyRows = payload.outputs?.monthly?.fixed ?? [];
    const monthlyYieldKwhPerKwp = monthlyRows
      .sort((first, second) => first.month - second.month)
      .map((row) => row.E_m);
    const yearlyYieldKwhPerKwp = payload.outputs?.totals?.fixed?.E_y;

    if (
      monthlyYieldKwhPerKwp.length !== 12 ||
      monthlyYieldKwhPerKwp.some(
        (value) => !Number.isFinite(value) || value < 0,
      ) ||
      typeof yearlyYieldKwhPerKwp !== "number" ||
      !Number.isFinite(yearlyYieldKwhPerKwp) ||
      yearlyYieldKwhPerKwp <= 0
    ) {
      throw new Error("PVGIS trả về dữ liệu sản lượng tháng không hợp lệ.");
    }

    return {
      monthlyYieldKwhPerKwp,
      yearlyYieldKwhPerKwp,
      radiationDatabase: payload.inputs?.meteo_data?.radiation_db ?? "unknown",
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`PVGIS request timed out at ${latitude},${longitude}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
