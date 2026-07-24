import type {
  ElectricityTariffRegistry,
  ElectricityTariffVersion,
  TariffSelectionErrorCode,
  TariffSelectionPoint,
  TariffSelectionRequest,
  VatRuleVersion,
  VatSelectionRequest,
} from "@/types/electricity-tariff";

export class TariffSelectionError extends Error {
  readonly code: TariffSelectionErrorCode;

  constructor(code: TariffSelectionErrorCode, message: string) {
    super(message);
    this.name = "TariffSelectionError";
    this.code = code;
  }
}

function assertIsoDate(value: string): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new TariffSelectionError(
      "INVALID_DATE",
      `Ngày ${value} phải có định dạng YYYY-MM-DD.`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new TariffSelectionError(
      "INVALID_DATE",
      `Ngày ${value} không tồn tại trên lịch.`,
    );
  }
}

function resolveSelectionDates(point: TariffSelectionPoint): {
  start: string;
  end: string;
} {
  if (point.date !== undefined) {
    assertIsoDate(point.date);
    return { start: point.date, end: point.date };
  }

  const match = /^(\d{4})-(\d{2})$/.exec(point.period);
  if (!match) {
    throw new TariffSelectionError(
      "INVALID_PERIOD",
      `Kỳ ${point.period} phải có định dạng YYYY-MM.`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new TariffSelectionError(
      "INVALID_PERIOD",
      `Kỳ ${point.period} không tồn tại trên lịch.`,
    );
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${match[1]}-${match[2]}-01`,
    end: `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`,
  };
}

function listIsoDatesInclusive(start: string, end: string): string[] {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const cursor = new Date(
    Date.UTC(startYear ?? 0, (startMonth ?? 1) - 1, startDay ?? 1),
  );
  const last = Date.UTC(endYear ?? 0, (endMonth ?? 1) - 1, endDay ?? 1);
  const dates: string[] = [];

  while (cursor.getTime() <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function isEffectiveOn(
  effectivePeriod: { from: string | null; to: string | null },
  date: string,
): boolean {
  return (
    effectivePeriod.from !== null &&
    effectivePeriod.from <= date &&
    (effectivePeriod.to === null || date <= effectivePeriod.to)
  );
}

function isInternallyApproved(item: {
  status: string;
  approvalStatus: string;
}): boolean {
  return (
    item.approvalStatus === "approved" &&
    (item.status === "verified" || item.status === "retired")
  );
}

function selectTariffOnDate(
  registry: ElectricityTariffRegistry,
  date: string,
  request: TariffSelectionRequest,
): ElectricityTariffVersion {
  const electricityType = request.electricityType ?? "residential";
  const matches = registry.tariffs.filter(
    (tariff) =>
      tariff.electricityType === electricityType &&
      isEffectiveOn(tariff.effectivePeriod, date),
  );
  const selectableMatches = matches.filter((tariff) => tariff.selectable);

  if (selectableMatches.length === 0) {
    if (matches.length > 0) {
      throw new TariffSelectionError(
        "TARIFF_NOT_SELECTABLE",
        `Biểu giá khớp ngày ${date} đang bị khóa lựa chọn.`,
      );
    }

    throw new TariffSelectionError(
      "TARIFF_GAP",
      `Chưa có biểu giá ${electricityType} bao phủ ngày ${date}.`,
    );
  }

  if (selectableMatches.length > 1) {
    throw new TariffSelectionError(
      "TARIFF_OVERLAP",
      `Có ${selectableMatches.length} biểu giá cùng bao phủ ngày ${date}.`,
    );
  }

  const selected = selectableMatches[0];
  if (!selected) {
    throw new TariffSelectionError(
      "TARIFF_GAP",
      `Chưa có biểu giá ${electricityType} bao phủ ngày ${date}.`,
    );
  }

  if (!request.allowUnapproved && !isInternallyApproved(selected)) {
    throw new TariffSelectionError(
      "TARIFF_UNAPPROVED",
      `Biểu giá ${selected.version} chưa được phê duyệt nội bộ.`,
    );
  }

  return selected;
}

function selectVatRuleOnDate(
  registry: ElectricityTariffRegistry,
  date: string,
  request: VatSelectionRequest,
): VatRuleVersion {
  const matches = registry.vatRules.filter((vatRule) =>
    isEffectiveOn(vatRule.effectivePeriod, date),
  );
  const selectableMatches = matches.filter((vatRule) => vatRule.selectable);

  if (selectableMatches.length === 0) {
    if (matches.length > 0) {
      throw new TariffSelectionError(
        "VAT_RULE_NOT_SELECTABLE",
        `Quy tắc VAT khớp ngày ${date} đang bị khóa lựa chọn.`,
      );
    }

    throw new TariffSelectionError(
      "VAT_RULE_GAP",
      `Chưa có quy tắc VAT bao phủ ngày ${date}.`,
    );
  }

  if (selectableMatches.length > 1) {
    throw new TariffSelectionError(
      "VAT_RULE_OVERLAP",
      `Có ${selectableMatches.length} quy tắc VAT cùng bao phủ ngày ${date}.`,
    );
  }

  const selected = selectableMatches[0];
  if (!selected) {
    throw new TariffSelectionError(
      "VAT_RULE_GAP",
      `Chưa có quy tắc VAT bao phủ ngày ${date}.`,
    );
  }

  if (!request.allowUnapproved && !isInternallyApproved(selected)) {
    throw new TariffSelectionError(
      "VAT_RULE_UNAPPROVED",
      `Quy tắc VAT ${selected.version} chưa được phê duyệt nội bộ.`,
    );
  }

  return selected;
}

export function selectElectricityTariff(
  registry: ElectricityTariffRegistry,
  request: TariffSelectionRequest,
): ElectricityTariffVersion {
  const dates = resolveSelectionDates(request);
  const selectedByDay = listIsoDatesInclusive(dates.start, dates.end).map(
    (date) => selectTariffOnDate(registry, date, request),
  );
  const selected = selectedByDay[0];
  if (!selected) {
    throw new TariffSelectionError(
      "TARIFF_GAP",
      `Chưa có biểu giá bao phủ kỳ yêu cầu.`,
    );
  }

  if (selectedByDay.some((tariff) => tariff.version !== selected.version)) {
    throw new TariffSelectionError(
      "TARIFF_PERIOD_SPANS_VERSIONS",
      `Kỳ ${request.period} đi qua nhiều phiên bản biểu giá.`,
    );
  }

  return selected;
}

export function selectVatRule(
  registry: ElectricityTariffRegistry,
  request: VatSelectionRequest,
): VatRuleVersion {
  const dates = resolveSelectionDates(request);
  const selectedByDay = listIsoDatesInclusive(dates.start, dates.end).map(
    (date) => selectVatRuleOnDate(registry, date, request),
  );
  const selected = selectedByDay[0];
  if (!selected) {
    throw new TariffSelectionError(
      "VAT_RULE_GAP",
      `Chưa có quy tắc VAT bao phủ kỳ yêu cầu.`,
    );
  }

  if (selectedByDay.some((vatRule) => vatRule.version !== selected.version)) {
    throw new TariffSelectionError(
      "VAT_RULE_PERIOD_SPANS_VERSIONS",
      `Kỳ ${request.period} đi qua nhiều phiên bản VAT.`,
    );
  }

  return selected;
}

export function selectBillingRules(
  registry: ElectricityTariffRegistry,
  request: TariffSelectionRequest,
): { tariff: ElectricityTariffVersion; vatRule: VatRuleVersion } {
  return {
    tariff: selectElectricityTariff(registry, request),
    vatRule: selectVatRule(registry, request),
  };
}

export function selectElectricityTariffByVersion(
  registry: ElectricityTariffRegistry,
  version: string,
  options: { allowUnapproved?: boolean } = {},
): ElectricityTariffVersion {
  const tariff = registry.tariffs.find(
    (candidate) => candidate.version === version,
  );

  if (!tariff) {
    throw new TariffSelectionError(
      "TARIFF_VERSION_NOT_FOUND",
      `Không tìm thấy phiên bản biểu giá ${version}.`,
    );
  }

  if (!tariff.selectable) {
    throw new TariffSelectionError(
      "TARIFF_NOT_SELECTABLE",
      `Biểu giá ${version} đang bị khóa lựa chọn.`,
    );
  }

  if (!options.allowUnapproved && !isInternallyApproved(tariff)) {
    throw new TariffSelectionError(
      "TARIFF_UNAPPROVED",
      `Biểu giá ${version} chưa được phê duyệt nội bộ.`,
    );
  }

  return tariff;
}

export function selectVatRuleByVersion(
  registry: ElectricityTariffRegistry,
  version: string,
  options: { allowUnapproved?: boolean } = {},
): VatRuleVersion {
  const vatRule = registry.vatRules.find(
    (candidate) => candidate.version === version,
  );

  if (!vatRule) {
    throw new TariffSelectionError(
      "VAT_RULE_VERSION_NOT_FOUND",
      `Không tìm thấy phiên bản VAT ${version}.`,
    );
  }

  if (!vatRule.selectable) {
    throw new TariffSelectionError(
      "VAT_RULE_NOT_SELECTABLE",
      `Quy tắc VAT ${version} đang bị khóa lựa chọn.`,
    );
  }

  if (!options.allowUnapproved && !isInternallyApproved(vatRule)) {
    throw new TariffSelectionError(
      "VAT_RULE_UNAPPROVED",
      `Quy tắc VAT ${version} chưa được phê duyệt nội bộ.`,
    );
  }

  return vatRule;
}
