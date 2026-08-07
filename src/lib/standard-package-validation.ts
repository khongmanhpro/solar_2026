import type { SolarPackage } from "@/types/solar";
import type {
  StandardPackageDefinition,
  StandardPackageBomLine,
} from "@/types/standard-package";

export type StandardPackageIssueSeverity = "error" | "warning";

export interface StandardPackageIssue {
  packageCode: string;
  code: string;
  severity: StandardPackageIssueSeverity;
  message: string;
}

export interface StandardPackageValidationResult {
  valid: boolean;
  errors: StandardPackageIssue[];
  warnings: StandardPackageIssue[];
}

const CAPACITY_TOLERANCE_KWP = 0.001;

function issue(
  packageCode: string,
  code: string,
  severity: StandardPackageIssueSeverity,
  message: string,
): StandardPackageIssue {
  return { packageCode, code, severity, message };
}

function sumKnownBomTotals(lines: StandardPackageBomLine[]): number | null {
  if (lines.some((line) => line.totalVnd === null)) return null;
  return lines.reduce((total, line) => total + (line.totalVnd ?? 0), 0);
}

function validateBom(
  definition: StandardPackageDefinition,
): StandardPackageIssue[] {
  const issues: StandardPackageIssue[] = [];
  const { pricing } = definition;
  const totalVnd = sumKnownBomTotals(pricing.bomLines);

  if (pricing.bomComplete && totalVnd === null) {
    issues.push(
      issue(
        definition.code,
        "BOM_TOTAL_MISSING",
        "error",
        "BOM được đánh dấu đầy đủ nhưng còn dòng chưa có thành tiền.",
      ),
    );
  }

  if (
    pricing.bomComplete &&
    totalVnd !== null &&
    totalVnd !== pricing.referenceTotalVnd
  ) {
    issues.push(
      issue(
        definition.code,
        "BOM_TOTAL_MISMATCH",
        "error",
        `Tổng BOM ${totalVnd.toLocaleString("vi-VN")} đồng không khớp giá tham khảo ${pricing.referenceTotalVnd.toLocaleString("vi-VN")} đồng.`,
      ),
    );
  }

  for (const line of pricing.bomLines) {
    if (!line.detailLines?.length || line.totalVnd === null) continue;
    const detailTotal = line.detailLines.reduce(
      (total, detailLine) => total + detailLine.totalVnd,
      0,
    );
    const difference = Math.abs(detailTotal - line.totalVnd);
    const tolerance = line.detailSubtotalToleranceVnd ?? 0;
    if (difference > tolerance) {
      issues.push(
        issue(
          definition.code,
          "DETAIL_SUBTOTAL_ROUNDING_MISMATCH",
          "warning",
          `Chi tiết dòng ${line.code} lệch ${difference.toLocaleString("vi-VN")} đồng so với subtotal báo giá (dung sai đã ghi nhận: ${tolerance.toLocaleString("vi-VN")} đồng); giữ subtotal nguồn và không tự cộng lại.`,
        ),
      );
    }
  }

  return issues;
}

function addTechnicalDesignIssue(
  definition: StandardPackageDefinition,
  errors: StandardPackageIssue[],
  warnings: StandardPackageIssue[],
  code: string,
  message: string,
) {
  const severity =
    definition.technicalReview.status === "approved" ? "error" : "warning";
  const item = issue(definition.code, code, severity, message);
  if (severity === "error") {
    errors.push(item);
  } else {
    warnings.push(item);
  }
}

