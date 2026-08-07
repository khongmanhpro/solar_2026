import type { StandardPackageDefinition } from "@/types/standard-package";

const STANDARD_PANEL_LENGTH_M = 2.384;
const STANDARD_PANEL_WIDTH_M = 1.303;

const FORMULA_V1_EVIDENCE = {
  id: "FORMULA-V1-2026-08-04",
  type: "methodology",
  title: "Bộ công thức chuẩn tạo gói điện mặt trời V1",
  reference: "Tệp nguồn nội bộ: bo-cong-thuc-tao-goi-dien-mat-troi-v1.md",
  effectiveFrom: "2026-08-04",
  effectiveTo: null,
} as const;

const SOLPLANET_3_TO_6K_G2_EVIDENCE = {
  id: "SOLPLANET-ASW-3-6K-S-G2-2022-07",
  type: "manufacturer-datasheet",
  title: "Solplanet ASW S-G2 Series 3–6 kW — technical datasheet",
  reference:
    "https://solplanet.net/wp-content/uploads/2022/09/Datasheet-ASW-3K-6K-S-G2-Series-0722_Global-EN_web.pdf",
  effectiveFrom: "2022-07-01",
  effectiveTo: null,
} as const;

const SOLPLANET_6_TO_10K_EVIDENCE = {
  id: "SOLPLANET-ASW-6-10K-S-2024-09",
  type: "manufacturer-datasheet",
  title: "Solplanet ASW S Series 6–10 kW — technical datasheet",
  reference:
    "https://solplanet.net/wp-content/uploads/2021/11/Fiche-Technique-ASW-S-6-10kW-FR.pdf",
  effectiveFrom: "2024-09-01",
  effectiveTo: null,
  reportedModel: "ASW8000-S",
} as const;

const SOLARPEAK_SAMPLE_QUOTE_EVIDENCE = {
  id: "SOLARPEAK-QUOTE-2026-07-30",
  type: "customer-quote",
  title: "Báo giá trọn gói Hybrid 1P 7,2 kWp / 16 kWh — SolarPeak",
  reference: "Tệp nguồn nội bộ: BG 7,2kWp - 6kW 1P - 16kWh.pdf",
  effectiveFrom: "2026-07-30",
  effectiveTo: "2026-08-09",
  reportedModel: "HESP486S100-H",
} as const;

const SRNE_DEALER_PRICE_LIST_EVIDENCE = {
  id: "SRNE-DEALER-PRICE-LIST-2026-08-01",
  type: "supplier-price-list",
  title: "Bảng giá SRNE Hybrid inverter cho đại lý — Sao Nam",
  reference: "Tệp nguồn nội bộ: Quote_SRNE_DaiLy(01Aug26).pdf",
  effectiveFrom: "2026-08-01",
  effectiveTo: null,
  reportedModel: "HESP4860S100-H",
} as const;

const SRNE_DEALER_PRICE_LIST_3P_8K_EVIDENCE = {
  id: "SRNE-DEALER-PRICE-LIST-2026-08-01-3P-8K",
  type: "supplier-price-list",
  title: "Bảng giá SRNE Hybrid inverter 3 pha 8 kW cho đại lý — Sao Nam",
  reference: "Tệp nguồn nội bộ: Quote_SRNE_DaiLy(01Aug26).pdf",
  effectiveFrom: "2026-08-01",
  effectiveTo: null,
  reportedModel: "HESP4880SHD3",
} as const;

const SRNE_DEALER_PRICE_LIST_3P_12K_EVIDENCE = {
  id: "SRNE-DEALER-PRICE-LIST-2026-08-01-3P-12K",
  type: "supplier-price-list",
  title: "Bảng giá SRNE Hybrid inverter 3 pha 12 kW cho đại lý — Sao Nam",
  reference: "Tệp nguồn nội bộ: Quote_SRNE_DaiLy(01Aug26).pdf",
  effectiveFrom: "2026-08-01",
  effectiveTo: null,
  reportedModel: "HESP48120SH3",
} as const;

const technicalDraft = (
  statusReason: string,
  sourceReferences: StandardPackageDefinition["technicalReview"]["sourceReferences"],
): StandardPackageDefinition["technicalReview"] => ({
  status: "draft",
  statusReason,
  reviewedBy: null,
  reviewedAt: null,
  sourceReferences,
});

