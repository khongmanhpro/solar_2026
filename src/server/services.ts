import { calculationSettingsSchema, calculationSettingsUpdateSchema, leadInputSchema, leadStatusUpdateSchema, provinceFactorSchema, provinceFactorUpdateSchema, solarCalculationInputSchema, solarPackageCreateSchema, solarPackageUpdateSchema } from "@/lib/validations";
import { recommendSolarPackages } from "@/lib/solar-recommendation";
import type { CalculationResponse } from "@/types/solar";
import { AppError, notFoundError } from "@/server/errors";
import type {
  CalculationRepository,
  CalculationSettingsRepository,
  LeadRepository,
  ProvinceFactorRepository,
  SolarPackageRepository,
} from "@/server/repositories";

export class CalculationService {
  constructor(
    private readonly packageRepository: SolarPackageRepository,
    private readonly settingsRepository: CalculationSettingsRepository,
    private readonly provinceRepository: ProvinceFactorRepository,
    private readonly calculationRepository: CalculationRepository,
  ) {}

  async create(rawInput: unknown): Promise<CalculationResponse> {
    const input = solarCalculationInputSchema.parse(rawInput);
    const [packages, settings, province] = await Promise.all([
      this.packageRepository.list(true),
      this.settingsRepository.get(),
      this.provinceRepository.findActiveByCode(input.province),
    ]);

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

    const recommendation = recommendSolarPackages({
      input,
      packages,
      settings,
      provinceFactor: province.factor,
    });
    const calculation = await this.calculationRepository.create(
      input,
      recommendation.recommendedPackage?.packageId ?? null,
      recommendation,
    );

    return { calculationId: calculation.id, ...recommendation };
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
    calculationSettingsSchema.parse({ ...current, ...update });
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
