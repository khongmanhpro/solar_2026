import type {
  DaytimeUsageLevel,
  ElectricityType,
  LeadStatus,
  PreferredContactTime,
  SolarSystemType,
} from "@/types/solar";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  survey_scheduled: "Hẹn khảo sát",
  quoted: "Đã báo giá",
  won: "Thành công",
  lost: "Không phù hợp",
};

export const CONTACT_TIME_LABELS: Record<PreferredContactTime, string> = {
  morning: "Buổi sáng",
  afternoon: "Buổi chiều",
  evening: "Buổi tối",
  anytime: "Bất kỳ lúc nào",
};

export const DAYTIME_USAGE_LABELS: Record<DaytimeUsageLevel, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

export const ELECTRICITY_TYPE_LABELS: Record<ElectricityType, string> = {
  residential: "Điện sinh hoạt hộ gia đình",
};

export const SYSTEM_TYPE_LABELS: Record<SolarSystemType, string> = {
  "grid-tied": "Hòa lưới",
  hybrid: "Hybrid + lưu trữ",
};
