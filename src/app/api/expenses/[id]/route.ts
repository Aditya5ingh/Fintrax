import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { Expense } from "@/models";
import { expenseSchema, toMinorUnits } from "@/lib/expenses";
import { checkOrigin } from "@/lib/security";
import { expenseError, serializeExpense } from "@/lib/expense-api";
type Context = { params: Promise<{ id: string }> };
async function owner(req: Request, context: Context) {
  checkOrigin(req);
  const user = await currentUser();
  if (!user)
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  const { id } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(id))
    return {
      response: NextResponse.json(
        { error: "Expense not found" },
        { status: 404 },
      ),
    };
  return { filter: { _id: id, userId: user._id } };
}
export async function PATCH(req: Request, context: Context) {
  try {
    const auth = await owner(req, context);
    if (auth.response) return auth.response;
    const { amount, ...rest } = expenseSchema.parse(await req.json());
    const expense = await Expense.findOneAndUpdate(
      auth.filter,
      { $set: { ...rest, amountMinor: toMinorUnits(amount) } },
      { new: true, runValidators: true },
    );
    if (!expense)
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return NextResponse.json({ expense: serializeExpense(expense) });
  } catch (error) {
    return expenseError(error);
  }
}
export async function DELETE(req: Request, context: Context) {
  try {
    const auth = await owner(req, context);
    if (auth.response) return auth.response;
    const expense = await Expense.findOneAndDelete(auth.filter);
    if (!expense)
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return NextResponse.json({ message: "Expense deleted." });
  } catch (error) {
    return expenseError(error);
  }
}
