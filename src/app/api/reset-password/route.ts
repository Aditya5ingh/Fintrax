import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { passwordSchema } from "@/lib/validation";
import { checkOrigin, hashToken, rateLimit } from "@/lib/security";
import { User } from "@/models";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const data = z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        password: passwordSchema,
      })
      .parse(await req.json());
    await rateLimit("reset:global", 100);
    const passwordHash = await hash(data.password, 12);
    const user = await User.findOneAndUpdate(
      { resetHash: hashToken(data.token), resetExpires: { $gt: new Date() } },
      {
        $set: { passwordHash },
        $inc: { sessionVersion: 1 },
        $unset: { resetHash: "", resetExpires: "" },
      },
    );
    if (!user) throw new Error("Invalid token");
    return NextResponse.json({
      message: "Password updated. Please sign in again.",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "This link is invalid or expired, or the password does not meet the requirements.",
      },
      { status: 400 },
    );
  }
}
