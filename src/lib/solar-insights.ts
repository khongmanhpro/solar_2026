import { CALCULATION_CONSTANTS } from "@/config/defaults";
import type {
  SolarCalculationInput,
  SolarPackage,
  UnscoredPackageCalculationResult,
} from "@/types/solar";

export interface GenerateSolarInsightsParams {
  input: SolarCalculationInput;
  solarPackage: SolarPackage;
  result: UnscoredPackageCalculationResult;
}

export function generateSolarInsights({
  input,
  solarPackage,
  result,
}: GenerateSolarInsightsParams): string[] {
  const insights: string[] = [];

  if (
    input.daytimeUsageLevel === "high" &&
    solarPackage.systemType === "grid-tied"
  ) {
    insights.push(
      "Bạn sử dụng nhiều điện vào ban ngày nên hệ thống hòa lưới có khả năng mang lại hiệu quả tiết kiệm tốt.",
    );
  }

  const roofUtilization =
    input.roofAreaM2 !== null && input.roofAreaM2 > 0
      ? solarPackage.requiredRoofAreaM2 / input.roofAreaM2
      : 0;

  if (input.roofAreaM2 === null) {
    insights.push(
      "Bạn chưa cung cấp diện tích mái. Gói đang hiển thị là phương án tham khảo theo nhu cầu điện, chưa xác nhận có thể lắp trên mái thực tế.",
    );
  }

  if (
    roofUtilization >= CALCULATION_CONSTANTS.roofConstraintInsightThreshold
  ) {
    insights.push(
      "Diện tích mái hiện tại giới hạn số lượng tấm pin có thể lắp. Gói được đề xuất đã được chọn trong phạm vi diện tích mái bạn cung cấp.",
    );
  }

  if (input.backupRequired && solarPackage.systemType === "hybrid") {
    insights.push(
      "Bạn chọn nhu cầu điện dự phòng nên hệ thống ưu tiên inverter hybrid và pin lưu trữ. Dung lượng pin chỉ là tham khảo cho đến khi xác nhận tải thiết yếu và số giờ cần dùng.",
    );
  }

  if (result.solarSurplusKwh > 0) {
    insights.push(
      "Hệ thống có thể tạo ra một phần điện dư. Mức tiết kiệm thực tế phụ thuộc vào khả năng sử dụng điện trong thời gian hệ thống phát điện.",
    );
  }

  return insights;
}
