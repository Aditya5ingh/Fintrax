import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { Account, Expense } from "@/models";
import { DEFAULT_CURRENCY } from "@/lib/preferences";
import {
  categories,
  currencySchema,
  expenseSchema,
  toMinorUnits,
} from "@/lib/expenses";
import { checkOrigin } from "@/lib/security";
import { expenseError, serializeExpense } from "@/lib/expense-api";

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const params = new URL(req.url).searchParams;
    const filters = z
      .object({
        month: z
          .string()
          .regex(/^(?:19|[2-9]\d)\d{2}-(?:0[1-9]|1[0-2])$/)
          .optional(),
        category: z.enum(categories).optional(),
        currency: currencySchema.optional(),
        page: z.coerce.number().int().min(1).max(100000).default(1),
      })
      .parse(Object.fromEntries(params));
    const account = await Account.findOne({ userId: user._id });
    const currency = filters.currency || account?.currency || DEFAULT_CURRENCY;
    const match = {
      userId: user._id,
      currency,
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.month
        ? { date: { $gte: `${filters.month}-01`, $lte: `${filters.month}-31` } }
        : {}),
    };
    const [records, count, totals, daily, byCategory] = await Promise.all([
      Expense.find(match)
        .sort({ date: -1, _id: -1 })
        .skip((filters.page - 1) * 50)
        .limit(50),
      Expense.countDocuments(match),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: "$amountMinor" } } },
      ]),
      Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $substrBytes: ["$date", 0, 7] },
            amountMinor: { $sum: "$amountMinor" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: "$category", amountMinor: { $sum: "$amountMinor" } } },
        { $sort: { amountMinor: -1 } },
      ]),
    ]);
    return NextResponse.json(
      {
        expenses: records.map(serializeExpense),
        count,
        page: filters.page,
        currency,
        totalMinor: totals[0]?.total || 0,
        trend: daily.map((v) => ({ label: v._id, amountMinor: v.amountMinor })),
        byCategory: byCategory.map((v) => ({
          label: v._id,
          amountMinor: v.amountMinor,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return expenseError(error);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const data = expenseSchema.parse(await req.json());
    const { amount, ...rest } = data;
    const expense = await Expense.create({
      ...rest,
      amountMinor: toMinorUnits(amount),
      userId: user._id,
    });
    return NextResponse.json(
      { expense: serializeExpense(expense) },
      { status: 201 },
    );
  } catch (error) {
    return expenseError(error);
  }
}
