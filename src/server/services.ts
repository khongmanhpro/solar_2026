import {
  calculationRequestSchema,
  calculationSettingsSchema,
  calculationSettingsUpdateSchema,
  leadInputSchema,
  leadStatusUpdateSchema,
  provinceFactorSchema,
  provinceFactorUpdateSchema,
  solarPackageCreateSchema,
  solarPackageUpdateSchema,
} from "@/lib/validations";
import {
  createCalculationSourceSnapshot,
  createCalculationVersionMetadata,
  getCurrentResidentialTariffVersion,
} from "@/lib/calculation-snapshot";
import { prepareCalculationInput } from "@/lib/customer-input";
import {
  shouldRequireVerifiedCalculationData,
} from "@/lib/data-readiness";
import { recommendSolarPackages } from "@/lib/solar-recommendation";
import { TariffSelectionError } from "@/lib/tariff-selection";
import type {
  CalculationResponse,
  PersistedCalculationSnapshot,
  PreparedCalculationInput,
  SolarCalculationInput,
  SolarRecommendationResult,
} from "@/types/solar";
import { AppError, notFoundError } from "@/server/errors";
import type {
  CalculationRepository,
  CalculationSettingsRepository,
  LeadRepository,
  ProvinceFactorRepository,
  SolarPackageRepository,
} from "@/server/repositories";

function inputAtConsumptionBound(
  input: SolarCalculationInput,
  normalizedInput: CalculationResponse["normalizedInput"],
  bound: "lowerBound" | "upperBound",
): SolarCalculationInput {
  const energyCharge =
    normalizedInput.bill?.energyChargeBeforeVatEstimateVnd?.value[bound];

  return {
    ...input,
    monthlyConsumptionKwh:
      normalizedInput.monthlyConsumptionKwh.value[bound],
    monthlyBill:
      energyCharge === undefined ? input.monthlyBill : Math.round(energyCharge),
  };
}

function attachMoneyRecommendationStability(params: {
  recommendation: SolarRecommendationResult;
  input: SolarCalculationInput;
  normalizedInput: CalculationResponse["normalizedInput"];
  packages: Parameters<typeof recommendSolarPackages>[0]["packages"];
  settings: Parameters<typeof recommendSolarPackages>[0]["settings"];
  provinceFactor: number;
  allowUnapprovedTariffData: boolean;
}): SolarRecommendationResult {
  const {
    recommendation,
    input,
    normalizedInput,
    packages,
    settings,
    provinceFactor,
    allowUnapprovedTariffData,
  } = params;
  const allConversionsExact =
    normalizedInput.moneyConversions?.every((conversion) => conversion.exact) ===
    true;
  const lowerRecommendation = recommendSolarPackages({
    input: inputAtConsumptionBound(input, normalizedInput, "lowerBound"),
    packages,
    settings,
    provinceFactor,
    allowUnapprovedTariffData,
  });
  const upperRecommendation = recommendSolarPackages({
    input: inputAtConsumptionBound(input, normalizedInput, "upperBound"),
    packages,
    settings,
    provinceFactor,
    allowUnapprovedTariffData,
  });
  const lowerId = lowerRecommendation.recommendedPackage?.packageId ?? null;
  const expectedId = recommendation.recommendedPackage?.packageId ?? null;
  const upperId = upperRecommendation.recommendedPackage?.packageId ?? null;
  const stable =
    allConversionsExact &&
    expectedId !== null &&
    lowerId === expectedId &&
    upperId === expectedId;

  return {
    ...recommendation,
    recommendedPackage: stable ? recommendation.recommendedPackage : null,
    comparedPackages: stable ? recommendation.comparedPackages : [],
    recommendationStability: {
      evaluated: true,
      stable,
      lowerConsumptionPackageId: lowerId,
      expectedConsumptionPackageId: expectedId,
      upperConsumptionPackageId: upperId,
      reason: stable
        ? "Cùng một gói đứng đầu tại cả hai biên và điểm giữa của khoảng kWh."
        : allConversionsExact
          ? "Gói đứng đầu thay đổi trong khoảng kWh; cần thêm hóa đơn hoặc khảo sát trước khi đề xuất."
          : "Thành phần hóa đơn chưa được xác nhận nên không đề xuất một gói từ khoảng kWh quá rộng.",
    },
  };
}

