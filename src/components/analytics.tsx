"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartNoAxesCombined } from "lucide-react";
import { formatMoney } from "@/lib/expenses";
export function Analytics({
  data,
  currency,
}: {
  data: { label: string; amountMinor: number }[];
  currency: string;
}) {
  if (!data.length)
    return (
      <div className="empty-state">
        <ChartNoAxesCombined size={36} />
        <h3>Give your spending some perspective</h3>
        <p>Add an expense to see your spending here, or try another filter.</p>
      </div>
    );
  return (
    <div className="h-72 w-full" role="img" aria-label="Monthly spending chart">
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 15, right: 15, left: 15, bottom: 10 }}
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickFormatter={(value) => String(Number(value) / 100)}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
            formatter={(value) => [
              formatMoney(Number(value), currency),
              "Spending",
            ]}
          />
          <Bar dataKey="amountMinor" fill="#398c77" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
