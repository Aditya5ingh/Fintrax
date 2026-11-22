import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { Account, User } from "@/models";
import { settingsSchema } from "@/lib/validation";
import { checkOrigin } from "@/lib/security";
export async function GET() {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const account = await Account.findOneAndUpdate(
    { userId: user._id },
    { $setOnInsert: { userId: user._id } },
    { upsert: true, new: true },
  );
  return NextResponse.json(
    {
      name: user.name,
      email: user.email,
      currency: account.currency,
      timezone: account.timezone,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function PATCH(req: Request) {
  try {
    checkOrigin(req);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const data = settingsSchema.parse(await req.json());
    await User.updateOne({ _id: user._id }, { $set: { name: data.name } });
    await Account.updateOne(
      { userId: user._id },
      { $set: { currency: data.currency, timezone: data.timezone } },
      { upsert: true },
    );
    return NextResponse.json({ message: "Your settings have been saved." });
  } catch {
    return NextResponse.json(
      { error: "Unable to save. Check the form and try again." },
      { status: 400 },
    );
  }
}
