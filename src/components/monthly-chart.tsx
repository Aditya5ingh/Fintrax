"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { monthNames, type MonthlySummary } from "@/lib/monthly";
import { formatMoney } from "@/lib/expenses";
export function MonthlyChart({
  months,
  currency,
}: {
  months: MonthlySummary["months"];
  currency: string;
}) {
  if (months.every((m) => !m.count))
    return (
      <div className="empty-state">
        <h3>A year of possibilities</h3>
        <p>Your income and spending will appear here as you add records.</p>
      </div>
    );
  return (
    <div
      className="w-full h-72"
      aria-label="Income received and expenses for each month"
    >
      <ResponsiveContainer>
        <BarChart
          data={months.map((m, i) => ({
            ...m,
            label: monthNames[i].slice(0, 3),
          }))}
          margin={{ top: 10, left: 5, right: 10 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickFormatter={(n) =>
              new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en", {
                notation: "compact",
              }).format(Number(n) / 100)
            }
          />
          <Tooltip
            formatter={(value) => formatMoney(Number(value), currency)}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
          />
          <Legend />
          <Bar
            dataKey="incomeMinor"
            name="Income received"
            fill="#398c77"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="expenseMinor"
            name="Expenses"
            fill="#7186a1"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
