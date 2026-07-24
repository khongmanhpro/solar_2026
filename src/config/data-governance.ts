import type { CalculationDataManifest } from "@/types/data-governance";

export const CALCULATION_SNAPSHOT_SCHEMA_VERSION = "2.2.0" as const;
export const CALCULATION_ALGORITHM_VERSION = "2.1.0-phase2" as const;

export const CURRENT_DATA_MANIFEST = {
  electricityTariff: {
    key: "electricityTariff",
    version: "electricity-tariff-registry-2026-07-22-draft.1",
    status: "draft",
    sourceReference:
      "Quyết định 1279/QĐ-BCT; Nghị quyết 204/2025/QH15; Nghị định 174/2025/NĐ-CP; data/electricity-tariffs.json",
    owner: "Pháp lý/giá điện — chưa chỉ định người duyệt",
    effectiveFrom: "2025-05-10",
    effectiveTo: null,
    approvedBy: null,
    approvedAt: null,
    expectedContentHash: null,
    notes: [
      "Biểu giá 6 bậc QD1279 có nguồn chính thức nhưng chưa được phê duyệt nội bộ để dùng ở production.",
      "VAT 8% đang là kết luận pháp lý cần đối chiếu hóa đơn thật trước khi duyệt.",
      "Cơ cấu 5 bậc QD14 chỉ là candidate tương lai, không có ngày hiệu lực và không selectable.",
    ],
  },
  packageCatalog: {
    key: "packageCatalog",
    version: "demo-package-catalog-2026-07-20",
    status: "demo",
    sourceReference: "src/config/defaults.ts",
    owner: "Kinh doanh + kỹ thuật — chưa chỉ định người duyệt",
    effectiveFrom: null,
    effectiveTo: null,
    approvedBy: null,
    approvedAt: null,
    expectedContentHash: null,
    notes: ["Bốn gói hiện tại chỉ phục vụ phát triển và kiểm thử."],
  },
  solarYield: {
    key: "solarYield",
    version: "demo-province-factors-2026-07-20",
    status: "demo",
    sourceReference: "src/config/defaults.ts",
    owner: "Kỹ sư thiết kế — chưa chỉ định người duyệt",
    effectiveFrom: null,
    effectiveTo: null,
    approvedBy: null,
    approvedAt: null,
    expectedContentHash: null,
    notes: ["Hệ số tỉnh chưa phải dữ liệu kWh/kWp/tháng đã xác minh."],
  },
  calculationAssumptions: {
    key: "calculationAssumptions",
    version: "demo-calculation-assumptions-2026-07-20",
    status: "demo",
    sourceReference: "src/config/defaults.ts",
    owner: "Tài chính + kỹ thuật — chưa chỉ định người duyệt",
    effectiveFrom: null,
    effectiveTo: null,
    approvedBy: null,
    approvedAt: null,
    expectedContentHash: null,
    notes: ["Tỷ lệ phụ tải, pin và khoảng ước tính chưa được nghiệm thu."],
  },
} as const satisfies CalculationDataManifest;