export class CalculationService {
  constructor(
    private readonly packageRepository: SolarPackageRepository,
    private readonly settingsRepository: CalculationSettingsRepository,
    private readonly provinceRepository: ProvinceFactorRepository,
    private readonly calculationRepository: CalculationRepository,
  ) {}

  async create(rawInput: unknown): Promise<CalculationResponse> {
    const request = calculationRequestSchema.parse(rawInput);
    const allowUnapprovedTariffData =
      !shouldRequireVerifiedCalculationData();

    if ("schemaVersion" in request) {
      if (
        request.schemaVersion === "2.0.0" &&
        request.energy.method === "money"
      ) {
        throw new AppError(
          "MONEY_CONTEXT_REQUIRED",
          "Phiên bản yêu cầu cũ chưa xác nhận thành phần hóa đơn. Vui lòng tải lại biểu mẫu và chọn tình trạng hóa đơn trước khi tính.",
          422,
        );
      }

      if (request.energy.method === "invoice_ocr") {
        if (
          request.energy.observations.some(
            (observation) => !observation.customerConfirmed,
          )
        ) {
          throw new AppError(
            "OCR_NOT_CONFIRMED",
            "Vui lòng xác nhận chỉ số kWh đọc từ hóa đơn trước khi tính.",
            422,
          );
        }

        throw new AppError(
          "OCR_PIPELINE_NOT_AVAILABLE",
          "Hệ thống đọc hóa đơn đáng tin cậy chưa được kích hoạt. Hãy nhập kWh trên hóa đơn để tiếp tục.",
          422,
        );
      }
    }

    // This is the only public-request normalization point. Downstream code
    // receives the same canonical input and the same provenance snapshot.
    let prepared: PreparedCalculationInput;
    try {
      prepared = prepareCalculationInput(
        request,
        getCurrentResidentialTariffVersion(),
        {
          allowUnapprovedTariffData,
        },
      );
    } catch (error: unknown) {
      if (error instanceof TariffSelectionError) {
        const unavailableInProduction =
          error.code === "TARIFF_UNAPPROVED" ||
          error.code === "VAT_RULE_UNAPPROVED";
        throw new AppError(
          error.code,
          error.message,
          unavailableInProduction ? 503 : 422,
        );
      }

      if (
        error instanceof RangeError &&
        "schemaVersion" in request &&
        request.energy.method === "money"
      ) {
        throw new AppError(
          "BILL_COMPONENTS_INCONSISTENT",
          error.message,
          422,
        );
      }

      throw error;
    }
    const input = prepared.input;

    const [packages, settings, provinces] = await Promise.all([
      this.packageRepository.list(true),
      this.settingsRepository.get(),
      this.provinceRepository.list(true),
    ]);
    const province = provinces.find((item) => item.code === input.province);

    if (!settings) {
      throw new AppError(
        "SETTINGS_NOT_CONFIGURED",
        "Cấu hình tính toán chưa được thiết lập.",
        503,
      );
    }

    if (!province) {
      throw new AppError(
        "INVALID_PROVINCE",
        "Tỉnh hoặc thành phố không hợp lệ hoặc đang tạm ngừng.",
        422,
      );
    }

    const createdAt = new Date();
    const sourceSnapshot = createCalculationSourceSnapshot({
      input,
      normalizedInput: prepared.normalizedInput,
      customerInput: prepared.customerInput,
      packages,
      settings,
      province,
      provinceFactors: provinces,
    });
    const metadata = createCalculationVersionMetadata(
      sourceSnapshot,
      createdAt,
    );

    if (
      shouldRequireVerifiedCalculationData() &&
      !metadata.dataReadiness.readyForProduction
    ) {
      throw new AppError(
        "CALCULATION_DATA_NOT_VERIFIED",
        "Dữ liệu tính toán chưa được xác minh để sử dụng chính thức.",
        503,
      );
    }

    let recommendation = recommendSolarPackages({
      input,
      packages,
      settings,
      provinceFactor: province.factor,
      allowUnapprovedTariffData,
    });
    if (prepared.normalizedInput.moneyConversions?.length) {
      recommendation = attachMoneyRecommendationStability({
        recommendation,
        input,
        normalizedInput: prepared.normalizedInput,
        packages,
        settings,
        provinceFactor: province.factor,
        allowUnapprovedTariffData,
      });
    }
    const persistedSnapshot: PersistedCalculationSnapshot = {
      ...recommendation,
      metadata,
      sourceSnapshot,
    };
    const calculation = await this.calculationRepository.create(
      input,
      recommendation.recommendedPackage?.packageId ?? null,
      persistedSnapshot,
    );

    return {
      calculationId: calculation.id,
      ...recommendation,
      metadata,
      normalizedInput: sourceSnapshot.normalizedInput,
      sourceSnapshot,
    };
  }
}

