import { NextResponse } from "next/server";
import { emailSchema } from "@/lib/validation";
import {
  checkOrigin,
  rateLimit,
  hashToken,
  newResetToken,
} from "@/lib/security";
import { User } from "@/models";
import { sendReset } from "@/lib/mail";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const email = emailSchema.parse((await req.json()).email);
    await rateLimit("recovery:global", 100);
    await rateLimit(`recovery:${email}`, 3);
    const token = newResetToken();
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          resetHash: hashToken(token),
          resetExpires: new Date(Date.now() + 1200000),
        },
      },
    );
    if (user) await sendReset(email, token);
  } catch {
    /* Same public response for invalid, unknown, throttled, and failed requests. */
  }
  return NextResponse.json({
    message:
      "If an account matches that email, a password reset link will be sent.",
  });
}