const DEFAULT_DC_AC_RATIO_POLICY = {
  minimum: 1.1,
  maximum: 1.3,
  exceptionReason: null,
} as const;

const draftDcAcRatioPolicy = (exceptionReason: string | null = null) => ({
  ...DEFAULT_DC_AC_RATIO_POLICY,
  exceptionReason,
});

const gridTiedDraftDesign = (
  inverterElectrical: StandardPackageDefinition["technicalDesign"]["inverterElectrical"],
  dcAcRatioExceptionReason: string | null = null,
): StandardPackageDefinition["technicalDesign"] => ({
  dcAcRatioPolicy: draftDcAcRatioPolicy(dcAcRatioExceptionReason),
  panelElectrical: null,
  inverterElectrical,
  stringPlan: null,
  batteryElectrical: null,
  backupPlan: null,
});

const hybridDraftDesign = (
  dcAcRatioExceptionReason: string | null = null,
): StandardPackageDefinition["technicalDesign"] => ({
  dcAcRatioPolicy: draftDcAcRatioPolicy(dcAcRatioExceptionReason),
  panelElectrical: null,
  inverterElectrical: null,
  stringPlan: null,
  batteryElectrical: null,
  backupPlan: null,
});

const SOLPLANET_5K_G2_ELECTRICAL = {
  maxPvKw: 7.5,
  maxDcVoltageV: 600,
  mpptVoltageMinV: 60,
  mpptVoltageMaxV: 560,
  mpptCount: 2,
  stringsPerMppt: 1,
  maxInputCurrentPerMpptA: 16,
  nominalAcVoltageV: 220,
  maxAcCurrentA: 25,
} as const;

const SOLPLANET_6K_G2_ELECTRICAL = {
  ...SOLPLANET_5K_G2_ELECTRICAL,
  maxPvKw: 9,
  maxAcCurrentA: 30,
} as const;

const SOLPLANET_8K_ELECTRICAL = {
  maxPvKw: 12,
  maxDcVoltageV: 600,
  mpptVoltageMinV: 80,
  mpptVoltageMaxV: 560,
  mpptCount: 3,
  stringsPerMppt: 1,
  maxInputCurrentPerMpptA: 16,
  nominalAcVoltageV: 220,
  maxAcCurrentA: 40,
} as const;

const referencePricing = (
  referenceTotalVnd: number,
  notes: string[],
): StandardPackageDefinition["pricing"] => ({
  referenceTotalVnd,
  priceStatus: "reference-only",
  vatRate: null,
  vatStatus: "unknown",
  sourceWrittenTotalVnd: null,
  bomComplete: false,
  bomLines: [],
  pricingNotes: notes,
});

const commonExclusions = [
  "Gia cường hoặc thay mới mái không nằm trong phạm vi cơ bản.",
  "Cáp, ống, tủ điện và vận chuyển vượt định mức phải khảo sát lại.",
  "Nâng cấp tủ điện tổng, chống sét hoặc tiếp địa hiện hữu nếu phát sinh.",
  "Giá chính thức, VAT và điều kiện thanh toán xác nhận sau khảo sát.",
];

const commonEngineeringReviews = [
  "Xác nhận pha điện tại công trình trước khi chốt inverter.",
  "Kiểm tra điện áp hở mạch, dòng làm việc, MPPT, số string và giới hạn PV theo đúng datasheet model giao thực tế.",
  "Kiểm tra bóng che, hướng mái, kết cấu mái và tuyến cáp trước khi chốt sản lượng.",
];

