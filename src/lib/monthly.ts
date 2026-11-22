import { z } from "zod";
import { expenseSchema } from "./expenses";

export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const monthSchema = z
  .string()
  .regex(
    /^(?:19|[2-9]\d)\d{2}-(?:0[1-9]|1[0-2])$/,
    "Choose a valid month and year",
  );
export const incomeCategories = [
  "Salary",
  "Freelance",
  "Business",
  "Interest",
  "Rental income",
  "Gift",
  "Refund",
  "Other",
] as const;
export const incomeSchema = expenseSchema.extend({
  category: z.enum(incomeCategories),
  status: z.enum(["received", "expected"]),
});
export function monthLabel(month: string) {
  return `${monthNames[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}
export function shiftMonth(month: string, offset: number) {
  const total =
    Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + offset;
  const year = Math.floor(total / 12);
  return year < 1900 || year > 9999
    ? month
    : `${year}-${String((total % 12) + 1).padStart(2, "0")}`;
}
export function dateInMonth(month: string, today: string) {
  return today.startsWith(month) ? today : `${month}-01`;
}
export type MonthlyTotals = {
  incomeMinor: number;
  expectedMinor: number;
  expenseMinor: number;
  netMinor: number;
  count: number;
};
export type MonthlyRecord = {
  id: string;
  amountMinor: number;
  currency: string;
  date: string;
  category: string;
  description: string;
  status?: "received" | "expected";
};
export type MonthlySummary = {
  month: string;
  currency: string;
  totals: MonthlyTotals;
  months: (MonthlyTotals & { month: string })[];
  records: MonthlyRecord[];
  count: number;
  page: number;
  kind: "income" | "expense";
  categories: { label: string; amountMinor: number }[];
};
