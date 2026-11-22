import { NextResponse } from "next/server";
import { ZodError } from "zod";
export function expenseError(error: unknown) {
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: "Invalid JSON request" },
      { status: 400 },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  if (error instanceof Error && error.message === "Invalid request origin")
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  return NextResponse.json(
    { error: "Unable to complete the request. Please try again." },
    { status: 500 },
  );
}
export function serializeExpense(expense: {
  _id: unknown;
  amountMinor: number;
  date: string;
  category: string;
  description: string;
  currency: string;
}) {
  return {
    id: String(expense._id),
    amountMinor: expense.amountMinor,
    date: expense.date,
    category: expense.category,
    description: expense.description,
    currency: expense.currency,
  };
}
