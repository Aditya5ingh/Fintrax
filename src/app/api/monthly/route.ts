import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { Account, Expense, Income } from "@/models";
import { currencySchema } from "@/lib/expenses";
import { monthSchema, type MonthlyTotals } from "@/lib/monthly";
import { DEFAULT_CURRENCY } from "@/lib/preferences";
import { expenseError, serializeExpense } from "@/lib/expense-api";
export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const filters = z
      .object({
        month: monthSchema,
        currency: currencySchema.optional(),
        kind: z.enum(["income", "expense"]).default("expense"),
        page: z.coerce.number().int().min(1).max(100000).default(1),
      })
      .parse(Object.fromEntries(new URL(req.url).searchParams));
    const account = await Account.findOne({ userId: user._id });
    const currency = filters.currency || account?.currency || DEFAULT_CURRENCY;
    const year = filters.month.slice(0, 4);
    const match = { userId: user._id, currency };
    const yearMatch = {
      ...match,
      date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
    };
    const monthMatch = {
      ...match,
      date: { $gte: `${filters.month}-01`, $lte: `${filters.month}-31` },
    };
    const model = filters.kind === "income" ? Income : Expense;
    const [expenses, incomes, records, count, categories] = await Promise.all([
      Expense.aggregate([
        { $match: yearMatch },
        {
          $group: {
            _id: { $substrBytes: ["$date", 0, 7] },
            amountMinor: { $sum: "$amountMinor" },
            count: { $sum: 1 },
          },
        },
      ]),
      Income.aggregate([
        { $match: yearMatch },
        {
          $group: {
            _id: {
              month: { $substrBytes: ["$date", 0, 7] },
              status: "$status",
            },
            amountMinor: { $sum: "$amountMinor" },
            count: { $sum: 1 },
          },
        },
      ]),
      model
        .find(monthMatch)
        .sort({ date: -1, _id: -1 })
        .skip((filters.page - 1) * 50)
        .limit(50),
      model.countDocuments(monthMatch),
      Expense.aggregate([
        { $match: monthMatch },
        { $group: { _id: "$category", amountMinor: { $sum: "$amountMinor" } } },
        { $sort: { amountMinor: -1 } },
      ]),
    ]);
    const months = Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, "0")}`;
      const totals: MonthlyTotals = {
        incomeMinor: 0,
        expectedMinor: 0,
        expenseMinor: 0,
        netMinor: 0,
        count: 0,
      };
      const expense = expenses.find((e) => e._id === month);
      if (expense) {
        totals.expenseMinor = expense.amountMinor;
        totals.count += expense.count;
      }
      for (const income of incomes.filter((i) => i._id.month === month)) {
        if (income._id.status === "received")
          totals.incomeMinor += income.amountMinor;
        else totals.expectedMinor += income.amountMinor;
        totals.count += income.count;
      }
      totals.netMinor = totals.incomeMinor - totals.expenseMinor;
      return { month, ...totals };
    });
    return NextResponse.json(
      {
        month: filters.month,
        currency,
        totals: months.find((m) => m.month === filters.month),
        months,
        records: records.map((record) => ({
          ...serializeExpense(record),
          ...(filters.kind === "income" ? { status: record.status } : {}),
        })),
        count,
        page: filters.page,
        kind: filters.kind,
        categories: categories.map((c) => ({
          label: c._id,
          amountMinor: c.amountMinor,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return expenseError(error);
  }
}
