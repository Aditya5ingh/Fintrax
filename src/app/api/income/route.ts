import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { Income } from "@/models";
import { incomeSchema } from "@/lib/monthly";
import { toMinorUnits } from "@/lib/expenses";
import { checkOrigin } from "@/lib/security";
import { expenseError, serializeExpense } from "@/lib/expense-api";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { amount, ...data } = incomeSchema.parse(await req.json());
    const income = await Income.create({
      ...data,
      amountMinor: toMinorUnits(amount),
      userId: user._id,
    });
    return NextResponse.json(
      { income: { ...serializeExpense(income), status: income.status } },
      { status: 201 },
    );
  } catch (error) {
    return expenseError(error);
  }
}
