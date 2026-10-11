"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatKwh, formatVnd } from "@/lib/formatters";
import type { MonthlyBreakdownEntry } from "@/types/solar";

interface MonthlyEnergyChartProps {
  months: MonthlyBreakdownEntry[];
  hasBattery: boolean;
  seasonalData: boolean;
}

const kwhFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export function MonthlyEnergyChart({ months, hasBattery, seasonalData }: MonthlyEnergyChartProps) {
  if (months.length !== 12) return null;
  const data = months.map((month) => ({
    label: `T${month.month}`,
    direct: Math.round(month.directSolarUseKwh),
    battery: Math.round(month.batteryDischargeKwh),
    grid: Math.round(month.gridImportKwh),
    surplus: Math.round(month.surplusKwh),
  }));
  const weakest = months.reduce((low, month) => (month.savingsVnd < low.savingsVnd ? month : low));
  const strongest = months.reduce((high, month) => (month.savingsVnd > high.savingsVnd ? month : high));

  return (
    <figure>
      <div
        aria-label="Biểu đồ 12 tháng: điện dùng từ mặt trời, từ pin và từ lưới điện"
        className="h-72 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-2 pb-2 pt-5 sm:h-80 sm:px-4"
        role="img"
      >
        <ResponsiveContainer height="100%" minWidth={0} width="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="var(--muted)" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              stroke="var(--muted)"
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => kwhFormatter.format(value)}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value, name) => [`${kwhFormatter.format(Number(value))} kWh`, String(name)]}
              labelFormatter={(label) => `Tháng ${String(label).slice(1)}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="direct" fill="var(--sun)" name="Điện mặt trời dùng trực tiếp" stackId="use" />
            {hasBattery ? <Bar dataKey="battery" fill="var(--brand)" name="Điện từ pin" stackId="use" /> : null}
            <Bar dataKey="grid" fill="var(--line-strong)" name="Điện mua từ EVN" radius={[4, 4, 0, 0]} stackId="use" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {seasonalData
          ? `Tiết kiệm thấp nhất vào tháng ${weakest.month} (${formatVnd(weakest.savingsVnd)}), cao nhất vào tháng ${strongest.month} (${formatVnd(strongest.savingsVnd)}). Mức tiêu thụ mỗi tháng đang giữ bằng mức trung bình bạn cung cấp.`
          : "Tỉnh này chưa có dữ liệu sản lượng theo mùa đã đồng bộ; các tháng đang dùng sản lượng trung bình."}
      </figcaption>
      <details className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--admin-panel)] p-4 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-[var(--ink)]">Xem bảng số liệu 12 tháng</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left">
            <thead className="text-xs uppercase tracking-[0.06em] text-[var(--muted)]">
              <tr>
                <th className="py-2 pr-3 font-semibold" scope="col">Tháng</th>
                <th className="py-2 pr-3 font-semibold" scope="col">Sản lượng</th>
                <th className="py-2 pr-3 font-semibold" scope="col">Dùng trực tiếp</th>
                {hasBattery ? <th className="py-2 pr-3 font-semibold" scope="col">Từ pin</th> : null}
                <th className="py-2 pr-3 font-semibold" scope="col">Mua EVN</th>
                <th className="py-2 pr-3 font-semibold" scope="col">Dư</th>
                <th className="py-2 font-semibold" scope="col">Tiết kiệm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {months.map((month) => (
                <tr key={month.month}>
                  <th className="py-2 pr-3 font-semibold" scope="row">{month.month}</th>
                  <td className="py-2 pr-3">{formatKwh(Math.round(month.generationKwh))}</td>
                  <td className="py-2 pr-3">{formatKwh(Math.round(month.directSolarUseKwh))}</td>
                  {hasBattery ? <td className="py-2 pr-3">{formatKwh(Math.round(month.batteryDischargeKwh))}</td> : null}
                  <td className="py-2 pr-3">{formatKwh(Math.round(month.gridImportKwh))}</td>
                  <td className="py-2 pr-3">{formatKwh(Math.round(month.surplusKwh))}</td>
                  <td className="py-2 font-semibold">{formatVnd(month.savingsVnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
