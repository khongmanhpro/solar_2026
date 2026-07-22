"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatVnd } from "@/lib/formatters";
import type { CashFlowPoint } from "@/types/solar";

interface CashFlowChartProps {
  data: CashFlowPoint[];
  breakEvenYear: number | null;
}

const compactCurrencyFormatter = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function CashFlowChart({ data, breakEvenYear }: CashFlowChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--paper)] p-8 text-center">
        <div>
          <p className="text-xl font-semibold text-[var(--ink)]">
            Chưa có dữ liệu dòng tiền
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Hãy chọn một gói có đủ dữ liệu giá và mức tiết kiệm để xem biểu đồ.
          </p>
        </div>
      </div>
    );
  }

  const breakEvenPoint =
    breakEvenYear === null
      ? null
      : data.find((point) => point.year === breakEvenYear) ?? null;

  return (
    <figure>
      <div
        aria-label="Biểu đồ dòng tiền tích lũy từ năm 0 đến năm 20"
        className="h-64 sm:h-80 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-2 pb-2 pt-5 sm:px-4"
        role="img"
      >
        <ResponsiveContainer height="100%" minWidth={0} width="100%">
          <AreaChart data={data} margin={{ top: 18, right: 16, bottom: 6, left: 0 }}>
            <defs>
              <linearGradient id="cashFlowFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 5" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="year"
              minTickGap={16}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              tickFormatter={(value: number) => compactCurrencyFormatter.format(value)}
              tickLine={false}
              width={64}
            />
            <Tooltip
              contentStyle={{
                background: "var(--ink)",
                border: "1px solid var(--ink)",
                borderRadius: "12px",
                color: "var(--paper)",
                fontSize: "12px",
              }}
              cursor={{ stroke: "var(--sun)", strokeWidth: 1 }}
              formatter={(value) => [formatVnd(Number(value)), "Dòng tiền tích lũy"]}
              labelFormatter={(year) => `Năm ${year}`}
              labelStyle={{ color: "var(--paper)", fontWeight: 700 }}
            />
            <ReferenceLine stroke="var(--danger-line)" strokeDasharray="4 4" y={0} />
            {breakEvenPoint ? (
              <ReferenceDot
                fill="var(--sun)"
                r={6}
                stroke="var(--paper)"
                strokeWidth={3}
                x={breakEvenPoint.year}
                y={breakEvenPoint.cumulativeCashFlowVnd}
              />
            ) : null}
            <Area
              dataKey="cumulativeCashFlowVnd"
              fill="url(#cashFlowFill)"
              isAnimationActive={false}
              name="Dòng tiền tích lũy"
              stroke="var(--brand)"
              strokeWidth={3}
              type="linear"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-[var(--muted)]">
        <span>Năm 0 bắt đầu từ chi phí đầu tư của gói.</span>
        <span className="font-semibold text-[var(--ink)]">
          {breakEvenYear === null
            ? "Chưa có mốc hòa vốn trong 20 năm"
            : `Mốc hòa vốn: năm ${breakEvenYear}`}
        </span>
      </figcaption>
    </figure>
  );
}