function validateTechnicalDesign(
  solarPackage: SolarPackage,
  definition: StandardPackageDefinition,
  errors: StandardPackageIssue[],
  warnings: StandardPackageIssue[],
) {
  const { technicalDesign } = definition;
  const actualCapacityKwp =
    (definition.panel.powerWp * definition.panel.quantity) / 1_000;
  const dcAcRatio = actualCapacityKwp / definition.inverter.powerKw;
  const { dcAcRatioPolicy, inverterElectrical, panelElectrical, stringPlan } =
    technicalDesign;

  if (
    (dcAcRatio < dcAcRatioPolicy.minimum ||
      dcAcRatio > dcAcRatioPolicy.maximum) &&
    !dcAcRatioPolicy.exceptionReason
  ) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "DC_AC_RATIO_OUTSIDE_POLICY",
      `Tỷ lệ DC/AC ${dcAcRatio.toFixed(3)} nằm ngoài dải ${dcAcRatioPolicy.minimum.toFixed(2)}–${dcAcRatioPolicy.maximum.toFixed(2)} và chưa có ngoại lệ kỹ thuật được ghi nhận.`,
    );
  }

  if (!inverterElectrical) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "INVERTER_ELECTRICAL_DATA_MISSING",
      "Chưa có giới hạn PV, MPPT, điện áp DC, dòng vào và dòng AC của inverter.",
    );
  } else if (actualCapacityKwp > inverterElectrical.maxPvKw) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "PV_ARRAY_ABOVE_INVERTER_LIMIT",
      `Dàn pin ${actualCapacityKwp.toFixed(3)} kWp vượt giới hạn PV ${inverterElectrical.maxPvKw.toFixed(3)} kW của inverter.`,
    );
  }

  if (!panelElectrical) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "PANEL_ELECTRICAL_DATA_MISSING",
      "Chưa có Voc, Vmp, Isc, Imp và hệ số nhiệt của tấm pin giao thực tế.",
    );
  }

  if (!stringPlan) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "STRING_PLAN_MISSING",
      "Chưa có sơ đồ string/MPPT và kiểm tra điện áp ở nhiệt độ biên.",
    );
  } else if (inverterElectrical && panelElectrical) {
    const panelCount = stringPlan.strings.reduce(
      (total, string) => total + string.panelCount,
      0,
    );
    if (panelCount !== definition.panel.quantity) {
      addTechnicalDesignIssue(
        definition,
        errors,
        warnings,
        "STRING_PANEL_COUNT_MISMATCH",
        `Sơ đồ string có ${panelCount} tấm nhưng cấu hình gói có ${definition.panel.quantity} tấm.`,
      );
    }

    const stringsPerMppt = new Map<number, number>();
    const inputCurrentPerMppt = new Map<number, number>();
    for (const string of stringPlan.strings) {
      if (string.mppt < 1 || string.mppt > inverterElectrical.mpptCount) {
        addTechnicalDesignIssue(
          definition,
          errors,
          warnings,
          "STRING_MPPT_OUT_OF_RANGE",
          `String đang gán vào MPPT ${string.mppt} nhưng inverter chỉ có ${inverterElectrical.mpptCount} MPPT.`,
        );
      }
      if (string.vocColdV >= inverterElectrical.maxDcVoltageV) {
        addTechnicalDesignIssue(
          definition,
          errors,
          warnings,
          "STRING_VOC_ABOVE_INVERTER_LIMIT",
          `Voc lạnh ${string.vocColdV.toFixed(1)} V phải nhỏ hơn giới hạn DC ${inverterElectrical.maxDcVoltageV.toFixed(1)} V của inverter.`,
        );
      }
      if (
        string.vmpHotV < inverterElectrical.mpptVoltageMinV ||
        string.vmpHotV > inverterElectrical.mpptVoltageMaxV
      ) {
        addTechnicalDesignIssue(
          definition,
          errors,
          warnings,
          "STRING_VMP_OUTSIDE_MPPT_RANGE",
          `Vmp nóng ${string.vmpHotV.toFixed(1)} V nằm ngoài dải MPPT ${inverterElectrical.mpptVoltageMinV.toFixed(1)}–${inverterElectrical.mpptVoltageMaxV.toFixed(1)} V.`,
        );
      }
      stringsPerMppt.set(
        string.mppt,
        (stringsPerMppt.get(string.mppt) ?? 0) + 1,
      );
      inputCurrentPerMppt.set(
        string.mppt,
        (inputCurrentPerMppt.get(string.mppt) ?? 0) + string.inputCurrentA,
      );
    }

    for (const [mppt, stringCount] of stringsPerMppt) {
      if (stringCount > inverterElectrical.stringsPerMppt) {
        addTechnicalDesignIssue(
          definition,
          errors,
          warnings,
          "TOO_MANY_STRINGS_PER_MPPT",
          `MPPT ${mppt} có ${stringCount} string, vượt giới hạn ${inverterElectrical.stringsPerMppt}.`,
        );
      }
    }

    for (const [mppt, inputCurrentA] of inputCurrentPerMppt) {
      if (inputCurrentA > inverterElectrical.maxInputCurrentPerMpptA) {
        addTechnicalDesignIssue(
          definition,
          errors,
          warnings,
          "MPPT_INPUT_CURRENT_ABOVE_LIMIT",
          `Dòng vào MPPT ${mppt} là ${inputCurrentA.toFixed(1)} A, vượt giới hạn ${inverterElectrical.maxInputCurrentPerMpptA.toFixed(1)} A.`,
        );
      }
    }
  }

  if (solarPackage.systemType !== "hybrid") return;

  const { batteryElectrical, backupPlan } = technicalDesign;
  if (!batteryElectrical) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "BATTERY_ELECTRICAL_DATA_MISSING",
      "Chưa có năng lượng dùng được, công suất xả và bảng tương thích pin–inverter.",
    );
  }
  if (!backupPlan) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "BACKUP_PLAN_MISSING",
      "Chưa có danh sách tải ưu tiên, công suất backup và thời lượng dự phòng ước tính.",
    );
  }
  if (!batteryElectrical || !backupPlan) return;

  if (!batteryElectrical.compatibleInverterModels.includes(definition.inverter.model)) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "BATTERY_INVERTER_COMPATIBILITY_MISSING",
      "Pin chưa có bằng chứng tương thích với model inverter đang cấu hình.",
    );
  }
  if (backupPlan.phase !== definition.phase) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "BACKUP_PHASE_MISMATCH",
      "Pha của phương án backup không khớp pha hệ thống.",
    );
  }
  if (backupPlan.protectedLoadKw > definition.inverter.powerKw) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "BACKUP_LOAD_ABOVE_INVERTER_POWER",
      "Tải backup đồng thời vượt công suất AC danh định của inverter.",
    );
  }
  if (backupPlan.protectedLoadKw > batteryElectrical.maxContinuousDischargeKw) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "BACKUP_LOAD_ABOVE_BATTERY_DISCHARGE_POWER",
      "Tải backup đồng thời vượt công suất xả liên tục của pin.",
    );
  }

  const calculatedHours =
    (batteryElectrical.usableKwh * batteryElectrical.dischargeEfficiency) /
    backupPlan.protectedLoadKw;
  if (Math.abs(calculatedHours - backupPlan.estimatedHours) > 0.1) {
    addTechnicalDesignIssue(
      definition,
      errors,
      warnings,
      "BACKUP_DURATION_MISMATCH",
      `Thời gian backup ghi ${backupPlan.estimatedHours.toFixed(1)} giờ không khớp ${calculatedHours.toFixed(1)} giờ tính từ năng lượng dùng được và tải ưu tiên.`,
    );
  }
}

