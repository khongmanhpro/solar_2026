import { describe, expect, it } from "vitest";

import {
  assessDraftPackageImport,
  buildMarketDataCandidate,
  buildTrialMarketRelease,
  hasBlockingImportIssues,
  type WorkbookSheetData,
} from "@/lib/market-data-import";

function sheet(sheetName: string, headers: string[], rows: unknown[][]): WorkbookSheetData {
  return {
    sheet: sheetName,
    data: [["Tiêu đề"], headers, ...rows] as WorkbookSheetData["data"],
  };
}

const packageHeaders = [
  "Mã gói * (code)", "Tên gói * (name)", "Mô tả *", "Đang bán * (active)", "Thứ tự *", "Loại hệ thống *", "Giá V1 tham khảo VND *", "Giá gồm VAT? *", "Thuế suất VAT", "Công suất DC kWp *", "Sản lượng nền kWh/tháng *", "Diện tích mái tối thiểu m² *", "Pin lưu trữ danh định kWh *", "Tóm tắt thiết bị *", "Hãng tấm pin *", "Model tấm pin *", "Công suất tấm Wp", "Số tấm", "Hãng inverter *", "Model inverter *", "Công suất inverter kW", "Dung lượng khả dụng kWh", "BH tấm pin năm *", "BH inverter năm *", "Nguồn giá/báo giá *", "Ghi chú", "Số pha *", "Trạng thái dữ liệu", "Được công bố?", "Thiếu bắt buộc", "apiKey",
];

function baseSheets(packageRows: unknown[][]): WorkbookSheetData[] {
  return [
    sheet("GOI_SAN_PHAM", packageHeaders, packageRows),
    sheet("THIET_BI", ["SKU *", "Loại thiết bị *", "Hãng *", "Model *", "Đang sử dụng *", "apiKey"], [["PANEL-1", "Tấm pin", "Risen", "RSM", "Có", "panel_1"]]),
    sheet("SAN_LUONG_KHU_VUC", ["Mã tỉnh/điểm *", "Trạng thái dữ liệu"], [["ha-noi", "CHỜ DỮ LIỆU"]]),
    sheet("CA_NGHIEM_THU", ["Mã ca *", "Kỹ sư duyệt *", "Trạng thái *"], [["CASE-1", null, "CHƯA TẠO"]]),
    sheet("VUNG_PHUC_VU", ["provinceCode *", "Tên tỉnh/thành", "Mức phục vụ *", "Đã xác minh?", "Trạng thái"], [["ha-noi", "Hà Nội", null, "Không", "THIẾU"]]),
    sheet("BANG_GIA_NCC", ["Nhóm", "Hãng", "Model", "Đơn vị", "Giá 1–2", "Đã gồm VAT?", "Nguồn báo giá"], [["Tấm pin", "Risen", "RSM", "tấm", 2_000_000, "Có", "quote.pdf"]]),
    sheet(
      "GIA_DINH_TAI_CHINH",
      [
        "Nhóm",
        "Biến hệ thống *",
        "Mô tả *",
        "Giá trị nhà cung cấp *",
        "Đơn vị",
        "Giá trị đang dùng (demo)",
        "Nguồn/tài liệu *",
        "Trạng thái production",
      ],
      [
        ["Điện", "averageElectricityPriceVndPerKwh", "Giá điện bình quân", 3769, "VND/kWh", 2800, null, "CHỜ DUYỆT"],
        ["Pin", "batteryRoundTripEfficiency", "Hiệu suất pin", 85, "%", 0.9, null, "CHỜ DUYỆT"],
        ["Vòng đời", "systemLifetimeYears", "Vòng đời", 10, "năm", 20, null, "CHỜ DUYỆT"],
        ["Vận hành", "maintenanceRatePerYear", "Bảo trì", 3, "%/năm", 0, null, "CHỜ DUYỆT"],
      ],
    ),
  ];
}

const draftPackage = [
  "GT-1P-5K", "Hòa lưới 5 kW", "Gói ứng viên", "Không", 1, "Hòa lưới", 56_000_000, "Chưa xác định", null, 5.84, null, null, 0, "8 tấm + inverter", "Risen", "RSM", 730, 8, "Solplanet", "ASW5000", 5, null, 15, 10, "Ước lượng thị trường", "Chỉ dùng demo", "1 pha", "CHƯA XÁC NHẬN", "Không", "VAT; mái; sản lượng", "pkg_gt_1p_5k",
];