export class LeadService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly calculationRepository: CalculationRepository,
  ) {}

  async create(rawInput: unknown) {
    const input = leadInputSchema.parse(rawInput);

    if (!(await this.calculationRepository.exists(input.calculationId))) {
      throw notFoundError("kết quả tính toán");
    }

    return this.leadRepository.create(input);
  }

  async list() {
    return this.leadRepository.list();
  }

  async get(id: string) {
    const lead = await this.leadRepository.findById(id);
    if (!lead) throw notFoundError("khách hàng tiềm năng");
    return lead;
  }

  async updateStatus(id: string, rawInput: unknown) {
    const { status } = leadStatusUpdateSchema.parse(rawInput);
    return this.leadRepository.updateStatus(id, status);
  }
}

export class SolarPackageService {
  constructor(private readonly repository: SolarPackageRepository) {}

  async list(activeOnly = false) {
    return this.repository.list(activeOnly);
  }

  async get(id: string) {
    const solarPackage = await this.repository.findById(id);
    if (!solarPackage) throw notFoundError("gói sản phẩm");
    return solarPackage;
  }

  async create(rawInput: unknown) {
    return this.repository.create(solarPackageCreateSchema.parse(rawInput));
  }

  async update(id: string, rawInput: unknown) {
    await this.get(id);
    return this.repository.update(id, solarPackageUpdateSchema.parse(rawInput));
  }

  async disable(id: string) {
    await this.get(id);
    return this.repository.update(id, { active: false });
  }
}

export class CalculationSettingsService {
  constructor(private readonly repository: CalculationSettingsRepository) {}

  async get() {
    const settings = await this.repository.get();
    if (!settings) throw notFoundError("cấu hình tính toán");
    return settings;
  }

  async update(rawInput: unknown) {
    const update = calculationSettingsUpdateSchema.parse(rawInput);
    const current = await this.get();
    const merged = { ...current, ...update };
    calculationSettingsSchema.parse({
      averageElectricityPriceVndPerKwh:
        merged.averageElectricityPriceVndPerKwh,
      batteryRoundTripEfficiency: merged.batteryRoundTripEfficiency,
      batteryDailyCycleFactor: merged.batteryDailyCycleFactor,
      lowEstimateFactor: merged.lowEstimateFactor,
      highEstimateFactor: merged.highEstimateFactor,
      systemLifetimeYears: merged.systemLifetimeYears,
      maintenanceRatePerYear: merged.maintenanceRatePerYear,
      daytimeLowRatio: merged.daytimeLowRatio,
      daytimeMediumRatio: merged.daytimeMediumRatio,
      daytimeHighRatio: merged.daytimeHighRatio,
      zaloUrl: merged.zaloUrl,
      hotline: merged.hotline,
      businessName: merged.businessName,
    });
    return this.repository.update(update);
  }
}

export class ProvinceFactorService {
  constructor(private readonly repository: ProvinceFactorRepository) {}

  async list(activeOnly = false) {
    return this.repository.list(activeOnly);
  }

  async create(rawInput: unknown) {
    return this.repository.create(provinceFactorSchema.parse(rawInput));
  }

  async update(id: string, rawInput: unknown) {
    return this.repository.update(
      id,
      provinceFactorUpdateSchema.parse(rawInput),
    );
  }
}