const samplePricing: StandardPackageDefinition["pricing"] = {
  referenceTotalVnd: 133_109_600,
  priceStatus: "source-quote",
  vatRate: 0.08,
  vatStatus: "ambiguous",
  sourceWrittenTotalVnd: 134_330_000,
  bomComplete: true,
  bomLines: [
    {
      code: "PANEL-RISEN-RSM132-8-720BHDG",
      category: "panel",
      description: "Tấm quang điện Risen HJT hai mặt kính 720 Wp",
      quantity: 10,
      unit: "tấm",
      unitPriceVnd: 2_684_860,
      totalVnd: 26_848_600,
      required: true,
    },
    {
      code: "INVERTER-SRNE-HESP486S100-H",
      category: "inverter",
      description: "Inverter Hybrid 1 pha 6 kWac, gồm datalogger",
      quantity: 1,
      unit: "bộ",
      unitPriceVnd: 20_520_000,
      totalVnd: 20_520_000,
      required: true,
    },
    {
      code: "BATTERY-YUNQIDA-YQD-512300-LFO",
      category: "battery",
      description: "Pin lưu trữ LiFePO4 Yunqida 16 kWh",
      quantity: 1,
      unit: "bộ",
      unitPriceVnd: 43_412_000,
      totalVnd: 43_412_000,
      required: true,
    },
    {
      code: "MOUNTING-ALUMINUM-MINI-RAIL",
      category: "mounting",
      description: "Hệ khung và phụ kiện cố định tấm lên khung sắt",
      quantity: 1,
      unit: "gói",
      unitPriceVnd: 2_692_000,
      totalVnd: 2_692_000,
      required: true,
      detailSubtotalToleranceVnd: 800,
      detailLines: [
        {
          description: "Mini rail nhôm",
          quantity: 36,
          unit: "cái",
          unitPriceVnd: 64_800,
          totalVnd: 2_332_800,
        },
        {
          description: "Kẹp giữa",
          quantity: 24,
          unit: "cái",
          unitPriceVnd: 10_000,
          totalVnd: 240_000,
        },
        {
          description: "Kẹp biên",
          quantity: 12,
          unit: "cái",
          unitPriceVnd: 10_000,
          totalVnd: 120_000,
        },
      ],
    },
    {
      code: "MOUNTING-STEEL-FRAME-10-PANELS",
      category: "mounting",
      description: "Phần khung sắt cho 10 tấm pin",
      quantity: 1,
      unit: "gói",
      unitPriceVnd: 15_600_000,
      totalVnd: 15_600_000,
      required: true,
    },
    {
      code: "ELECTRICAL-DB-HYBRID-1P-6K",
      category: "electrical",
      description: "Tủ điện Hybrid 1 pha 6 kW",
      quantity: 1,
      unit: "gói",
      unitPriceVnd: 5_880_000,
      totalVnd: 5_880_000,
      required: true,
    },
    {
      code: "ELECTRICAL-BOS-REFERENCE",
      category: "electrical",
      description: "Cáp DC/AC/PE, MC4, tiếp địa, ống và vật tư phụ",
      quantity: 1,
      unit: "gói",
      unitPriceVnd: 7_813_000,
      totalVnd: 7_813_000,
      required: true,
      detailSubtotalToleranceVnd: 600,
      detailLines: [
        {
          description: "Cáp DC 4 mm²",
          quantity: 200,
          unit: "m",
          unitPriceVnd: 16_800,
          totalVnd: 3_360_000,
        },
        {
          description: "Đầu MC4",
          quantity: 12,
          unit: "cặp",
          unitPriceVnd: 18_000,
          totalVnd: 216_000,
        },
        {
          description: "Cáp AC 10 mm²",
          quantity: 20,
          unit: "m",
          unitPriceVnd: 51_402,
          totalVnd: 1_028_040,
        },
        {
          description: "Dây PE 6 mm²",
          quantity: 20,
          unit: "m",
          unitPriceVnd: 32_237,
          totalVnd: 644_736,
        },
        {
          description: "Cọc tiếp địa",
          quantity: 1,
          unit: "cái",
          unitPriceVnd: 186_000,
          totalVnd: 186_000,
        },
        {
          description: "Ống điện 32, dài 2 m",
          quantity: 10,
          unit: "cây",
          unitPriceVnd: 43_920,
          totalVnd: 439_200,
        },
        {
          description: "Ống ruột gà sắt",
          quantity: 5,
          unit: "m",
          unitPriceVnd: 16_680,
          totalVnd: 83_400,
        },
        {
          description: "Đầu rắc 1 inch",
          quantity: 6,
          unit: "bộ",
          unitPriceVnd: 21_360,
          totalVnd: 128_160,
        },
        {
          description: "Vật tư phụ theo kWp",
          quantity: 7.2,
          unit: "kWp",
          unitPriceVnd: 240_000,
          totalVnd: 1_728_000,
        },
      ],
    },
    {
      code: "INSTALLATION-HYBRID-REFERENCE",
      category: "installation",
      description: "Vận chuyển, lắp đặt, chạy thử và chuyển giao",
      quantity: 1,
      unit: "gói",
      unitPriceVnd: 10_344_000,
      totalVnd: 10_344_000,
      required: true,
    },
    {
      code: "SERVICE-LOCAL-NOTIFICATION",
      category: "service",
      description: "Thủ tục thông báo phát triển điện mặt trời tự tiêu dùng",
      quantity: 1,
      unit: "gói",
      unitPriceVnd: 0,
      totalVnd: 0,
      required: false,
    },
  ],
  pricingNotes: [
    "Tổng số bằng trên báo giá là 133.109.600 đồng; phần chữ trên tài liệu ghi một số tiền khác.",
    "Chi tiết khung và vật tư điện lần lượt lệch 800 đồng và 536 đồng so với subtotal nguồn; giữ subtotal nguồn, chấp nhận dung sai đã ghi theo từng dòng và không tự cộng lại để thay giá báo giá mẫu.",
    "Không tự cộng thêm VAT 8% khi chưa xác định các đơn giá dòng đã gồm hay chưa gồm VAT.",
  ],
};

