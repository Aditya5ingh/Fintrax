import { currentUser } from "@/lib/auth";
import { Account } from "@/models";
import { DEFAULT_CURRENCY } from "@/lib/preferences";
import { ExpenseTracker } from "./expense-tracker";
import { MonthlyFinances } from "./monthly-finances";
export async function ExpenseWorkspace({
  monthly = false,
}: {
  monthly?: boolean;
}) {
  const user = await currentUser();
  if (!user) return null;
  const account = await Account.findOneAndUpdate(
    { userId: user._id },
    { $setOnInsert: { userId: user._id } },
    { upsert: true, new: true },
  );
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: account?.timezone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  const Workspace = monthly ? MonthlyFinances : ExpenseTracker;
  return (
    <Workspace
      key={account?.currency || DEFAULT_CURRENCY}
      initialCurrency={account?.currency || DEFAULT_CURRENCY}
      initialMonth={today.slice(0, 7)}
      today={today}
    />
  );
}