describe("market data workbook import", () => {
  it("keeps estimated unpublished workbook data as a non-production candidate", () => {
    const bundle = buildMarketDataCandidate(baseSheets([draftPackage]), { fileName: "market.xlsx", sourceSha256: "a".repeat(64) });
    expect(hasBlockingImportIssues(bundle)).toBe(false);
    expect(bundle.packages).toHaveLength(1);
    expect(bundle.packages[0]).toMatchObject({ importStatus: "draft", priceIsEstimate: true, sourcePublished: false, currentEngineCompatible: false });
    expect(bundle.governance.productionReady).toBe(false);
    expect(bundle.impact.databaseWrites).toBe(false);
    expect(bundle.readiness.productionBlockers).toContain("Không có gói nào vừa đang bán vừa được công bố.");
  });

  it("rejects duplicate package codes before any import can run", () => {
    const second = [...draftPackage];
    second[30] = "pkg_duplicate";
    const bundle = buildMarketDataCandidate(baseSheets([draftPackage, second]), { fileName: "market.xlsx", sourceSha256: "b".repeat(64) });
    expect(hasBlockingImportIssues(bundle)).toBe(true);
    expect(bundle.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "DUPLICATE_PACKAGE_CODE", severity: "error" })]));
  });

  it("never auto-promotes a structurally complete package to verified", () => {
    const complete = [...draftPackage];
    complete[3] = "Có";
    complete[7] = "Có";
    complete[10] = 700;
    complete[11] = 35;
    complete[24] = "Báo giá chính thức";
    complete[25] = "Đã đối chiếu";
    complete[27] = "ĐÃ DUYỆT";
    complete[28] = "Có";
    const bundle = buildMarketDataCandidate(baseSheets([complete]), { fileName: "market.xlsx", sourceSha256: "c".repeat(64) });
    expect(bundle.packages[0].importStatus).toBe("draft");
    expect(bundle.governance.autoApprovalAllowed).toBe(false);
    expect(bundle.governance.productionReady).toBe(false);
  });

  it("blocks database import when no package is compatible with the current engine", () => {
    const bundle = buildMarketDataCandidate(baseSheets([draftPackage]), { fileName: "market.xlsx", sourceSha256: "d".repeat(64) });
    expect(assessDraftPackageImport(bundle)).toEqual(expect.objectContaining({
      allowed: false,
      importablePackages: [],
      blockers: expect.arrayContaining(["Không có gói nào đủ trường bắt buộc của engine hiện tại."]),
    }));
  });

  it("refuses to overwrite an existing package code", () => {
    const complete = [...draftPackage];
    complete[3] = "Có";
    complete[7] = "Có";
    complete[10] = 700;
    complete[11] = 35;
    complete[24] = "Báo giá chính thức";
    complete[25] = "Đã đối chiếu";
    complete[27] = "ĐÃ DUYỆT";
    complete[28] = "Có";
    const bundle = buildMarketDataCandidate(baseSheets([complete]), { fileName: "market.xlsx", sourceSha256: "e".repeat(64) });
    expect(assessDraftPackageImport(bundle, ["GT-1P-5K"]).allowed).toBe(false);
    expect(assessDraftPackageImport(bundle, ["GT-1P-5K"]).blockers[0]).toContain("Không ghi đè package đã tồn tại");
  });

  it("refuses a partial dataset import", () => {
    const complete = [...draftPackage];
    complete[0] = "GT-1P-6K";
    complete[30] = "pkg_gt_1p_6k";
    complete[3] = "Có";
    complete[7] = "Có";
    complete[10] = 700;
    complete[11] = 35;
    complete[24] = "Báo giá chính thức";
    complete[25] = "Đã đối chiếu";
    complete[27] = "ĐÃ DUYỆT";
    complete[28] = "Có";
    const bundle = buildMarketDataCandidate(
      baseSheets([complete, draftPackage]),
      { fileName: "market.xlsx", sourceSha256: "f".repeat(64) },
    );
    const preflight = assessDraftPackageImport(bundle);
    expect(preflight.allowed).toBe(false);
    expect(preflight.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Không nhập một phần dataset"),
      ]),
    );
  });

  it("builds an explicitly draft trial release from incomplete packages", () => {
    const bundle = buildMarketDataCandidate(baseSheets([draftPackage]), {
      fileName: "market.xlsx",
      sourceSha256: "1".repeat(64),
    });
    const release = buildTrialMarketRelease(bundle);

    expect(release.dataVersion).toBe("market-data-trial-111111111111-v1");
    expect(release.packages[0]).toMatchObject({
      code: "GT-1P-5K",
      priceVnd: 56_000_000,
      baseMonthlyGenerationKwh: 700.8,
      requiredRoofAreaM2: 28.6,
      electricalPhase: "single-phase",
    });
    expect(release.packages[0].sourceReference).toContain(
      "trial-derived-generation:120 kWh/kWp/month",
    );
    expect(release.calculationAssumptions).toEqual({
      averageElectricityPriceVndPerKwh: 3769,
      batteryRoundTripEfficiency: 0.85,
      systemLifetimeYears: 10,
      maintenanceRatePerYear: 0.03,
    });
  });
});
