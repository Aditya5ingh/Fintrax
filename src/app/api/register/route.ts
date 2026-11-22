import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { registerSchema } from "@/lib/validation";
import { checkOrigin, rateLimit } from "@/lib/security";
import { User, Account } from "@/models";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const data = registerSchema.parse(await req.json());
    await rateLimit("register:global", 100);
    await rateLimit(`register:${data.email}`, 3);
    const passwordHash = await hash(data.password, 12);
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
    });
    // Idempotent account creation also runs at dashboard access after interrupted registration.
    await Account.updateOne(
      { userId: user._id },
      { $setOnInsert: { userId: user._id } },
      { upsert: true },
    );
    return NextResponse.json(
      { message: "Account created. You can now sign in." },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to create account. Check your details or try signing in.",
      },
      { status: 400 },
    );
  }
}
