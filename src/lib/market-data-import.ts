import { createContentFingerprint } from "@/lib/stable-fingerprint";
import { TRIAL_PACKAGE_DATA_VERSION_PREFIX } from "@/config/trial-market-data";

export { TRIAL_PACKAGE_DATA_VERSION_PREFIX };

export type WorkbookCell = string | number | boolean | Date | null;

export interface WorkbookSheetData {
  sheet: string;
  data: WorkbookCell[][];
}

export type ImportIssueSeverity = "error" | "warning";

export interface MarketDataImportIssue {
  severity: ImportIssueSeverity;
  code: string;
  sheet: string | null;
  row: number | null;
  field: string | null;
  message: string;
}

export interface MarketPackageCandidate {
  code: string;
  apiKey: string;
  name: string;
  description: string;
  sourceActive: boolean;
  displayOrder: number;
  systemType: "grid-tied" | "hybrid";
  referencePriceVnd: number | null;
  priceIncludesVat: boolean | null;
  vatRate: number | null;
  capacityKwp: number | null;
  baseMonthlyGenerationKwh: number | null;
  requiredRoofAreaM2: number | null;
  batteryNominalKwh: number;
  usableBatteryKwh: number | null;
  equipmentSummary: string;
  panelBrand: string;
  panelModel: string;
  panelPowerWp: number | null;
  panelCount: number | null;
  inverterBrand: string;
  inverterModel: string;
  inverterPowerKw: number | null;
  batteryBrand: string | null;
  batteryModel: string | null;
  panelWarrantyYears: number | null;
  inverterWarrantyYears: number | null;
  batteryWarrantyYears: number | null;
  includedItems: string | null;
  excludedItems: string | null;
  installationScope: string | null;
  sourceReference: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  phase: "single-phase" | "three-phase";
  sourceStatus: string;
  sourcePublished: boolean;
  sourceMissingRequirements: string[];
  sourceNotes: string | null;
  priceIsEstimate: boolean;
  currentEngineCompatible: boolean;
  currentEngineBlockers: string[];
  importStatus: "draft";
}

export interface MarketEquipmentCandidate {
  sku: string;
  apiKey: string;
  type: string;
  brand: string;
  model: string;
  inUse: boolean;
  nominalPower: number | null;
  unit: string | null;
  efficiency: number | null;
  phase: string | null;
  datasheet: string | null;
  warrantyPolicy: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  sourceStatus: string | null;
  sourceMissingRequirements: string[];
  usableForPackage: boolean;
}

export interface MarketServiceRegionCandidate {
  code: string;
  name: string;
  serviceLevel: string | null;
  verified: boolean;
  sourceStatus: string | null;
}

export interface SupplierPriceCandidate {
  category: string;
  brand: string;
  model: string;
  unit: string;
  priceForOneOrTwoVnd: number | null;
  includesVat: boolean | null;
  vatRate: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  sourceReference: string | null;
}

export interface MarketFinancialAssumptionCandidate {
  key: string;
  description: string;
  supplierValue: number | string | null;
  unit: string | null;
  demoValue: number | string | null;
  sourceReference: string | null;
  productionStatus: string | null;
}