export const STANDARD_PACKAGE_CATALOG: readonly StandardPackageDefinition[] = [
  {
    code: "HOME-GT-1P-5K",
    phase: "single-phase",
    panel: {
      brand: "Risen",
      model: "RSM132-8-730BHDG",
      powerWp: 730,
      quantity: 8,
      lengthM: STANDARD_PANEL_LENGTH_M,
      widthM: STANDARD_PANEL_WIDTH_M,
    },
    inverter: { brand: "Solplanet", model: "ASW5000-S-G2", powerKw: 5 },
    battery: { nominalKwh: 0 },
    technicalReview: technicalDraft(
      "Đã có datasheet inverter; còn thiếu datasheet panel đang giao, layout/string, mái và điều kiện đấu nối của công trình.",
      [FORMULA_V1_EVIDENCE, SOLPLANET_3_TO_6K_G2_EVIDENCE],
    ),
    technicalDesign: gridTiedDraftDesign(SOLPLANET_5K_G2_ELECTRICAL),
    pricing: referencePricing(56_000_000, [
      "Chưa có BOM nhà cung cấp đầy đủ; chỉ dùng giá tham khảo để khách so sánh.",
    ]),
    includedScope: ["Tấm pin, inverter, BOS tiêu chuẩn và thi công cơ bản."],
    excludedScope: commonExclusions,
    engineeringReviewRequired: commonEngineeringReviews,
  },
  {
    code: "HOME-GT-1P-6K",
    phase: "single-phase",
    panel: {
      brand: "Risen",
      model: "RSM132-8-730BHDG",
      powerWp: 730,
      quantity: 9,
      lengthM: STANDARD_PANEL_LENGTH_M,
      widthM: STANDARD_PANEL_WIDTH_M,
    },
    inverter: { brand: "Solplanet", model: "ASW6000-S-G2", powerKw: 6 },
    battery: { nominalKwh: 0 },
    technicalReview: technicalDraft(
      "Đã có datasheet inverter; còn thiếu datasheet panel đang giao, layout/string, mái và điều kiện đấu nối của công trình.",
      [FORMULA_V1_EVIDENCE, SOLPLANET_3_TO_6K_G2_EVIDENCE],
    ),
    technicalDesign: gridTiedDraftDesign(
      SOLPLANET_6K_G2_ELECTRICAL,
      "Tỷ lệ DC/AC 1,095 thấp hơn ngưỡng V1 do số tấm tham chiếu; chỉ được duyệt sau khi kỹ sư xác nhận layout, sản lượng và giới hạn inverter.",
    ),
    pricing: referencePricing(62_000_000, [
      "Chưa có BOM nhà cung cấp đầy đủ; chỉ dùng giá tham khảo để khách so sánh.",
    ]),
    includedScope: ["Tấm pin, inverter, BOS tiêu chuẩn và thi công cơ bản."],
    excludedScope: commonExclusions,
    engineeringReviewRequired: commonEngineeringReviews,
  },
  {
    code: "HOME-GT-1P-8K",
    phase: "single-phase",
    panel: {
      brand: "Risen",
      model: "RSM132-8-730BHDG",
      powerWp: 730,
      quantity: 12,
      lengthM: STANDARD_PANEL_LENGTH_M,
      widthM: STANDARD_PANEL_WIDTH_M,
    },
    inverter: { brand: "Solplanet", model: "ASW8000-S", powerKw: 8 },
    battery: { nominalKwh: 0 },
    technicalReview: technicalDraft(
      "Đã hiệu chỉnh model inverter theo datasheet Solplanet 6–10 kW; còn thiếu datasheet panel đang giao, layout/string, mái và điều kiện đấu nối của công trình.",
      [FORMULA_V1_EVIDENCE, SOLPLANET_6_TO_10K_EVIDENCE],
    ),
    technicalDesign: gridTiedDraftDesign(
      SOLPLANET_8K_ELECTRICAL,
      "Tỷ lệ DC/AC 1,095 thấp hơn ngưỡng V1 do số tấm tham chiếu; chỉ được duyệt sau khi kỹ sư xác nhận layout, sản lượng và giới hạn inverter.",
    ),
    pricing: referencePricing(83_000_000, [
      "Chưa có BOM nhà cung cấp đầy đủ; chỉ dùng giá tham khảo để khách so sánh.",
    ]),
    includedScope: ["Tấm pin, inverter, BOS tiêu chuẩn và thi công cơ bản."],
    excludedScope: commonExclusions,
    engineeringReviewRequired: commonEngineeringReviews,
  },
  {
    code: "HOME-HY-1P-6K-16K",
    phase: "single-phase",
    panel: {
      brand: "Risen",
      model: "RSM132-8-730BHDG",
      powerWp: 730,
      quantity: 8,
      lengthM: STANDARD_PANEL_LENGTH_M,
      widthM: STANDARD_PANEL_WIDTH_M,
    },
    inverter: { brand: "SRNE", model: "HESP486S100-H", powerKw: 6 },
    battery: { nominalKwh: 16.07 },
    technicalReview: technicalDraft(
      "Báo giá mẫu và bảng giá đại lý ghi hai mã inverter khác nhau; cần datasheet chính thức để xác nhận SKU, MPPT, pin tương thích và tải backup.",
      [
        FORMULA_V1_EVIDENCE,
        SOLARPEAK_SAMPLE_QUOTE_EVIDENCE,
        SRNE_DEALER_PRICE_LIST_EVIDENCE,
      ],
    ),
    technicalDesign: hybridDraftDesign(
      "Tỷ lệ DC/AC 0,973 thấp hơn ngưỡng V1 do số tấm tham chiếu; không phát hành báo giá chốt trước khi kỹ sư xác nhận thiết kế và khả năng mở rộng dàn pin.",
    ),
    pricing: referencePricing(110_000_000, [
      "Chưa có BOM nhà cung cấp đầy đủ; dung lượng pin là cấu hình tham khảo.",
    ]),
    includedScope: ["Tấm pin, inverter hybrid, pin lưu trữ, tủ điện, BOS và thi công cơ bản."],
    excludedScope: commonExclusions,
    engineeringReviewRequired: [
      ...commonEngineeringReviews,
      "Xác nhận công suất tải backup và thời lượng dự phòng; 16 kWh không đồng nghĩa cấp được mọi tải trong 16 giờ.",
    ],
  },
  {
    code: "HOME-HY-1P-7K2-16K",
    phase: "single-phase",
    panel: {
      brand: "Risen",
      model: "RSM132-8-720BHDG",
      powerWp: 720,
      quantity: 10,
      lengthM: STANDARD_PANEL_LENGTH_M,
      widthM: STANDARD_PANEL_WIDTH_M,
    },
    inverter: { brand: "SRNE", model: "HESP486S100-H", powerKw: 6 },
    battery: { nominalKwh: 16 },
    technicalReview: technicalDraft(
      "Cấu hình theo báo giá mẫu có BOM, nhưng mã inverter khác bảng giá đại lý; cần datasheet chính thức để xác nhận SKU, MPPT, pin tương thích và tải backup.",
      [
        FORMULA_V1_EVIDENCE,
        SOLARPEAK_SAMPLE_QUOTE_EVIDENCE,
        SRNE_DEALER_PRICE_LIST_EVIDENCE,
      ],
    ),
    technicalDesign: hybridDraftDesign(),
    pricing: samplePricing,
    includedScope: [
      "Theo cấu hình và phạm vi trong báo giá mẫu: thiết bị chính, khung, tủ điện, vật tư, lắp đặt và chạy thử.",
    ],
    excludedScope: [
      "Mọi phát sinh do khảo sát khác báo giá mẫu phải được lập phụ lục trước khi thi công.",
      ...commonExclusions,
    ],
    engineeringReviewRequired: [
      ...commonEngineeringReviews,
      "Đối chiếu lại model, dòng panel, giới hạn MPPT và sơ đồ string; không lấy tên model trong báo giá mẫu làm kết luận tương thích cuối cùng.",
    ],
  },
  {
    code: "HOME-HY-3P-8K-16K",
    phase: "three-phase",
    panel: {
      brand: "Risen",
      model: "RSM132-8-730BHDG",
      powerWp: 730,
      quantity: 12,
      lengthM: STANDARD_PANEL_LENGTH_M,
      widthM: STANDARD_PANEL_WIDTH_M,
    },
    inverter: { brand: "SRNE", model: "HESP4880SHD3", powerKw: 8 },
    battery: { nominalKwh: 16.07 },
    technicalReview: technicalDraft(
      "Bảng giá đại lý xác nhận mã và giá inverter, nhưng chưa có datasheet chính thức, bảng tương thích pin, layout/string và sơ đồ backup 3 pha.",
      [FORMULA_V1_EVIDENCE, SRNE_DEALER_PRICE_LIST_3P_8K_EVIDENCE],
    ),
    technicalDesign: hybridDraftDesign(
      "Tỷ lệ DC/AC 1,095 thấp hơn ngưỡng V1 do số tấm tham chiếu; chỉ được duyệt sau khi kỹ sư xác nhận layout, sản lượng và giới hạn inverter.",
    ),
    pricing: referencePricing(135_000_000, [
      "Chưa có BOM nhà cung cấp đầy đủ; chỉ dùng giá tham khảo để khách so sánh.",
    ]),
    includedScope: ["Tấm pin, inverter hybrid 3 pha, pin lưu trữ, BOS và thi công cơ bản."],
    excludedScope: commonExclusions,
    engineeringReviewRequired: [
      ...commonEngineeringReviews,
      "Xác nhận sơ đồ cấp tải 3 pha và tải ưu tiên trước khi hứa hẹn khả năng backup.",
    ],
  },
  {
    code: "HOME-HY-3P-12K-16K",
    phase: "three-phase",
    panel: {
      brand: "Risen",
      model: "RSM132-8-730BHDG",
      powerWp: 730,
      quantity: 16,
      lengthM: STANDARD_PANEL_LENGTH_M,
      widthM: STANDARD_PANEL_WIDTH_M,
    },
    inverter: { brand: "SRNE", model: "HESP48120SH3", powerKw: 12 },
    battery: { nominalKwh: 16.07 },
    technicalReview: technicalDraft(
      "Bảng giá đại lý xác nhận mã và giá inverter, nhưng chưa có datasheet chính thức, bảng tương thích pin, layout/string và sơ đồ backup 3 pha.",
      [FORMULA_V1_EVIDENCE, SRNE_DEALER_PRICE_LIST_3P_12K_EVIDENCE],
    ),
    technicalDesign: hybridDraftDesign(
      "Tỷ lệ DC/AC 0,973 thấp hơn ngưỡng V1 do số tấm tham chiếu; không phát hành báo giá chốt trước khi kỹ sư xác nhận thiết kế và khả năng mở rộng dàn pin.",
    ),
    pricing: referencePricing(155_000_000, [
      "Chưa có BOM nhà cung cấp đầy đủ; chỉ dùng giá tham khảo để khách so sánh.",
    ]),
    includedScope: ["Tấm pin, inverter hybrid 3 pha, pin lưu trữ, BOS và thi công cơ bản."],
    excludedScope: commonExclusions,
    engineeringReviewRequired: [
      ...commonEngineeringReviews,
      "Xác nhận sơ đồ cấp tải 3 pha, giới hạn công suất backup và phương án mở rộng pin nếu cần.",
    ],
  },
] as const;