export function validateStandardPackage(
  solarPackage: SolarPackage,
  definition: StandardPackageDefinition,
): StandardPackageValidationResult {
  const errors: StandardPackageIssue[] = [];
  const warnings: StandardPackageIssue[] = [];
  const bomIssues = validateBom(definition);
  errors.push(...bomIssues.filter((item) => item.severity === "error"));
  warnings.push(...bomIssues.filter((item) => item.severity === "warning"));
  const actualCapacityKwp =
    (definition.panel.powerWp * definition.panel.quantity) / 1_000;
  const panelCoverageAreaM2 =
    definition.panel.quantity *
    definition.panel.lengthM *
    definition.panel.widthM;

  if (
    Math.abs(actualCapacityKwp - solarPackage.capacityKwp) >
    CAPACITY_TOLERANCE_KWP
  ) {
    errors.push(
      issue(
        definition.code,
        "DC_CAPACITY_MISMATCH",
        "error",
        `Công suất từ số tấm là ${actualCapacityKwp.toFixed(3)} kWp nhưng gói đang lưu ${solarPackage.capacityKwp} kWp.`,
      ),
    );
  }

  if (solarPackage.batteryCapacityKwh !== definition.battery.nominalKwh) {
    errors.push(
      issue(
        definition.code,
        "BATTERY_CAPACITY_MISMATCH",
        "error",
        "Dung lượng pin trong cấu hình chuẩn không khớp dung lượng gói đang lưu.",
      ),
    );
  }

  if (solarPackage.systemType === "grid-tied" && definition.battery.nominalKwh > 0) {
    errors.push(
      issue(
        definition.code,
        "GRID_TIED_WITH_BATTERY",
        "error",
        "Gói hòa lưới không được khai báo pin lưu trữ danh định.",
      ),
    );
  }

  if (solarPackage.requiredRoofAreaM2 < panelCoverageAreaM2) {
    errors.push(
      issue(
        definition.code,
        "ROOF_AREA_BELOW_PANEL_COVERAGE",
        "error",
        "Diện tích mái yêu cầu không được nhỏ hơn diện tích phủ tấm pin.",
      ),
    );
  }

  if (solarPackage.priceVnd !== definition.pricing.referenceTotalVnd) {
    errors.push(
      issue(
        definition.code,
        "PRICE_MISMATCH",
        "error",
        "Giá trong catalog khách hàng không khớp giá trong hồ sơ gói chuẩn.",
      ),
    );
  }

  if (!definition.pricing.bomComplete) {
    warnings.push(
      issue(
        definition.code,
        "BOM_NOT_ITEMIZED",
        "warning",
        "Gói mới chỉ có cấu hình và giá tham khảo; chưa có BOM nhà cung cấp đủ dòng để chốt giá.",
      ),
    );
  }

  if (
    definition.technicalReview.status === "approved" &&
    !definition.technicalReview.sourceReferences.some(
      (source) => source.type === "manufacturer-datasheet",
    )
  ) {
    errors.push(
      issue(
        definition.code,
        "MANUFACTURER_DATASHEET_MISSING",
        "error",
        "Gói đã duyệt kỹ thuật phải có datasheet chính thức của nhà sản xuất.",
      ),
    );
  }

  if (definition.technicalReview.status !== "approved") {
    warnings.push(
      issue(
        definition.code,
        "TECHNICAL_REVIEW_NOT_APPROVED",
        "warning",
        `Gói đang ở trạng thái ${definition.technicalReview.status}; ${definition.technicalReview.statusReason}`,
      ),
    );
  }

  for (const source of definition.technicalReview.sourceReferences) {
    if (
      source.reportedModel &&
      source.reportedModel !== definition.inverter.model
    ) {
      warnings.push(
        issue(
          definition.code,
          "SOURCE_INVERTER_MODEL_MISMATCH",
          "warning",
          `Nguồn ${source.id} ghi inverter ${source.reportedModel}, khác model catalog ${definition.inverter.model}; cần datasheet hoặc nhà cung cấp xác nhận SKU giao thực tế.`,
        ),
      );
    }
  }

  if (definition.pricing.vatStatus === "ambiguous") {
    warnings.push(
      issue(
        definition.code,
        "VAT_BASIS_UNCLEAR",
        "warning",
        "Không được tự cộng hoặc tách VAT khi tài liệu nguồn chưa xác định giá dòng đã gồm VAT hay chưa.",
      ),
    );
  }

  if (
    definition.pricing.sourceWrittenTotalVnd !== null &&
    definition.pricing.sourceWrittenTotalVnd !== undefined &&
    definition.pricing.sourceWrittenTotalVnd !==
      definition.pricing.referenceTotalVnd
  ) {
    warnings.push(
      issue(
        definition.code,
        "SOURCE_WRITTEN_TOTAL_MISMATCH",
        "warning",
        "Số tiền bằng chữ trên tài liệu nguồn không khớp tổng số bằng số; chỉ dùng tổng số sau khi người duyệt xác nhận.",
      ),
    );
  }

  if (solarPackage.requiredRoofAreaM2 < panelCoverageAreaM2 * 1.1) {
    warnings.push(
      issue(
        definition.code,
        "ROOF_CLEARANCE_LOW",
        "warning",
        "Diện tích mái chỉ sát diện tích phủ tấm; cần kiểm tra khoảng hở, lối đi và vật cản khi khảo sát.",
      ),
    );
  }

  validateTechnicalDesign(solarPackage, definition, errors, warnings);

  for (const reason of definition.engineeringReviewRequired) {
    warnings.push(
      issue(definition.code, "ENGINEERING_REVIEW_REQUIRED", "warning", reason),
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateStandardPackageCatalog(
  packages: readonly SolarPackage[],
  definitions: readonly StandardPackageDefinition[],
): StandardPackageValidationResult {
  const errors: StandardPackageIssue[] = [];
  const warnings: StandardPackageIssue[] = [];
  const packagesByCode = new Map(packages.map((item) => [item.code, item]));
  const definitionsByCode = new Set<string>();

  for (const definition of definitions) {
    if (definitionsByCode.has(definition.code)) {
      errors.push(
        issue(
          definition.code,
          "DUPLICATE_STANDARD_PACKAGE",
          "error",
          "Catalog gói chuẩn có mã bị trùng.",
        ),
      );
      continue;
    }
    definitionsByCode.add(definition.code);

    const solarPackage = packagesByCode.get(definition.code);
    if (!solarPackage) {
      errors.push(
        issue(
          definition.code,
          "PACKAGE_NOT_IN_CUSTOMER_CATALOG",
          "error",
          "Gói chuẩn chưa được liên kết vào catalog khách hàng.",
        ),
      );
      continue;
    }

    const result = validateStandardPackage(solarPackage, definition);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}