export interface TrialMarketPackage {
  code: string;
  name: string;
  description: string;
  priceVnd: number;
  capacityKwp: number;
  baseMonthlyGenerationKwh: number;
  requiredRoofAreaM2: number;
  systemType: "grid-tied" | "hybrid";
  batteryCapacityKwh: number;
  equipmentSummary: string;
  panelBrand: string;
  panelModel: string;
  inverterBrand: string;
  inverterModel: string;
  panelWarrantyYears: number;
  inverterWarrantyYears: number;
  displayOrder: number;
  sourceReference: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface TrialCalculationAssumptions {
  averageElectricityPriceVndPerKwh?: number;
  batteryRoundTripEfficiency?: number;
  systemLifetimeYears?: number;
  maintenanceRatePerYear?: number;
}

export interface TrialMarketRelease {
  dataVersion: string;
  packages: TrialMarketPackage[];
  calculationAssumptions: TrialCalculationAssumptions;
  derivationNotes: string[];
}

export interface MarketDataCandidateBundle {
  schemaVersion: "market-data-candidate-v1";
  datasetVersion: string;
  contentHash: string;
  source: {
    fileName: string;
    sha256: string;
    workbookLabel: string | null;
  };
  governance: {
    status: "draft";
    autoApprovalAllowed: false;
    productionReady: false;
    notes: string[];
  };
  packages: MarketPackageCandidate[];
  equipment: MarketEquipmentCandidate[];
  serviceRegions: MarketServiceRegionCandidate[];
  supplierPrices: SupplierPriceCandidate[];
  financialAssumptions: MarketFinancialAssumptionCandidate[];
  readiness: {
    packageCount: number;
    publishedPackageCount: number;
    currentEngineCompatiblePackageCount: number;
    equipmentCount: number;
    serviceRegionCount: number;
    supplierPriceCount: number;
    financialAssumptionCount: number;
    approvedRegionalYieldCount: number;
    passedAcceptanceCaseCount: number;
    productionBlockers: string[];
  };
  impact: {
    databaseWrites: false;
    changesCalculationResults: false;
    changesProductionAvailability: false;
    safeNextAction: string;
  };
  issues: MarketDataImportIssue[];
}

export interface BuildMarketDataCandidateOptions {
  fileName: string;
  sourceSha256: string;
}

export interface DraftImportPreflight {
  allowed: boolean;
  importablePackages: MarketPackageCandidate[];
  blockers: string[];
}

const REQUIRED_SHEETS = [
  "GOI_SAN_PHAM",
  "THIET_BI",
  "SAN_LUONG_KHU_VUC",
  "CA_NGHIEM_THU",
  "VUNG_PHUC_VU",
  "BANG_GIA_NCC",
  "GIA_DINH_TAI_CHINH",
] as const;

export const TRIAL_MONTHLY_YIELD_KWH_PER_KWP = 120;
export const TRIAL_PANEL_LENGTH_M = 2.384;
export const TRIAL_PANEL_WIDTH_M = 1.303;
export const TRIAL_ROOF_CLEARANCE_RATIO = 0.15;

type RowRecord = Record<string, WorkbookCell>;

function text(value: WorkbookCell | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function numberValue(value: WorkbookCell | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: WorkbookCell | undefined): boolean | null {
  if (typeof value === "boolean") return value;
  const normalized = text(value)?.toLocaleLowerCase("vi");
  if (["có", "co", "yes", "true"].includes(normalized ?? "")) return true;
  if (["không", "khong", "no", "false"].includes(normalized ?? "")) return false;
  return null;
}

function isoDate(value: WorkbookCell | undefined): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const normalized = text(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function splitRequirements(value: WorkbookCell | undefined): string[] {
  return (text(value) ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function findHeaderRow(
  sheet: WorkbookSheetData,
  firstHeader: string,
): { headerIndex: number; headers: string[] } | null {
  for (let index = 0; index < sheet.data.length; index += 1) {
    const headers = sheet.data[index].map((cell) => text(cell) ?? "");
    if (headers.includes(firstHeader)) return { headerIndex: index, headers };
  }
  return null;
}

function readRecords(
  sheet: WorkbookSheetData,
  firstHeader: string,
  issues: MarketDataImportIssue[],
): Array<{ row: number; values: RowRecord }> {
  const located = findHeaderRow(sheet, firstHeader);
  if (!located) {
    issues.push({
      severity: "error",
      code: "HEADER_NOT_FOUND",
      sheet: sheet.sheet,
      row: null,
      field: firstHeader,
      message: `Không tìm thấy hàng tiêu đề chứa "${firstHeader}".`,
    });
    return [];
  }

  const records: Array<{ row: number; values: RowRecord }> = [];
  for (let index = located.headerIndex + 1; index < sheet.data.length; index += 1) {
    const row = sheet.data[index];
    const values: RowRecord = {};
    located.headers.forEach((header, columnIndex) => {
      if (header) values[header] = row[columnIndex] ?? null;
    });
    if (Object.values(values).some((value) => text(value) !== null)) {
      records.push({ row: index + 1, values });
    }
  }
  return records;
}

function requiredText(
  record: RowRecord,
  field: string,
  context: { sheet: string; row: number; issues: MarketDataImportIssue[] },
): string {
  const value = text(record[field]);
  if (value) return value;
  context.issues.push({
    severity: "error",
    code: "REQUIRED_VALUE_MISSING",
    sheet: context.sheet,
    row: context.row,
    field,
    message: `Thiếu giá trị bắt buộc ở cột "${field}".`,
  });
  return "";
}

function parseSystemType(value: WorkbookCell | undefined): "grid-tied" | "hybrid" | null {
  const normalized = text(value)?.toLocaleLowerCase("vi");
  if (normalized === "hòa lưới") return "grid-tied";
  if (normalized === "hybrid") return "hybrid";
  return null;
}

function parsePhase(value: WorkbookCell | undefined): "single-phase" | "three-phase" | null {
  const normalized = text(value)?.toLocaleLowerCase("vi");
  if (normalized === "1 pha") return "single-phase";
  if (normalized === "3 pha") return "three-phase";
  return null;
}

function parsePackages(
  sheet: WorkbookSheetData,
  issues: MarketDataImportIssue[],
): MarketPackageCandidate[] {
  const records = readRecords(sheet, "Mã gói * (code)", issues);
  const packages: MarketPackageCandidate[] = [];
  const seenCodes = new Set<string>();
  const seenApiKeys = new Set<string>();

  for (const { row, values } of records) {
    const context = { sheet: sheet.sheet, row, issues };
    const code = requiredText(values, "Mã gói * (code)", context);
    if (!code) continue;
    const apiKey = requiredText(values, "apiKey", context);
    const systemType = parseSystemType(values["Loại hệ thống *"]);
    const phase = parsePhase(values["Số pha *"]);
    if (!systemType) {
      issues.push({ severity: "error", code: "INVALID_SYSTEM_TYPE", sheet: sheet.sheet, row, field: "Loại hệ thống *", message: `Loại hệ thống của ${code} không hợp lệ.` });
    }
    if (!phase) {
      issues.push({ severity: "error", code: "INVALID_PHASE", sheet: sheet.sheet, row, field: "Số pha *", message: `Số pha của ${code} không hợp lệ.` });
    }
    if (seenCodes.has(code)) {
      issues.push({ severity: "error", code: "DUPLICATE_PACKAGE_CODE", sheet: sheet.sheet, row, field: "Mã gói * (code)", message: `Mã gói ${code} bị trùng.` });
    }
    if (apiKey && seenApiKeys.has(apiKey)) {
      issues.push({ severity: "error", code: "DUPLICATE_API_KEY", sheet: sheet.sheet, row, field: "apiKey", message: `apiKey ${apiKey} bị trùng.` });
    }
    seenCodes.add(code);
    if (apiKey) seenApiKeys.add(apiKey);

    const price = numberValue(values["Giá V1 tham khảo VND *"] ?? values["Giá trọn gói VND *"]);
    const capacity = numberValue(values["Công suất DC kWp *"]);
    const baseGeneration = numberValue(values["Sản lượng nền kWh/tháng *"]);
    const roofArea = numberValue(values["Diện tích mái tối thiểu m² *"]);
    const sourceStatus = text(values["Trạng thái dữ liệu"]) ?? "";
    const sourceNotes = text(values["Ghi chú"]);
    const sourceReference = text(values["Nguồn giá/báo giá *"]);
    const priceIsEstimate = /ước lượng|tham khảo|demo/i.test(
      [sourceStatus, sourceNotes, sourceReference].filter(Boolean).join(" "),
    );
    const currentEngineBlockers: string[] = [];
    if (booleanValue(values["Đang bán * (active)"]) !== true) currentEngineBlockers.push("Gói chưa được đánh dấu đang bán");
    if (booleanValue(values["Được công bố?"]) !== true) currentEngineBlockers.push("Gói chưa được công bố");
    if (!price || price <= 0) currentEngineBlockers.push("Thiếu giá gói hợp lệ");
    if (priceIsEstimate) currentEngineBlockers.push("Giá chỉ là ước lượng/demo");
    if (!capacity || capacity <= 0) currentEngineBlockers.push("Thiếu công suất DC");
    if (!baseGeneration || baseGeneration <= 0) currentEngineBlockers.push("Engine hiện tại còn cần sản lượng nền theo tháng");
    if (!roofArea || roofArea < 5) currentEngineBlockers.push("Thiếu diện tích mái tối thiểu");
    if (booleanValue(values["Giá gồm VAT? *"]) === null) currentEngineBlockers.push("Chưa xác định trạng thái VAT");

    packages.push({
      code,
      apiKey,
      name: requiredText(values, "Tên gói * (name)", context),
      description: requiredText(values, "Mô tả *", context),
      sourceActive: booleanValue(values["Đang bán * (active)"]) === true,
      displayOrder: Math.trunc(numberValue(values["Thứ tự *"]) ?? 0),
      systemType: systemType ?? "grid-tied",
      referencePriceVnd: price,
      priceIncludesVat: booleanValue(values["Giá gồm VAT? *"]),
      vatRate: numberValue(values["Thuế suất VAT"]),
      capacityKwp: capacity,
      baseMonthlyGenerationKwh: baseGeneration,
      requiredRoofAreaM2: roofArea,
      batteryNominalKwh: numberValue(values["Pin lưu trữ danh định kWh *"]) ?? 0,
      usableBatteryKwh: numberValue(values["Dung lượng khả dụng kWh"]),
      equipmentSummary: requiredText(values, "Tóm tắt thiết bị *", context),
      panelBrand: requiredText(values, "Hãng tấm pin *", context),
      panelModel: requiredText(values, "Model tấm pin *", context),
      panelPowerWp: numberValue(values["Công suất tấm Wp"]),
      panelCount: numberValue(values["Số tấm"]),
      inverterBrand: requiredText(values, "Hãng inverter *", context),
      inverterModel: requiredText(values, "Model inverter *", context),
      inverterPowerKw: numberValue(values["Công suất inverter kW"]),
      batteryBrand: text(values["Hãng pin lưu trữ"]),
      batteryModel: text(values["Model pin lưu trữ"]),
      panelWarrantyYears: numberValue(values["BH tấm pin năm *"]),
      inverterWarrantyYears: numberValue(values["BH inverter năm *"]),
      batteryWarrantyYears: numberValue(values["BH pin năm"]),
      includedItems: text(values["Hạng mục bao gồm *"]),
      excludedItems: text(values["Hạng mục loại trừ"]),
      installationScope: text(values["Phạm vi vận chuyển/lắp đặt"]),
      sourceReference,
      effectiveFrom: isoDate(values["Hiệu lực từ"]),
      effectiveTo: isoDate(values["Hiệu lực đến"]),
      phase: phase ?? "single-phase",
      sourceStatus,
      sourcePublished: booleanValue(values["Được công bố?"]) === true,
      sourceMissingRequirements: splitRequirements(values["Thiếu bắt buộc"]),
      sourceNotes,
      priceIsEstimate,
      currentEngineCompatible: currentEngineBlockers.length === 0,
      currentEngineBlockers,
      importStatus: "draft",
    });
  }
  return packages;
}

function parseEquipment(
  sheet: WorkbookSheetData,
  issues: MarketDataImportIssue[],
): MarketEquipmentCandidate[] {
  return readRecords(sheet, "SKU *", issues)
    .map(({ row, values }) => {
      const context = { sheet: sheet.sheet, row, issues };
      const sku = requiredText(values, "SKU *", context);
      if (!sku) return null;
      return {
        sku,
        apiKey: requiredText(values, "apiKey", context),
        type: requiredText(values, "Loại thiết bị *", context),
        brand: requiredText(values, "Hãng *", context),
        model: requiredText(values, "Model *", context),
        inUse: booleanValue(values["Đang sử dụng *"]) === true,
        nominalPower: numberValue(values["Công suất danh định"]),
        unit: text(values["Đơn vị"]),
        efficiency: numberValue(values["Hiệu suất"]),
        phase: text(values["Pha"]),
        datasheet: text(values["Datasheet *"]),
        warrantyPolicy: text(values["Chính sách bảo hành *"]),
        verifiedAt: isoDate(values["Ngày xác minh"]),
        verifiedBy: text(values["Người xác minh"]),
        sourceStatus: text(values["Trạng thái dữ liệu"]),
        sourceMissingRequirements: splitRequirements(values["Thiếu/lỗi cần xử lý"]),
        usableForPackage: booleanValue(values["Dùng tạo gói?"]) === true,
      } satisfies MarketEquipmentCandidate;
    })
    .filter((item): item is MarketEquipmentCandidate => item !== null);
}

function parseServiceRegions(
  sheet: WorkbookSheetData,
  issues: MarketDataImportIssue[],
): MarketServiceRegionCandidate[] {
  return readRecords(sheet, "provinceCode *", issues)
    .map(({ row, values }) => {
      const code = requiredText(values, "provinceCode *", { sheet: sheet.sheet, row, issues });
      if (!code) return null;
      return {
        code,
        name: text(values["Tên tỉnh/thành"]) ?? code,
        serviceLevel: text(values["Mức phục vụ *"]),
        verified: booleanValue(values["Đã xác minh?"]) === true,
        sourceStatus: text(values["Trạng thái"]),
      } satisfies MarketServiceRegionCandidate;
    })
    .filter((item): item is MarketServiceRegionCandidate => item !== null);
}

function parseSupplierPrices(
  sheet: WorkbookSheetData,
  issues: MarketDataImportIssue[],
): SupplierPriceCandidate[] {
  return readRecords(sheet, "Nhóm", issues)
    .map(({ values }) => ({
      category: text(values["Nhóm"]) ?? "",
      brand: text(values["Hãng"]) ?? "",
      model: text(values["Model"]) ?? "",
      unit: text(values["Đơn vị"]) ?? "",
      priceForOneOrTwoVnd: numberValue(values["Giá 1–2"]),
      includesVat: booleanValue(values["Đã gồm VAT?"]),
      vatRate: numberValue(values["Thuế suất VAT"]),
      effectiveFrom: isoDate(values["Áp dụng từ"]),
      effectiveTo: isoDate(values["Hiệu lực đến"]),
      sourceReference: text(values["Nguồn báo giá"]),
    }))
    .filter((item) => item.model && item.brand);
}

function parseFinancialAssumptions(
  sheet: WorkbookSheetData,
  issues: MarketDataImportIssue[],
): MarketFinancialAssumptionCandidate[] {
  return readRecords(sheet, "Nhóm", issues)
    .map(({ values }) => ({
      key: text(values["Biến hệ thống *"]) ?? "",
      description: text(values["Mô tả *"]) ?? "",
      supplierValue:
        numberValue(values["Giá trị nhà cung cấp *"]) ??
        text(values["Giá trị nhà cung cấp *"]),
      unit: text(values["Đơn vị"]),
      demoValue:
        numberValue(values["Giá trị đang dùng (demo)"]) ??
        text(values["Giá trị đang dùng (demo)"]),
      sourceReference: text(values["Nguồn/tài liệu *"]),
      productionStatus: text(values["Trạng thái production"]),
    }))
    .filter((item) => item.key);
}

function countApprovedRegionalYield(
  sheet: WorkbookSheetData,
  issues: MarketDataImportIssue[],
): number {
  return readRecords(sheet, "Mã tỉnh/điểm *", issues).filter(({ values }) => {
    const status = text(values["Trạng thái dữ liệu"])?.toLocaleLowerCase("vi") ?? "";
    const monthlyValues = Array.from({ length: 12 }, (_, index) =>
      numberValue(values[`Tháng ${index + 1} kWh/kWp`]),
    );
    return /đã duyệt|verified/.test(status) && monthlyValues.every((value) => value !== null && value > 0);
  }).length;
}

function countPassedAcceptanceCases(
  sheet: WorkbookSheetData,
  issues: MarketDataImportIssue[],
): number {
  return readRecords(sheet, "Mã ca *", issues).filter(({ values }) => {
    const status = text(values["Trạng thái *"])?.toLocaleLowerCase("vi") ?? "";
    return /đạt|pass|approved/.test(status) && Boolean(text(values["Kỹ sư duyệt *"]));
  }).length;
}

export function buildMarketDataCandidate(
  sheets: readonly WorkbookSheetData[],
  options: BuildMarketDataCandidateOptions,
): MarketDataCandidateBundle {
  const issues: MarketDataImportIssue[] = [];
  const sheetByName = new Map(sheets.map((sheet) => [sheet.sheet, sheet]));
  for (const sheetName of REQUIRED_SHEETS) {
    if (!sheetByName.has(sheetName)) {
      issues.push({ severity: "error", code: "REQUIRED_SHEET_MISSING", sheet: sheetName, row: null, field: null, message: `Thiếu sheet bắt buộc ${sheetName}.` });
    }
  }

  const packages = sheetByName.has("GOI_SAN_PHAM") ? parsePackages(sheetByName.get("GOI_SAN_PHAM")!, issues) : [];
  const equipment = sheetByName.has("THIET_BI") ? parseEquipment(sheetByName.get("THIET_BI")!, issues) : [];
  const serviceRegions = sheetByName.has("VUNG_PHUC_VU") ? parseServiceRegions(sheetByName.get("VUNG_PHUC_VU")!, issues) : [];
  const supplierPrices = sheetByName.has("BANG_GIA_NCC") ? parseSupplierPrices(sheetByName.get("BANG_GIA_NCC")!, issues) : [];
  const financialAssumptions = sheetByName.has("GIA_DINH_TAI_CHINH")
    ? parseFinancialAssumptions(
        sheetByName.get("GIA_DINH_TAI_CHINH")!,
        issues,
      )
    : [];
  const approvedRegionalYieldCount = sheetByName.has("SAN_LUONG_KHU_VUC") ? countApprovedRegionalYield(sheetByName.get("SAN_LUONG_KHU_VUC")!, issues) : 0;
  const passedAcceptanceCaseCount = sheetByName.has("CA_NGHIEM_THU") ? countPassedAcceptanceCases(sheetByName.get("CA_NGHIEM_THU")!, issues) : 0;
  const publishedPackageCount = packages.filter((item) => item.sourcePublished && item.sourceActive).length;
  const currentEngineCompatiblePackageCount = packages.filter((item) => item.currentEngineCompatible).length;
  const productionBlockers: string[] = [];
  if (publishedPackageCount === 0) productionBlockers.push("Không có gói nào vừa đang bán vừa được công bố.");
  if (currentEngineCompatiblePackageCount === 0) productionBlockers.push("Không có gói nào đủ trường bắt buộc của engine hiện tại.");
  if (approvedRegionalYieldCount === 0) productionBlockers.push("Chưa có dữ liệu sản lượng 12 tháng theo vùng đã duyệt.");
  if (passedAcceptanceCaseCount < 10) productionBlockers.push(`Mới có ${passedAcceptanceCaseCount}/10 ca nghiệm thu đạt.`);
  if (packages.some((item) => item.priceIsEstimate)) productionBlockers.push("Giá gói còn là ước lượng thị trường/demo.");
  if (packages.some((item) => item.priceIncludesVat === null)) productionBlockers.push("VAT của ít nhất một gói chưa được xác định.");

  const workbookLabel = text(sheetByName.get("HUONG_DAN")?.data[1]?.[0]);
  const baseBundle = {
    schemaVersion: "market-data-candidate-v1" as const,
    datasetVersion: `market-data-candidate-${options.sourceSha256.slice(0, 12)}`,
    source: { fileName: options.fileName, sha256: options.sourceSha256, workbookLabel },
    governance: {
      status: "draft" as const,
      autoApprovalAllowed: false as const,
      productionReady: false as const,
      notes: [
        "Bundle ứng viên không thay thế phê duyệt kinh doanh, kỹ thuật hoặc pháp lý.",
        "Không tự nâng dữ liệu Excel thành VERIFIED.",
      ],
    },
    packages,
    equipment,
    serviceRegions,
    supplierPrices,
    financialAssumptions,
    readiness: {
      packageCount: packages.length,
      publishedPackageCount,
      currentEngineCompatiblePackageCount,
      equipmentCount: equipment.length,
      serviceRegionCount: serviceRegions.length,
      supplierPriceCount: supplierPrices.length,
      financialAssumptionCount: financialAssumptions.length,
      approvedRegionalYieldCount,
      passedAcceptanceCaseCount,
      productionBlockers,
    },
    impact: {
      databaseWrites: false as const,
      changesCalculationResults: false as const,
      changesProductionAvailability: false as const,
      safeNextAction: "Hoàn tất dữ liệu còn thiếu, duyệt nguồn và chạy import transaction riêng sau review.",
    },
    issues,
  };
  return { ...baseBundle, contentHash: createContentFingerprint(baseBundle) };
}

export function hasBlockingImportIssues(bundle: MarketDataCandidateBundle): boolean {
  return bundle.issues.some((issue) => issue.severity === "error");
}

export function assessDraftPackageImport(
  bundle: MarketDataCandidateBundle,
  existingPackageCodes: readonly string[] = [],
): DraftImportPreflight {
  const blockers: string[] = [];
  if (hasBlockingImportIssues(bundle)) {
    blockers.push("Workbook còn lỗi cấu trúc hoặc dữ liệu bắt buộc.");
  }
  const importablePackages = bundle.packages.filter(
    (item) => item.currentEngineCompatible,
  );
  if (importablePackages.length === 0) {
    blockers.push("Không có gói nào đủ trường bắt buộc của engine hiện tại.");
  } else if (importablePackages.length !== bundle.packages.length) {
    const incompatibleCodes = bundle.packages
      .filter((item) => !item.currentEngineCompatible)
      .map((item) => item.code);
    blockers.push(
      `Không nhập một phần dataset; các gói chưa tương thích: ${incompatibleCodes.join(", ")}.`,
    );
  }
  const existing = new Set(existingPackageCodes);
  const conflicts = importablePackages
    .map((item) => item.code)
    .filter((code) => existing.has(code));
  if (conflicts.length > 0) {
    blockers.push(
      `Không ghi đè package đã tồn tại: ${conflicts.join(", ")}. Cần migration/version mới được review.`,
    );
  }
  return {
    allowed: blockers.length === 0,
    importablePackages,
    blockers,
  };
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function assumptionNumber(
  assumptions: readonly MarketFinancialAssumptionCandidate[],
  key: string,
): number | undefined {
  const value = assumptions.find((item) => item.key === key)?.supplierValue;
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function normalizePercentage(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return value > 1 ? value / 100 : value;
}

export function buildTrialMarketRelease(
  bundle: MarketDataCandidateBundle,
): TrialMarketRelease {
  if (hasBlockingImportIssues(bundle)) {
    throw new Error("Workbook còn lỗi cấu trúc, không thể tạo release thử nghiệm.");
  }

  const dataVersion = `${TRIAL_PACKAGE_DATA_VERSION_PREFIX}${bundle.source.sha256.slice(0, 12)}-v1`;
  const packages = bundle.packages.map((item) => {
    if (!item.referencePriceVnd || !item.capacityKwp) {
      throw new Error(`Gói ${item.code} thiếu giá hoặc công suất để chạy thử.`);
    }
    const panelFootprintM2 =
      item.panelCount && item.panelCount > 0
        ? item.panelCount *
          TRIAL_PANEL_LENGTH_M *
          TRIAL_PANEL_WIDTH_M *
          (1 + TRIAL_ROOF_CLEARANCE_RATIO)
        : item.capacityKwp * 6;
    const baseMonthlyGenerationKwh = roundToOneDecimal(
      item.baseMonthlyGenerationKwh ??
        item.capacityKwp * TRIAL_MONTHLY_YIELD_KWH_PER_KWP,
    );
    const requiredRoofAreaM2 = roundToOneDecimal(
      item.requiredRoofAreaM2 ?? panelFootprintM2,
    );
    const sourceReference = [
      `workbook:${bundle.source.fileName}`,
      `sha256:${bundle.source.sha256}`,
      item.sourceReference,
      item.baseMonthlyGenerationKwh === null
        ? `trial-derived-generation:${TRIAL_MONTHLY_YIELD_KWH_PER_KWP} kWh/kWp/month`
        : null,
      item.requiredRoofAreaM2 === null
        ? `trial-derived-roof:${TRIAL_PANEL_LENGTH_M}m x ${TRIAL_PANEL_WIDTH_M}m x panelCount + ${TRIAL_ROOF_CLEARANCE_RATIO * 100}% clearance`
        : null,
      "trial-only; estimated price; survey required; not a quotation",
    ]
      .filter(Boolean)
      .join("; ");

    return {
      code: item.code,
      name: `${item.name} — Thử nghiệm`,
      description: `${item.description} Giá và sản lượng chỉ là ước lượng V1; bắt buộc khảo sát trước khi tư vấn hoặc báo giá.`,
      priceVnd: Math.round(item.referencePriceVnd),
      capacityKwp: item.capacityKwp,
      baseMonthlyGenerationKwh,
      requiredRoofAreaM2,
      systemType: item.systemType,
      batteryCapacityKwh: item.batteryNominalKwh,
      equipmentSummary: item.equipmentSummary,
      panelBrand: item.panelBrand,
      panelModel: item.panelModel,
      inverterBrand: item.inverterBrand,
      inverterModel: item.inverterModel,
      panelWarrantyYears: Math.round(item.panelWarrantyYears ?? 0),
      inverterWarrantyYears: Math.round(item.inverterWarrantyYears ?? 0),
      displayOrder: item.displayOrder,
      sourceReference,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
    } satisfies TrialMarketPackage;
  });

  return {
    dataVersion,
    packages,
    calculationAssumptions: {
      averageElectricityPriceVndPerKwh: assumptionNumber(
        bundle.financialAssumptions,
        "averageElectricityPriceVndPerKwh",
      ),
      batteryRoundTripEfficiency: normalizePercentage(
        assumptionNumber(
          bundle.financialAssumptions,
          "batteryRoundTripEfficiency",
        ),
      ),
      systemLifetimeYears: assumptionNumber(
        bundle.financialAssumptions,
        "systemLifetimeYears",
      ),
      maintenanceRatePerYear: normalizePercentage(
        assumptionNumber(
          bundle.financialAssumptions,
          "maintenanceRatePerYear",
        ),
      ),
    },
    derivationNotes: [
      `Sản lượng thiếu được suy ra bằng ${TRIAL_MONTHLY_YIELD_KWH_PER_KWP} kWh/kWp/tháng, cùng mức demo engine hiện tại.`,
      `Diện tích mái thiếu được suy ra từ tấm ${TRIAL_PANEL_LENGTH_M}m × ${TRIAL_PANEL_WIDTH_M}m và cộng ${TRIAL_ROOF_CLEARANCE_RATIO * 100}% khoảng lắp đặt.`,
      "Dữ liệu luôn ở DRAFT; development cần TRIAL_MARKET_DATA_ENABLED=true, còn VPS cần thêm PUBLIC_PREVIEW_MODE_ENABLED=true.",
    ],
  };
}
