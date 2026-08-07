import type {
  DataGovernanceMetadata,
  SolarPackageSeed,
} from "@/types/solar";

/**
 * Customer-facing reference catalog.
 *
 * These are intentionally fixed, easy-to-understand options for an initial
 * consultation. They are not a final quotation: roof structure, cable runs,
 * electrical panel, shading, VAT and the exact equipment available must be
 * confirmed during the site survey.
 */
export const CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION =
  "customer-reference-packages-v2-2026-08-04";
export const CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION_PREFIX =
  "customer-reference-packages-";

const CUSTOMER_REFERENCE_DATA = {
  dataStatus: "demo",
  dataVersion: CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION,
  sourceReference:
    "Bộ công thức V1 + báo giá mẫu 7,2 kWp/6 kW/16 kWh + catalog thị trường ứng viên",
  dataOwner: "Kinh doanh + kỹ thuật — xác nhận sau khảo sát",
  effectiveFrom: null,
  effectiveTo: null,
  approvedBy: null,
  approvedAt: null,
} as const satisfies DataGovernanceMetadata;

export const CUSTOMER_REFERENCE_PACKAGES = [
  {
    ...CUSTOMER_REFERENCE_DATA,
    code: "HOME-GT-1P-5K",
    name: "Hòa lưới Tiết kiệm · 5 kW 1 pha",
    description:
      "Phương án tham khảo cho hộ gia đình muốn giảm tiền điện ban ngày với mức đầu tư gọn.",
    priceVnd: 56_000_000,
    capacityKwp: 5.84,
    baseMonthlyGenerationKwh: 700.8,
    requiredRoofAreaM2: 28.6,
    systemType: "grid-tied",
    electricalPhase: "single-phase",
    batteryCapacityKwh: 0,
    equipmentSummary:
      "8 tấm Risen 730 W + inverter Solplanet 5 kW + BOS tiêu chuẩn + thi công cơ bản.",
    panelBrand: "Risen",
    panelModel: "RSM132-8-730BHDG",
    inverterBrand: "Solplanet",
    inverterModel: "ASW5000-S-G2",
    panelWarrantyYears: 15,
    inverterWarrantyYears: 10,
    active: true,
    displayOrder: 1,
  },
  {
    ...CUSTOMER_REFERENCE_DATA,
    code: "HOME-GT-1P-6K",
    name: "Hòa lưới Gia đình · 6 kW 1 pha",
    description:
      "Phương án cân bằng cho gia đình có mức dùng điện trung bình đến khá và có tải ban ngày.",
    priceVnd: 62_000_000,
    capacityKwp: 6.57,
    baseMonthlyGenerationKwh: 788.4,
    requiredRoofAreaM2: 32.2,
    systemType: "grid-tied",
    electricalPhase: "single-phase",
    batteryCapacityKwh: 0,
    equipmentSummary:
      "9 tấm Risen 730 W + inverter Solplanet 6 kW + BOS tiêu chuẩn + thi công cơ bản.",
    panelBrand: "Risen",
    panelModel: "RSM132-8-730BHDG",
    inverterBrand: "Solplanet",
    inverterModel: "ASW6000-S-G2",
    panelWarrantyYears: 15,
    inverterWarrantyYears: 10,
    active: true,
    displayOrder: 2,
  },
  {
    ...CUSTOMER_REFERENCE_DATA,
    code: "HOME-GT-1P-8K",
    name: "Hòa lưới Nâng cao · 8 kW 1 pha",
    description:
      "Phù hợp nhà có hóa đơn cao, nhiều thiết bị dùng ban ngày và mái đủ rộng.",
    priceVnd: 83_000_000,
    capacityKwp: 8.76,
    baseMonthlyGenerationKwh: 1_051.2,
    requiredRoofAreaM2: 42.9,
    systemType: "grid-tied",
    electricalPhase: "single-phase",
    batteryCapacityKwh: 0,
    equipmentSummary:
      "12 tấm Risen 730 W + inverter Solplanet 8 kW + BOS tiêu chuẩn + thi công cơ bản.",
    panelBrand: "Risen",
    panelModel: "RSM132-8-730BHDG",
    inverterBrand: "Solplanet",
    inverterModel: "ASW8000-S",
    panelWarrantyYears: 15,
    inverterWarrantyYears: 10,
    active: true,
    displayOrder: 3,
  },
  {
    ...CUSTOMER_REFERENCE_DATA,
    code: "HOME-HY-1P-6K-16K",
    name: "Hybrid An tâm · 6 kW 1 pha + pin 16 kWh",
    description:
      "Phương án tham khảo cho gia đình cần điện dự phòng khi mất điện và muốn tăng mức tự dùng.",
    priceVnd: 110_000_000,
    capacityKwp: 5.84,
    baseMonthlyGenerationKwh: 700.8,
    requiredRoofAreaM2: 28.6,
    systemType: "hybrid",
    electricalPhase: "single-phase",
    batteryCapacityKwh: 16.07,
    equipmentSummary:
      "8 tấm Risen 730 W + inverter hybrid 6 kW + pin lưu trữ khoảng 16 kWh + tủ điện, BOS và thi công cơ bản.",
    panelBrand: "Risen",
    panelModel: "RSM132-8-730BHDG",
    inverterBrand: "SRNE",
    inverterModel: "HESP486S100-H",
    panelWarrantyYears: 15,
    inverterWarrantyYears: 5,
    active: true,
    displayOrder: 4,
  },
  {
    ...CUSTOMER_REFERENCE_DATA,
    code: "HOME-HY-1P-7K2-16K",
    name: "Hybrid theo báo giá mẫu · 7,2 kWp / 6 kW / 16 kWh",
    description:
      "Gói tham khảo được dựng theo báo giá mẫu SolarPeak; phù hợp khách muốn ưu tiên nguồn điện dự phòng.",
    priceVnd: 133_109_600,
    capacityKwp: 7.2,
    baseMonthlyGenerationKwh: 870.5,
    requiredRoofAreaM2: 35.7,
    systemType: "hybrid",
    electricalPhase: "single-phase",
    batteryCapacityKwh: 16,
    equipmentSummary:
      "10 tấm Risen HJT hai mặt kính 720 W + inverter hybrid SRNE 6 kW + pin Yunqida LiFePO4 16 kWh + khung, tủ điện, vật tư và thi công theo báo giá mẫu.",
    panelBrand: "Risen",
    panelModel: "RSM132-8-720BHDG",
    inverterBrand: "SRNE",
    inverterModel: "HESP486S100-H",
    panelWarrantyYears: 15,
    inverterWarrantyYears: 5,
    active: true,
    displayOrder: 5,
  },
  {
    ...CUSTOMER_REFERENCE_DATA,
    code: "HOME-HY-3P-8K-16K",
    name: "Hybrid Nhà lớn · 8 kW 3 pha + pin 16 kWh",
    description:
      "Phù hợp nhà lớn dùng điện 3 pha, cần dự phòng cho các tải ưu tiên và có mái rộng.",
    priceVnd: 135_000_000,
    capacityKwp: 8.76,
    baseMonthlyGenerationKwh: 1_051.2,
    requiredRoofAreaM2: 42.9,
    systemType: "hybrid",
    electricalPhase: "three-phase",
    batteryCapacityKwh: 16.07,
    equipmentSummary:
      "12 tấm Risen 730 W + inverter hybrid 3 pha 8 kW + pin lưu trữ khoảng 16 kWh + BOS và thi công cơ bản.",
    panelBrand: "Risen",
    panelModel: "RSM132-8-730BHDG",
    inverterBrand: "SRNE",
    inverterModel: "HESP4880SHD3",
    panelWarrantyYears: 15,
    inverterWarrantyYears: 5,
    active: true,
    displayOrder: 6,
  },
  {
    ...CUSTOMER_REFERENCE_DATA,
    code: "HOME-HY-3P-12K-16K",
    name: "Hybrid Công suất cao · 12 kW 3 pha + pin 16 kWh",
    description:
      "Dành cho nhà lớn hoặc hộ kinh doanh tại gia có nhu cầu điện cao và muốn có nguồn dự phòng.",
    priceVnd: 155_000_000,
    capacityKwp: 11.68,
    baseMonthlyGenerationKwh: 1_401.6,
    requiredRoofAreaM2: 57.2,
    systemType: "hybrid",
    electricalPhase: "three-phase",
    batteryCapacityKwh: 16.07,
    equipmentSummary:
      "16 tấm Risen 730 W + inverter hybrid 3 pha 12 kW + pin lưu trữ khoảng 16 kWh + BOS và thi công cơ bản.",
    panelBrand: "Risen",
    panelModel: "RSM132-8-730BHDG",
    inverterBrand: "SRNE",
    inverterModel: "HESP48120SH3",
    panelWarrantyYears: 15,
    inverterWarrantyYears: 5,
    active: true,
    displayOrder: 7,
  },
] as const satisfies readonly SolarPackageSeed[];
