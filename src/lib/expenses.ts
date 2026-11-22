import { z } from "zod";
import { CURRENCIES } from "./preferences";
export const categories = [
  "Food & dining",
  "Groceries",
  "Transport",
  "Housing",
  "Utilities",
  "Health",
  "Shopping",
  "Entertainment",
  "Education",
  "Travel",
  "Other",
] as const;
export const currencies = CURRENCIES;
export const currencySchema = z.enum(currencies);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      value >= "1900-01-01" &&
      value <= "9999-12-31"
    );
  }, "Enter a valid date");
export const expenseSchema = z
  .object({
    amount: z
      .string()
      .regex(
        /^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/,
        "Enter a positive amount with up to two decimal places",
      )
      .refine((v) => Number(v) > 0, "Amount must be greater than zero"),
    date: dateSchema,
    category: z.enum(categories),
    description: z.string().trim().min(1, "Add a description").max(200),
    currency: currencySchema,
  })
  .strict();
export function toMinorUnits(amount: string) {
  const [whole, fraction = ""] = amount.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en", {
    style: "currency",
    currency,
  }).format(minor / 100);
}
export type ExpenseRecord = {
  id: string;
  amountMinor: number;
  date: string;
  category: string;
  description: string;
  currency: string;
};
